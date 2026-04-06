import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthStorage } from "@/lib/authStorage";
import { clearAllRoleCache } from "./useUserRole";
import { clearOnboardingCache } from "./useOnboardingRequired";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True once the initial session hydration is complete — safe to run authenticated queries */
  authReady: boolean;
  authStalled: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [authStalled, setAuthStalled] = useState(false);

  const ensuredCompanyRef = useRef(false);
  const ensureCompanyPromiseRef = useRef<Promise<void> | null>(null);
  const authBootResolvedRef = useRef(false);

  const ensureUserCompanyLink = useCallback(async (retries = 2) => {
    if (ensuredCompanyRef.current) return;
    if (ensureCompanyPromiseRef.current) {
      await ensureCompanyPromiseRef.current;
      return;
    }

    const doEnsure = async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          if (!accessToken) {
            console.warn("[ensure-user-company] No access token available, skipping");
            ensuredCompanyRef.current = true;
            return;
          }

          let timeoutId: number | undefined;
          const fetchPromise = fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ensure-user-company`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            }
          ).then(async (res) => {
            const body = await res.json().catch(() => ({}));
            if (!res.ok) return { data: null, error: new Error(body?.error || `HTTP ${res.status}`) };
            return { data: body, error: null };
          });

          const { error } = await Promise.race([
            fetchPromise,
            new Promise<{ data: null; error: Error }>((resolve) => {
              timeoutId = window.setTimeout(() => {
                resolve({ data: null, error: new Error("ensure-user-company timeout") });
              }, 6000);
            }),
          ]).finally(() => {
            if (timeoutId) window.clearTimeout(timeoutId);
          });

          if (!error) {
            ensuredCompanyRef.current = true;
            return;
          }
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          }
        } catch (error) {
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          }
        }
      }
      ensuredCompanyRef.current = true;
    };

    ensureCompanyPromiseRef.current = doEnsure();
    try {
      await ensureCompanyPromiseRef.current;
    } finally {
      ensureCompanyPromiseRef.current = null;
    }
  }, []);

  const syncAuthState = useCallback((nextSession: Session | null) => {
    authBootResolvedRef.current = true;
    setAuthStalled(false);
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setLoading(false);
    // Mark auth as ready — queries can now safely run
    setAuthReady(true);

    if (nextSession?.user) {
      // Fire-and-forget: don't block auth readiness
      window.setTimeout(() => {
        void ensureUserCompanyLink();
      }, 0);
    }
  }, [ensureUserCompanyLink]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("Sign out error:", error);
    }

    clearAuthStorage();
    clearAllRoleCache();
    clearOnboardingCache();
    ensuredCompanyRef.current = false;
    ensureCompanyPromiseRef.current = null;
    syncAuthState(null);
  }, [syncAuthState]);

  useEffect(() => {
    const stallTimer = window.setTimeout(() => {
      if (!authBootResolvedRef.current) {
        console.warn("[Auth] Initialization stalled; releasing loading state");
        setAuthStalled(true);
        setLoading(false);
        setAuthReady(true); // Even on stall, mark ready so hooks don't hang forever
      }
    }, 8000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // IMPORTANT: keep this callback synchronous to avoid auth deadlocks.

      if (event === "TOKEN_REFRESHED" && !session) {
        console.warn("[Auth] Token refresh resulted in empty session; clearing auth storage and signing out");
        authBootResolvedRef.current = true;
        setAuthStalled(false);
        setLoading(false);
        setAuthReady(true);
        setTimeout(() => {
          clearAuthStorage();
          void handleSignOut();
        }, 0);
        return;
      }

      if (event === "SIGNED_OUT") {
        ensuredCompanyRef.current = false;
        ensureCompanyPromiseRef.current = null;
        syncAuthState(null);
        return;
      }

      syncAuthState(session);
    });

    // Initial session check with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Session retrieval error:", error.message);
        if (error.message?.toLowerCase().includes("refresh token") || error.message?.toLowerCase().includes("refresh_token")) {
          authBootResolvedRef.current = true;
          setTimeout(() => {
            clearAuthStorage();
            void handleSignOut();
          }, 0);
          return;
        }
      }

      syncAuthState(session);
    });

    return () => {
      window.clearTimeout(stallTimer);
      subscription.unsubscribe();
    };
  }, [handleSignOut, syncAuthState]);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('refresh_token') || msg.includes('invalid') || msg.includes('not_found')) {
          console.warn('[Auth] Refresh token invalid, signing out');
          await handleSignOut();
        } else {
          console.warn('[Auth] Transient refresh error, will retry:', error.message);
        }
        return;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        ensureUserCompanyLink();
      }
    } catch (error) {
      console.warn("[Auth] Session refresh exception (will retry):", error);
    }
  }, [handleSignOut, ensureUserCompanyLink]);

  // Auto-refresh interval (every 10 min) + visibility change listener
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      if (session) {
        console.debug('[Auth] Periodic session refresh');
        void refreshSession();
      }
    }, 10 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        const now = Date.now();
        if (now - lastRefreshRef.current > 30_000) {
          lastRefreshRef.current = now;
          console.debug('[Auth] Visibility refresh');
          void refreshSession();
        }
      }
    };

    const handleFocus = () => {
      if (session) {
        const now = Date.now();
        if (now - lastRefreshRef.current > 30_000) {
          lastRefreshRef.current = now;
          console.debug('[Auth] Focus refresh');
          void refreshSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session, refreshSession]);

  return (
    <AuthContext.Provider value={{ user, session, loading, authReady, authStalled, signOut: handleSignOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

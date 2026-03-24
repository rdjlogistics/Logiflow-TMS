import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthStorage } from "@/lib/authStorage";
import { clearAllRoleCache } from "./useUserRole";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authStalled: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth loading timeout - prevents infinite loading states
const AUTH_LOADING_TIMEOUT_MS = 5000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authStalled, setAuthStalled] = useState(false);

  const ensuredCompanyRef = useRef(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout helper
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Set loading with timeout protection
  const setLoadingWithTimeout = useCallback((isLoading: boolean) => {
    clearLoadingTimeout();
    
    if (isLoading) {
      // Start timeout - if loading doesn't complete in time, mark as stalled
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('[Auth] Loading timeout exceeded, marking as stalled');
        setLoading(false);
        setAuthStalled(true);
      }, AUTH_LOADING_TIMEOUT_MS);
    }
    
    setLoading(isLoading);
    if (!isLoading) {
      setAuthStalled(false);
    }
  }, [clearLoadingTimeout]);

  // Promise-based deduplication: if a call is already in-flight, reuse it
  const ensureCompanyPromiseRef = useRef<Promise<void> | null>(null);

  const ensureUserCompanyLink = useCallback(async (retries = 2) => {
    if (ensuredCompanyRef.current) return;

    // If there's already a call in-flight, wait for it instead of starting a new one
    if (ensureCompanyPromiseRef.current) {
      await ensureCompanyPromiseRef.current;
      return;
    }

    const doEnsure = async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const { error } = await supabase.functions.invoke("ensure-user-company");
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
      // Mark as attempted even on failure to prevent infinite loops
      ensuredCompanyRef.current = true;
    };

    ensureCompanyPromiseRef.current = doEnsure();
    try {
      await ensureCompanyPromiseRef.current;
    } finally {
      ensureCompanyPromiseRef.current = null;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    // Always clear local auth storage as well; if the network signOut fails due to
    // a corrupted token, the UI should still reliably log the user out.
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("Sign out error:", error);
    }

    clearAuthStorage();
    clearAllRoleCache();
    ensuredCompanyRef.current = false;
    setSession(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // IMPORTANT: keep this callback synchronous to avoid auth deadlocks.

      // If refresh failed and we lost session, clear corrupted tokens and sign out cleanly (deferred).
      // Note: supabase-js does not expose a TOKEN_REFRESH_FAILED event in its public types,
      // so we handle the "lost session" case defensively here.
      if (event === "TOKEN_REFRESHED" && !session) {
        console.warn("[Auth] Token refresh resulted in empty session; clearing auth storage and signing out");
        setTimeout(() => {
          clearAuthStorage();
          void handleSignOut();
        }, 0);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_OUT") {
        ensuredCompanyRef.current = false;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer any backend calls.
        setTimeout(() => {
          void ensureUserCompanyLink();
        }, 0);
      }

      setLoading(false);
    });

    // Initial session check with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Session retrieval error:", error.message);
        // Clear potentially corrupted session (e.g. refresh_token_not_found)
        if (error.message?.toLowerCase().includes("refresh token") || error.message?.toLowerCase().includes("refresh_token")) {
          setTimeout(() => {
            clearAuthStorage();
            void handleSignOut();
          }, 0);
          return;
        }
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          void ensureUserCompanyLink();
        }, 0);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [ensureUserCompanyLink, handleSignOut]);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        const msg = error.message?.toLowerCase() || '';
        // Only sign out on definitive token errors
        if (msg.includes('refresh_token') || msg.includes('invalid') || msg.includes('not_found')) {
          console.warn('[Auth] Refresh token invalid, signing out');
          await handleSignOut();
        } else {
          // Network or transient error — don't sign out, retry next cycle
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

    // Periodic refresh every 10 minutes
    const interval = setInterval(() => {
      if (session) {
        console.debug('[Auth] Periodic session refresh');
        void refreshSession();
      }
    }, 10 * 60 * 1000);

    // Visibility change: refresh when app returns to foreground (debounced 30s)
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

    // Focus event: also refresh on window focus (e.g. switching apps on mobile)
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearLoadingTimeout();
  }, [clearLoadingTimeout]);

  return (
    <AuthContext.Provider value={{ user, session, loading, authStalled, signOut: handleSignOut, refreshSession }}>
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

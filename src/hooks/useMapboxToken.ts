import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "mapbox_token_cache";

// Singleton cache to prevent multiple API calls across components
let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

async function fetchMapboxToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-mapbox-token");
      if (error) throw error;
      if (data?.token) {
        cachedToken = data.token;
        try { localStorage.setItem(LS_KEY, cachedToken); } catch {}
        return cachedToken;
      }
      throw new Error("No token received");
    } catch (err) {
      console.error("Error fetching Mapbox token:", err);
      tokenPromise = null;

      // Fallback to localStorage cache
      try {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) {
          cachedToken = stored;
          return cachedToken;
        }
      } catch {}

      throw err;
    }
  })();

  return tokenPromise;
}

export const useMapboxToken = () => {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [loading, setLoading] = useState(!cachedToken);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refetch = () => {
    clearMapboxTokenCache();
    setLoading(true);
    setError(null);

    fetchMapboxToken()
      .then((fetchedToken) => {
        if (mounted.current) {
          setToken(fetchedToken);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (mounted.current) {
          setError(err.message || "Token ophalen mislukt");
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    mounted.current = true;

    if (cachedToken) {
      setToken(cachedToken);
      setLoading(false);
      return;
    }

    let didRetryAfterAuth = false;

    const tryFetch = () => {
      fetchMapboxToken()
        .then((fetchedToken) => {
          if (mounted.current) {
            setToken(fetchedToken);
            setLoading(false);
          }
        })
        .catch(async (err: any) => {
          const status = err?.status ?? err?.context?.status;
          if (!didRetryAfterAuth && status === 401) {
            didRetryAfterAuth = true;
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              tryFetch();
              return;
            }
            return;
          }

          if (mounted.current) {
            setError(err.message || "Token ophalen mislukt");
            setLoading(false);
          }
        });
    };

    tryFetch();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted.current) return;
      if (!didRetryAfterAuth) return;
      if (cachedToken) return;
      if (token) return;
      if (!session) return;

      setLoading(true);
      tryFetch();
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { token, loading, error, refetch };
};

export const clearMapboxTokenCache = () => {
  cachedToken = null;
  tokenPromise = null;
};

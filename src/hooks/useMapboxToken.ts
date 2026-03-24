import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Singleton cache to prevent multiple API calls across components
let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

async function fetchMapboxToken(): Promise<string | null> {
  // Return cached token if available
  if (cachedToken) return cachedToken;
  
  // If already fetching, return existing promise
  if (tokenPromise) return tokenPromise;
  
  tokenPromise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-mapbox-token");
      
      if (error) throw error;
      if (data?.token) {
        cachedToken = data.token;
        return cachedToken;
      }
      throw new Error("No token received");
    } catch (err) {
      console.error("Error fetching Mapbox token:", err);
      tokenPromise = null; // Reset so it can retry
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

    // If already cached, no need to fetch
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
          // If auth isn't ready yet, the backend function may return 401.
          // In that case: wait for auth session and retry once.
          const status = err?.status ?? err?.context?.status;
          if (!didRetryAfterAuth && status === 401) {
            didRetryAfterAuth = true;
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              // session is available already; retry immediately
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

    // Start fetch
    tryFetch();

    // Retry once when auth becomes available (only needed if we got a 401 before)
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

// Export for manual cache clearing if needed
export const clearMapboxTokenCache = () => {
  cachedToken = null;
  tokenPromise = null;
};

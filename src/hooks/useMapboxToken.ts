import { useCallback, useEffect, useRef, useState } from "react";
import { backendAnonKey, edgeFunctionUrl } from "@/lib/backendConfig";

const LS_KEY = "mapbox_token_cache";

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

type MapboxTokenResponse = {
  token?: string;
  error?: string;
};

const readStoredToken = () => {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      cachedToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage access errors.
  }

  return null;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Token ophalen mislukt";

async function fetchMapboxToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    try {
      const response = await fetch(edgeFunctionUrl("get-mapbox-token"), {
        method: "GET",
        headers: {
          apikey: backendAnonKey,
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json().catch(() => ({}))) as MapboxTokenResponse;

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (!data.token) {
        throw new Error("No token received");
      }

      cachedToken = data.token;
      try {
        localStorage.setItem(LS_KEY, cachedToken);
      } catch {
        // Ignore storage access errors.
      }

      return cachedToken;
    } catch (error) {
      console.error("Error fetching Mapbox token:", error);
      tokenPromise = null;

      const storedToken = readStoredToken();
      if (storedToken) {
        return storedToken;
      }

      throw error instanceof Error ? error : new Error("Token ophalen mislukt");
    }
  })();

  return tokenPromise;
}

export const useMapboxToken = () => {
  const initialTokenRef = useRef<string | null>(cachedToken ?? readStoredToken());
  const mounted = useRef(true);
  const [token, setToken] = useState<string | null>(initialTokenRef.current);
  const [loading, setLoading] = useState(!initialTokenRef.current);
  const [error, setError] = useState<string | null>(null);

  const runFetch = useCallback(() => {
    setLoading(true);
    setError(null);

    fetchMapboxToken()
      .then((fetchedToken) => {
        if (!mounted.current) return;
        setToken(fetchedToken);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!mounted.current) return;
        setError(getErrorMessage(fetchError));
        setLoading(false);
      });
  }, []);

  const refetch = useCallback(() => {
    clearMapboxTokenCache();
    setToken(null);
    runFetch();
  }, [runFetch]);

  useEffect(() => {
    mounted.current = true;

    if (cachedToken ?? readStoredToken()) {
      setToken(cachedToken);
      setLoading(false);
      setError(null);
      return () => {
        mounted.current = false;
      };
    }

    runFetch();

    return () => {
      mounted.current = false;
    };
  }, [runFetch]);

  return { token, loading, error, refetch };
};

export const clearMapboxTokenCache = () => {
  cachedToken = null;
  tokenPromise = null;

  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // Ignore storage access errors.
  }
};

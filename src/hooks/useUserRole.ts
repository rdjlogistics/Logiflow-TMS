import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = "admin" | "medewerker" | "chauffeur" | "klant";

const ROLE_PRIORITY: AppRole[] = ["admin", "medewerker", "chauffeur", "klant"];

// Cache for role data to prevent redundant API calls
const roleCache = new Map<string, { role: AppRole | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function pickBestRole(data: { role: string }[]): AppRole | null {
  const roles = (data || []).map(r => r.role as AppRole);
  return ROLE_PRIORITY.find(r => roles.includes(r)) || null;
}

async function fetchRoleFromDB(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return pickBestRole(data || []);
}

export const useUserRole = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1500; // ms

  const doFetch = useCallback(async (currentRequestId: number) => {
    if (!userId) return;

    try {
      const bestRole = await fetchRoleFromDB(userId);

      if (requestIdRef.current !== currentRequestId) return; // stale

      setRole(bestRole);
      setError(null);
      roleCache.set(userId, { role: bestRole, timestamp: Date.now() });
      retryCountRef.current = 0;
      setLoading(false);
    } catch (fetchError) {
      if (requestIdRef.current !== currentRequestId) return; // stale

      console.error("[useUserRole] Error fetching role:", fetchError);

      // Retry on failure (network issues, etc.)
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        console.warn(`[useUserRole] Retry ${retryCountRef.current}/${MAX_RETRIES} in ${RETRY_DELAY}ms`);
        setTimeout(() => {
          if (requestIdRef.current === currentRequestId) {
            doFetch(currentRequestId);
          }
        }, RETRY_DELAY);
      } else {
        // All retries exhausted — set error but keep any cached role
        const cached = roleCache.get(userId);
        if (cached?.role) {
          setRole(cached.role); // Use stale cache rather than null
        }
        setError(fetchError instanceof Error ? fetchError : new Error("Failed to fetch role"));
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const cached = roleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setRole(cached.role);
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    retryCountRef.current = 0;
    setLoading(true);
    setError(null);

    // Safety timeout — if after 8s we still have nothing, stop loading
    // but keep retrying in background
    const timeoutId = setTimeout(() => {
      if (requestIdRef.current === currentRequestId) {
        console.warn("[useUserRole] Role fetch taking long — stopping loading spinner");
        setLoading(false);
      }
    }, 8000);

    doFetch(currentRequestId);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [userId, doFetch]);

  const isAdmin = useMemo(() => role === "admin", [role]);
  const isMedewerker = useMemo(() => role === "medewerker", [role]);
  const isChauffeur = useMemo(() => role === "chauffeur", [role]);
  const isKlant = useMemo(() => role === "klant", [role]);
  const canAccessChatGPT = useMemo(() => isAdmin || isMedewerker, [isAdmin, isMedewerker]);
  const canAccessPlanning = useMemo(() => isAdmin || isMedewerker, [isAdmin, isMedewerker]);
  const canAccessFinance = useMemo(() => isAdmin, [isAdmin]);

  const clearCache = useCallback(() => {
    if (userId) {
      roleCache.delete(userId);
    }
  }, [userId]);

  const refetch = useCallback(async () => {
    if (!userId) return;

    roleCache.delete(userId);
    const currentRequestId = ++requestIdRef.current;
    retryCountRef.current = 0;
    setLoading(true);
    setError(null);
    await doFetch(currentRequestId);
  }, [userId, doFetch]);

  return {
    role,
    loading,
    error,
    isAdmin,
    isMedewerker,
    isChauffeur,
    isKlant,
    canAccessChatGPT,
    canAccessPlanning,
    canAccessFinance,
    refetch,
    clearCache,
  };
};

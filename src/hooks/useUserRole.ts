import { useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = "admin" | "medewerker" | "chauffeur" | "klant";

const ROLE_PRIORITY: AppRole[] = ["admin", "medewerker", "chauffeur", "klant"];

function pickBestRole(data: { role: string }[]): AppRole | null {
  const roles = (data || []).map(r => r.role as AppRole);
  return ROLE_PRIORITY.find(r => roles.includes(r)) || null;
}

async function fetchRoleFromDB(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  return pickBestRole(data || []);
}

/** Clear the entire role cache — call on signOut to prevent cross-user leaks. */
export function clearAllRoleCache() {
  window.dispatchEvent(new CustomEvent("clear-role-cache"));
}

export const useUserRole = () => {
  const { user, authReady } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Only query when auth is fully ready AND we have a user
  const canQuery = !!userId && authReady;

  const { data: role = null, isLoading, error: queryError } = useQuery<AppRole | null>({
    queryKey: ["user-role", userId],
    queryFn: () => fetchRoleFromDB(userId!),
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 1500,
  });

  // Loading is true when we have a userId, auth is ready, and data is still fetching
  const loading = canQuery && isLoading;
  const error = queryError instanceof Error ? queryError : queryError ? new Error("Failed to fetch role") : null;

  const isAdmin = useMemo(() => role === "admin", [role]);
  const isMedewerker = useMemo(() => role === "medewerker", [role]);
  const isChauffeur = useMemo(() => role === "chauffeur", [role]);
  const isKlant = useMemo(() => role === "klant", [role]);
  const canAccessChatGPT = useMemo(() => isAdmin || isMedewerker, [isAdmin, isMedewerker]);
  const canAccessPlanning = useMemo(() => isAdmin || isMedewerker, [isAdmin, isMedewerker]);
  const canAccessFinance = useMemo(() => isAdmin, [isAdmin]);

  const clearCache = useCallback(() => {
    if (userId) {
      queryClient.removeQueries({ queryKey: ["user-role", userId] });
    }
  }, [userId, queryClient]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: ["user-role", userId] });
  }, [userId, queryClient]);

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

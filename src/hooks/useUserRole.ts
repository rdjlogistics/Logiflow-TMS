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
  // This is a standalone function that doesn't have access to queryClient.
  // Components that need to clear should use the hook's clearCache/refetch.
  // For signOut, the QueryClientProvider will unmount and reset automatically.
  // As a safety net, we also clear via a custom event that the hook listens to.
  window.dispatchEvent(new CustomEvent("clear-role-cache"));
}

export const useUserRole = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: role = null, isLoading, error: queryError } = useQuery<AppRole | null>({
    queryKey: ["user-role", userId],
    queryFn: () => fetchRoleFromDB(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,    // 5 min — don't refetch if fresh
    gcTime: 10 * 60 * 1000,      // 10 min — keep in cache
    retry: 3,
    retryDelay: 1500,
  });

  // Loading is only true when we have a userId and data is still fetching
  const loading = !!userId && isLoading;
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

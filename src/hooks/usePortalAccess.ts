import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type PortalRole = "klant" | "admin" | "medewerker";

const PORTAL_ROLES: PortalRole[] = ["klant", "admin", "medewerker"];

interface PortalAccessResult {
  /** True once we definitively know the user has portal access */
  hasPortalAccess: boolean;
  /** True if user has the klant role (needed for onboarding check) */
  hasKlantRole: boolean;
  /** True if klant user still needs to complete onboarding */
  needsOnboarding: boolean;
  /** True while checking access */
  loading: boolean;
  /** True if there was a query error (treated as "try again", not "no access") */
  error: boolean;
  /** Refetch portal access */
  refetch: () => void;
}

interface PortalAccessData {
  roles: string[];
  hasOnboarding: boolean;
}

async function fetchPortalAccess(userId: string): Promise<PortalAccessData> {
  // Fetch all roles for this user
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (roleError) throw roleError;

  const roles = (roleData || []).map(r => r.role);
  const portalRoles = roles.filter(r => PORTAL_ROLES.includes(r as PortalRole));

  // Only check onboarding for klant users
  let hasOnboarding = true; // assume done for non-klant
  if (portalRoles.includes("klant")) {
    const { data: prefs } = await supabase
      .from("portal_notification_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    hasOnboarding = !!prefs;
  }

  return { roles: portalRoles, hasOnboarding };
}

/**
 * Central hook for portal access — single source of truth.
 * Used by PortalGuard and PortalLogin.
 */
export const usePortalAccess = (): PortalAccessResult => {
  const { user, authReady } = useAuth();
  const canQuery = !!user && authReady;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["portal-access", user?.id],
    queryFn: () => fetchPortalAccess(user!.id),
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 1500,
  });

  const roles = data?.roles ?? [];
  const hasPortalAccess = roles.length > 0;
  const hasKlantRole = roles.includes("klant");
  const needsOnboarding = hasKlantRole && !(data?.hasOnboarding ?? true);

  return {
    hasPortalAccess: isError ? false : hasPortalAccess,
    hasKlantRole,
    needsOnboarding: isError ? false : needsOnboarding,
    loading: canQuery && isLoading,
    error: isError,
    refetch,
  };
};

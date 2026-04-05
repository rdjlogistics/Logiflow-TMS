import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const MAX_POLL_MS = 10_000;
const POLL_INTERVAL_MS = 600;
const LS_PREFIX = 'onboarding-done-';

function getLocalFlag(userId: string): boolean {
  try { return localStorage.getItem(`${LS_PREFIX}${userId}`) === 'true'; } catch { return false; }
}
function setLocalFlag(userId: string) {
  try { localStorage.setItem(`${LS_PREFIX}${userId}`, 'true'); } catch { /* noop */ }
}

/** Call on signOut to clear cached onboarding state */
export function clearOnboardingCache() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch { /* noop */ }
}

async function waitForCompanyLink(userId: string): Promise<string | null> {
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();
    if (!error && data?.company_id) return data.company_id;
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  return null;
}

export const useOnboardingRequired = () => {
  const { user, authReady } = useAuth();

  const query = useQuery({
    queryKey: ['onboarding-required', user?.id],
    queryFn: async () => {
      // Fast path: localStorage says done → skip all DB work
      if (getLocalFlag(user!.id)) return false;

      const companyId = await waitForCompanyLink(user!.id);
      if (!companyId) return true;

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('onboarding_completed_at')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding status:', error);
        // Fail-safe: never redirect on transient errors
        return false;
      }

      if (!data) return true;

      const completed = !!(data as Record<string, unknown>).onboarding_completed_at;
      if (completed) setLocalFlag(user!.id);
      return !completed;
    },
    // Only run when auth is fully ready
    enabled: !!user && authReady,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 2000,
  });

  return {
    // If query errored out, never redirect (false)
    needsOnboarding: query.isError ? false : (query.data ?? false),
    loading: query.isLoading,
    error: query.isError,
    refetch: query.refetch,
  };
};

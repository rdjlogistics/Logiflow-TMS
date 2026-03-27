import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const MAX_POLL_MS = 5000;
const POLL_INTERVAL_MS = 500;

/**
 * Polls for user_companies record (max 5s) to handle the race condition
 * where ensure-user-company hasn't finished yet.
 */
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

    // Wait before next poll
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  return null;
}

/**
 * Checks if the current user needs to complete the onboarding wizard.
 * Returns true if onboarding_completed_at is null in tenant_settings.
 * Handles the race condition with ensure-user-company by polling.
 */
export const useOnboardingRequired = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['onboarding-required', user?.id],
    queryFn: async () => {
      // Poll for the company link (handles race condition with ensure-user-company)
      const companyId = await waitForCompanyLink(user!.id);

      // No company link after polling → needs onboarding
      if (!companyId) return true;

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('onboarding_completed_at')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding status:', error);
        return false;
      }

      // No row → needs onboarding
      if (!data) return true;

      // Row exists but onboarding not completed
      return !(data as Record<string, unknown>).onboarding_completed_at;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  return {
    needsOnboarding: query.data ?? false,
    loading: query.isLoading,
    refetch: query.refetch,
  };
};

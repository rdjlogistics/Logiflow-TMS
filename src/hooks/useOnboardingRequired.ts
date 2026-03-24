import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Checks if the current user needs to complete the onboarding wizard.
 * Returns true if onboarding_completed_at is null in tenant_settings.
 */
export const useOnboardingRequired = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['onboarding-required', user?.id],
    queryFn: async () => {
      // First get the user's primary company
      const { data: companyLink, error: companyErr } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user!.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (companyErr) {
        console.error('Error fetching user company:', companyErr);
        return false;
      }

      // No company link yet → needs onboarding (ensure-user-company hasn't run yet)
      if (!companyLink?.company_id) return true;

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('onboarding_completed_at')
        .eq('company_id', companyLink.company_id)
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

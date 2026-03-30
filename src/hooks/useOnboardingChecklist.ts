import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useState, useCallback } from 'react';

export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
}

const DISMISS_KEY = 'onboarding-checklist-minimized';

export const useOnboardingChecklist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isMinimized, setIsMinimized] = useState(() =>
    localStorage.getItem(DISMISS_KEY) === 'true'
  );

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => {
      localStorage.setItem(DISMISS_KEY, String(!prev));
      return !prev;
    });
  }, []);

  const query = useQuery({
    queryKey: ['onboarding-checklist', user?.id],
    queryFn: async () => {
      // 1. Check if onboarding already completed
      const { data: uc } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user!.id)
        .eq('is_primary', true)
        .maybeSingle();

      const companyId = uc?.company_id;
      if (!companyId) return null;

      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('onboarding_completed_at')
        .eq('company_id', companyId)
        .maybeSingle();

      if ((settings as Record<string, unknown>)?.onboarding_completed_at) {
        return { alreadyCompleted: true, steps: [], companyId };
      }

      // 2. Parallel data checks
      const [companyRes, vehiclesRes, driversRes, customersRes, tripsRes] = await Promise.all([
        supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('company_id', companyId).is('deleted_at', null),
        supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('tenant_id', companyId).is('deleted_at', null),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', companyId).is('deleted_at', null),
        supabase.from('trips').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      ]);

      const companyName = companyRes.data?.name || '';
      const hasCompanyName = !!companyName && companyName !== 'Mijn Bedrijf' && companyName.length > 2;

      const steps: OnboardingStep[] = [
        { key: 'account', label: 'Account aangemaakt', description: 'Je account is actief', href: '#', completed: true },
        { key: 'company', label: 'Bedrijfsgegevens invullen', description: 'Vul je bedrijfsnaam en adres in', href: '/settings/company', completed: hasCompanyName },
        { key: 'vehicle', label: 'Eerste voertuig toevoegen', description: 'Voeg een voertuig toe aan je vloot', href: '/fleet', completed: (vehiclesRes.count ?? 0) > 0 },
        { key: 'driver', label: 'Eerste chauffeur uitnodigen', description: 'Nodig een chauffeur uit', href: '/drivers', completed: (driversRes.count ?? 0) > 0 },
        { key: 'customer', label: 'Eerste klant toevoegen', description: 'Voeg je eerste klant toe', href: '/customers', completed: (customersRes.count ?? 0) > 0 },
        { key: 'order', label: 'Eerste order aanmaken', description: 'Maak je eerste transportorder', href: '/orders/edit', completed: (tripsRes.count ?? 0) > 0 },
      ];

      return { alreadyCompleted: false, steps, companyId };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const steps = query.data?.steps ?? [];
  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;
  const alreadyCompleted = query.data?.alreadyCompleted ?? false;

  const markComplete = useCallback(async () => {
    if (!query.data?.companyId) return;
    await supabase
      .from('tenant_settings')
      .update({ onboarding_completed_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('company_id', query.data.companyId);
    queryClient.invalidateQueries({ queryKey: ['onboarding-checklist'] });
    queryClient.invalidateQueries({ queryKey: ['onboarding-required'] });
  }, [query.data?.companyId, queryClient]);

  return {
    steps,
    completedCount,
    totalCount,
    allComplete,
    alreadyCompleted,
    isMinimized,
    toggleMinimize,
    markComplete,
    loading: query.isLoading,
    show: !query.isLoading && !alreadyCompleted && totalCount > 0,
  };
};

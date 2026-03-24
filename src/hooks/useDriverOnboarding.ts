import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

export interface DriverOnboarding {
  id: string;
  tenant_id: string;
  driver_id: string;
  status: 'in_progress' | 'pending_review' | 'approved' | 'rejected';
  step_personal_info: boolean;
  step_documents_uploaded: boolean;
  step_bank_details: boolean;
  step_vehicle_assigned: boolean;
  step_app_installed: boolean;
  step_training_completed: boolean;
  step_contract_signed: boolean;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ONBOARDING_STEPS = [
  { key: 'step_personal_info', label: 'Persoonlijke gegevens', description: 'Naam, adres, contactgegevens' },
  { key: 'step_documents_uploaded', label: 'Documenten geüpload', description: 'Rijbewijs, ID, certificaten' },
  { key: 'step_bank_details', label: 'Bankgegevens', description: 'IBAN voor uitbetalingen' },
  { key: 'step_vehicle_assigned', label: 'Voertuig toegewezen', description: 'Gekoppeld aan een voertuig' },
  { key: 'step_app_installed', label: 'App geïnstalleerd', description: 'Driver app geactiveerd' },
  { key: 'step_training_completed', label: 'Training voltooid', description: 'Introductie afgerond' },
  { key: 'step_contract_signed', label: 'Contract ondertekend', description: 'Arbeidsovereenkomst getekend' },
] as const;

export function useDriverOnboarding(driverId?: string) {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: onboardings = [], isLoading } = useQuery({
    queryKey: ['driver-onboarding', company?.id, driverId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('driver_onboarding')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });

      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DriverOnboarding[];
    },
    enabled: !!company?.id,
  });

  const startOnboarding = useMutation({
    mutationFn: async (driverId: string) => {
      if (!company?.id) throw new Error('No company');
      
      const { data, error } = await supabase
        .from('driver_onboarding')
        .insert({
          tenant_id: company.id,
          driver_id: driverId,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-onboarding'] });
      toast({ title: 'Onboarding gestart', description: 'De chauffeur onboarding is gestart.' });
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Kon onboarding niet starten.', variant: 'destructive' });
    },
  });

  const updateStep = useMutation({
    mutationFn: async ({ 
      onboardingId, 
      step, 
      completed 
    }: { 
      onboardingId: string; 
      step: keyof DriverOnboarding; 
      completed: boolean;
    }) => {
      const { data, error } = await supabase
        .from('driver_onboarding')
        .update({ [step]: completed })
        .eq('id', onboardingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-onboarding'] });
    },
  });

  const submitForReview = useMutation({
    mutationFn: async (onboardingId: string) => {
      const { data, error } = await supabase
        .from('driver_onboarding')
        .update({ status: 'pending_review' })
        .eq('id', onboardingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-onboarding'] });
      toast({ title: 'Ingediend voor review', description: 'De onboarding is ingediend ter goedkeuring.' });
    },
  });

  const approveOnboarding = useMutation({
    mutationFn: async ({ onboardingId, notes }: { onboardingId: string; notes?: string }) => {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('driver_onboarding')
        .update({ 
          status: 'approved',
          reviewed_by: user.data.user?.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', onboardingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-onboarding'] });
      toast({ title: 'Goedgekeurd', description: 'De chauffeur onboarding is goedgekeurd.' });
    },
  });

  const rejectOnboarding = useMutation({
    mutationFn: async ({ onboardingId, notes }: { onboardingId: string; notes: string }) => {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('driver_onboarding')
        .update({ 
          status: 'rejected',
          reviewed_by: user.data.user?.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', onboardingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-onboarding'] });
      toast({ title: 'Afgekeurd', description: 'De onboarding is afgekeurd.' });
    },
  });

  const getProgress = (onboarding: DriverOnboarding): number => {
    const steps = ONBOARDING_STEPS.map(s => s.key);
    const completed = steps.filter(step => onboarding[step as keyof DriverOnboarding] === true).length;
    return Math.round((completed / steps.length) * 100);
  };

  const getIncompleteSteps = (onboarding: DriverOnboarding): typeof ONBOARDING_STEPS[number][] => {
    return ONBOARDING_STEPS.filter(step => !onboarding[step.key as keyof DriverOnboarding]);
  };

  return {
    onboardings,
    isLoading,
    startOnboarding,
    updateStep,
    submitForReview,
    approveOnboarding,
    rejectOnboarding,
    getProgress,
    getIncompleteSteps,
    ONBOARDING_STEPS,
  };
}

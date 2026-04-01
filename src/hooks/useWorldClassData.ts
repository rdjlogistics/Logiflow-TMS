import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

// Types for World-Class Layer
export interface DomainEvent {
  id: string;
  tenant_id: string;
  stream_type: string;
  stream_id: string;
  event_type: string;
  event_version: number;
  payload_json: Record<string, any>;
  created_at: string;
  created_by_user_id?: string;
  idempotency_key?: string;
  correlation_id?: string;
}

export interface Hold {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  scope: string;
  reason_code: string;
  reason_description?: string;
  severity: string;
  status: string;
  target_resolution_date?: string;
  owner_user_id?: string;
  escalated_at?: string;
  escalation_level: number;
  created_at: string;
  created_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  requires_two_person_approval: boolean;
  approved_by?: string;
  approved_at?: string;
}

export interface DuplicateCandidate {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id_a: string;
  entity_id_b: string;
  confidence: number;
  match_reasons?: Record<string, any>;
  status: string;
  merged_to_id?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface AuthorityRule {
  id: string;
  tenant_id: string;
  role: string;
  action_type: string;
  max_amount?: number;
  requires_escalation_to_role?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobRun {
  id: string;
  tenant_id?: string;
  job_type: string;
  job_name?: string;
  status: string;
  started_at: string;
  finished_at?: string;
  processed_count: number;
  success_count: number;
  error_count: number;
  details_json?: Record<string, any>;
  error_message?: string;
  correlation_id?: string;
  triggered_by?: string;
}

export interface IntegrationFailure {
  id: string;
  tenant_id?: string;
  source: string;
  source_id?: string;
  payload_summary?: Record<string, any>;
  error_type?: string;
  error_message?: string;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  last_attempt_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  created_at: string;
}

export interface SafetyProfile {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  min_cash_buffer: number;
  require_no_holds: boolean;
  require_pod_if_configured: boolean;
  require_contract_for_payouts: boolean;
  confidence_threshold_bank: number;
  confidence_threshold_scan: number;
  two_person_approval_threshold?: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRunItem {
  id: string;
  automation_run_id: string;
  entity_type: string;
  entity_id: string;
  result: string;
  reason?: string;
  diff_preview_json?: Record<string, any>;
  impact_amount?: number;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  tenant_id?: string;
  feature_key: string;
  is_enabled: boolean;
  config_json?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Hooks
export const useHolds = (status?: string) => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['holds', company?.id, status],
    queryFn: async () => {
      if (!company?.id) return [] as Hold[];
      let query = (supabase as any)
        .from('holds')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Hold[];
    },
    enabled: !!company?.id
  });
};

export const useDuplicateCandidates = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['duplicate-candidates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as DuplicateCandidate[];
      const { data, error } = await (supabase as any)
        .from('duplicate_candidates')
        .select('*')
        .eq('tenant_id', company.id)
        .eq('status', 'pending')
        .order('confidence', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as DuplicateCandidate[];
    },
    enabled: !!company?.id
  });
};

export const useAuthorityRules = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['authority-rules', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as AuthorityRule[];
      const { data, error } = await (supabase as any)
        .from('authority_rules')
        .select('*')
        .eq('tenant_id', company.id)
        .order('role')
        .limit(100);
      if (error) throw error;
      return (data || []) as AuthorityRule[];
    },
    enabled: !!company?.id
  });
};

export const useJobRuns = (jobType?: string, limit = 50) => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['job-runs', company?.id, jobType, limit],
    queryFn: async () => {
      if (!company?.id) return [] as JobRun[];
      let query = (supabase as any)
        .from('job_runs')
        .select('*')
        .or(`tenant_id.eq.${company.id},tenant_id.is.null`)
        .order('started_at', { ascending: false })
        .limit(limit);
      
      if (jobType) {
        query = query.eq('job_type', jobType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as JobRun[];
    },
    enabled: !!company?.id
  });
};

export const useIntegrationFailures = (status?: string) => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['integration-failures', company?.id, status],
    queryFn: async () => {
      if (!company?.id) return [] as IntegrationFailure[];
      let query = (supabase as any)
        .from('integration_failures')
        .select('*')
        .or(`tenant_id.eq.${company.id},tenant_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as IntegrationFailure[];
    },
    enabled: !!company?.id
  });
};

export const useSafetyProfiles = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['safety-profiles', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as SafetyProfile[];
      const { data, error } = await (supabase as any)
        .from('safety_profiles')
        .select('*')
        .eq('tenant_id', company.id)
        .order('name')
        .limit(50);
      if (error) throw error;
      return (data || []) as SafetyProfile[];
    },
    enabled: !!company?.id
  });
};

export const useFeatureFlags = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['feature-flags', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as FeatureFlag[];
      const { data, error } = await (supabase as any)
        .from('feature_flags')
        .select('*')
        .or(`tenant_id.eq.${company.id},tenant_id.is.null`)
        .order('feature_key')
        .limit(100);
      if (error) throw error;
      return (data || []) as FeatureFlag[];
    },
    enabled: !!company?.id
  });
};

export const useDomainEvents = (streamType?: string, streamId?: string, limit = 100) => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['domain-events', company?.id, streamType, streamId, limit],
    queryFn: async () => {
      if (!company?.id) return [] as DomainEvent[];
      let query = (supabase as any)
        .from('domain_events')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (streamType) {
        query = query.eq('stream_type', streamType);
      }
      if (streamId) {
        query = query.eq('stream_id', streamId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DomainEvent[];
    },
    enabled: !!company?.id
  });
};

// Mutations
export const useCreateHold = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (hold: Partial<Hold>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await (supabase as any)
        .from('holds')
        .insert({ ...hold, tenant_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holds'] });
      toast({ title: 'Hold aangemaakt' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useResolveHold = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, resolution_note }: { id: string; resolution_note?: string }) => {
      const { error } = await (supabase as any)
        .from('holds')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          resolution_note 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holds'] });
      toast({ title: 'Hold opgelost' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useResolveIntegrationFailure = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, resolution_note }: { id: string; resolution_note?: string }) => {
      const { error } = await (supabase as any)
        .from('integration_failures')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          resolution_note 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-failures'] });
      toast({ title: 'Failure opgelost' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useResolveDuplicate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, merged_to_id }: { id: string; status: string; merged_to_id?: string }) => {
      const { error } = await (supabase as any)
        .from('duplicate_candidates')
        .update({ 
          status,
          merged_to_id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-candidates'] });
      toast({ title: 'Duplicate verwerkt' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useCreateDomainEvent = () => {
  const { company } = useCompany();
  
  return useMutation({
    mutationFn: async (event: Partial<DomainEvent>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await (supabase as any)
        .from('domain_events')
        .insert({ ...event, tenant_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  });
};

export const useUpsertAuthorityRule = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rule: Partial<AuthorityRule>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await (supabase as any)
        .from('authority_rules')
        .upsert({ ...rule, tenant_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authority-rules'] });
      toast({ title: 'Authority rule opgeslagen' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useUpsertSafetyProfile = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: Partial<SafetyProfile>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await (supabase as any)
        .from('safety_profiles')
        .upsert({ ...profile, tenant_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-profiles'] });
      toast({ title: 'Safety profile opgeslagen' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

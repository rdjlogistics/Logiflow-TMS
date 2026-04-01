import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

// Note: These tables are newly created and types will be available after regeneration
// Using 'any' temporarily until types are regenerated

// Types
export interface FinanceEvent {
  id: string;
  company_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, any>;
  idempotency_key?: string;
  created_at: string;
  created_by?: string;
}

export interface AutomationDefinition {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: any[];
  actions: any[];
  is_active: boolean;
  version: number;
  published_at?: string;
  published_by?: string;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  company_id: string;
  automation_id: string;
  version: number;
  trigger_event: Record<string, any>;
  status: string;
  is_simulation: boolean;
  started_at: string;
  completed_at?: string;
  processed_count: number;
  blocked_count: number;
  error_count: number;
  results: any[];
  errors: any[];
}

export interface ReconciliationIssue {
  id: string;
  company_id: string;
  issue_type: string;
  severity: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  suggested_fix?: string;
  fix_action?: Record<string, any>;
  status: string;
  owner_id?: string;
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface FinancePolicy {
  id: string;
  company_id: string;
  min_cash_buffer_eur: number;
  critical_buffer_eur: number;
  pod_required_default: boolean;
  pod_required_above_eur: number;
  invoice_auto_send_max_eur: number;
  payout_auto_approve_max_eur: number;
  two_person_approval_above_eur: number;
  matching_confidence_threshold: number;
  matching_auto_approve_threshold: number;
  payout_requires_contract: boolean;
  iban_change_cooldown_days: number;
  iban_verification_required: boolean;
  hold_auto_escalate_days: number;
  base_currency: string;
}

export interface AuthorityDelegation {
  id: string;
  company_id: string;
  role: string;
  max_invoice_send_eur?: number;
  max_payout_approve_eur?: number;
  max_hold_resolve_eur?: number;
  max_dispute_create_eur?: number;
  can_publish_automations: boolean;
  can_modify_policies: boolean;
  can_export_audit: boolean;
  can_manage_legal_hold: boolean;
}

export interface SystemJob {
  id: string;
  company_id: string;
  job_type: string;
  job_name: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  processed_count: number;
  error_count: number;
  duration_ms?: number;
  metadata: Record<string, any>;
  error_details?: Record<string, any>;
  created_at: string;
}

export interface SystemIncident {
  id: string;
  company_id: string;
  incident_type: string;
  severity: string;
  title: string;
  description?: string;
  source?: string;
  affected_entities: any[];
  status: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

export interface LegalHold {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id?: string;
  reason: string;
  reference_number?: string;
  is_active: boolean;
  applied_at: string;
  applied_by?: string;
  released_at?: string;
  released_by?: string;
  release_reason?: string;
}

export interface FinanceHold {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  hold_type: string;
  reason: string;
  reason_code?: string;
  severity: string;
  is_active: boolean;
  target_resolution_date?: string;
  owner_id?: string;
  escalated_at?: string;
  escalation_level: number;
  created_at: string;
  created_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface AIRecommendation {
  id: string;
  company_id: string;
  recommendation_type: string;
  claim: string;
  evidence: any[];
  risk?: string;
  estimated_impact_eur?: number;
  confidence?: number;
  suggested_actions: any[];
  status: string;
  dismissed_at?: string;
  dismissed_by?: string;
  dismissed_reason?: string;
  actioned_at?: string;
  actioned_by?: string;
  action_taken?: string;
  created_at: string;
  expires_at?: string;
}

// Hooks - using type assertions for newly created tables
export const useAutomations = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['automations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as AutomationDefinition[];
      const { data, error } = await (supabase as any)
        .from('automation_definitions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AutomationDefinition[];
    },
    enabled: !!company?.id
  });
};

export const useAutomationRuns = (automationId?: string) => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['automation-runs', company?.id, automationId],
    queryFn: async () => {
      if (!company?.id) return [] as AutomationRun[];
      let query = (supabase as any)
        .from('automation_runs')
        .select('*')
        .eq('company_id', company.id)
        .order('started_at', { ascending: false })
        .limit(100);
      
      if (automationId) {
        query = query.eq('automation_id', automationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AutomationRun[];
    },
    enabled: !!company?.id
  });
};

export const useReconciliationIssues = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['reconciliation-issues', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as ReconciliationIssue[];
      const { data, error } = await (supabase as any)
        .from('reconciliation_issues')
        .select('*')
        .eq('company_id', company.id)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ReconciliationIssue[];
    },
    enabled: !!company?.id
  });
};

export const useFinancePolicies = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['finance-policies', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await (supabase as any)
        .from('finance_policies')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as FinancePolicy | null;
    },
    enabled: !!company?.id
  });
};

export const useAuthorityDelegations = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['authority-delegations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as AuthorityDelegation[];
      const { data, error } = await (supabase as any)
        .from('authority_delegations')
        .select('*')
        .eq('company_id', company.id)
        .order('role');
      if (error) throw error;
      return (data || []) as AuthorityDelegation[];
    },
    enabled: !!company?.id
  });
};

export const useSystemJobs = (jobType?: string) => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['system-jobs', company?.id, jobType],
    queryFn: async () => {
      if (!company?.id) return [] as SystemJob[];
      let query = (supabase as any)
        .from('system_jobs')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (jobType) {
        query = query.eq('job_type', jobType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SystemJob[];
    },
    enabled: !!company?.id
  });
};

export const useSystemIncidents = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['system-incidents', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as SystemIncident[];
      const { data, error } = await (supabase as any)
        .from('system_incidents')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as SystemIncident[];
    },
    enabled: !!company?.id
  });
};

export const useLegalHolds = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['legal-holds', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as LegalHold[];
      const { data, error } = await (supabase as any)
        .from('legal_holds')
        .select('*')
        .eq('company_id', company.id)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LegalHold[];
    },
    enabled: !!company?.id
  });
};

export const useFinanceHolds = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['finance-holds', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as FinanceHold[];
      const { data, error } = await (supabase as any)
        .from('finance_holds')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as FinanceHold[];
    },
    enabled: !!company?.id
  });
};

export const useAIRecommendations = () => {
  const { company } = useCompany();
  
  return useQuery({
    queryKey: ['ai-recommendations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [] as AIRecommendation[];
      const { data, error } = await (supabase as any)
        .from('ai_recommendations')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AIRecommendation[];
    },
    enabled: !!company?.id
  });
};

// Mutations
export const useCreateAutomation = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (automation: Partial<AutomationDefinition>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await (supabase as any)
        .from('automation_definitions')
        .insert({ ...automation, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast({ title: 'Automation aangemaakt' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useUpdateFinancePolicies = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (policies: Partial<FinancePolicy>) => {
      if (!company?.id) throw new Error('No company');
      const { data, error } = await (supabase as any)
        .from('finance_policies')
        .upsert({ ...policies, company_id: company.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-policies'] });
      toast({ title: 'Policies opgeslagen' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useResolveReconciliationIssue = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await (supabase as any)
        .from('reconciliation_issues')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString(),
          resolution_notes: notes 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-issues'] });
      toast({ title: 'Issue opgelost' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useAcknowledgeIncident = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('system_incidents')
        .update({ 
          status: 'acknowledged', 
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-incidents'] });
      toast({ title: 'Incident erkend' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

export const useDismissAIRecommendation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await (supabase as any)
        .from('ai_recommendations')
        .update({ 
          status: 'dismissed', 
          dismissed_at: new Date().toISOString(),
          dismissed_reason: reason
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      toast({ title: 'Aanbeveling gesloten' });
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    }
  });
};

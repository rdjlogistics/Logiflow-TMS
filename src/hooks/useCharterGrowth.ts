import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

export interface Lane {
  id: string;
  tenant_id: string;
  origin_name: string;
  destination_name: string;
  name: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  account_lane_profiles?: AccountLaneProfile[];
}

export interface AccountLaneProfile {
  id: string;
  account_id: string;
  lane_id: string;
  equipment_type: string | null;
  service_level: 'EXPRESS' | 'STANDARD' | 'ECONOMY';
  volume_per_week: number | null;
  target_margin_percent: number | null;
  competitor_notes: string | null;
  status: 'PROSPECT' | 'ACTIVE' | 'PAUSED';
  customer?: {
    id: string;
    company_name: string;
  };
}

export interface RFQMessage {
  id: string;
  source: 'EMAIL' | 'UPLOAD' | 'MANUAL';
  subject: string | null;
  body_text: string | null;
  sender_email: string | null;
  sender_name: string | null;
  attachment_urls: string[];
  extracted_json: any;
  extraction_confidence: number | null;
  status: 'NEW' | 'PARSED' | 'NEEDS_REVIEW' | 'CONVERTED' | 'ARCHIVED';
  created_at: string;
}

export interface DossierDocument {
  id: string;
  account_id: string;
  doc_type: 'CONTRACT' | 'INSURANCE' | 'SLA' | 'QUOTE' | 'POD_SAMPLE' | 'CERT' | 'OTHER';
  file_name: string;
  file_url: string;
  version: number;
  locked_after_signature: boolean;
  locked_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface SalesProcess {
  id: string;
  account_id: string;
  title: string;
  stage: 'INTAKE' | 'QUOTE' | 'NEGOTIATE' | 'CONTRACT' | 'ONBOARD' | 'LIVE';
  value_estimate: number | null;
  probability_percent: number;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  customer?: {
    id: string;
    company_name: string;
  };
}

export interface AccountPolicyOverride {
  id: string;
  account_id: string;
  tracking_privacy_km: number | null;
  pod_required: boolean | null;
  auto_invoice: boolean | null;
  waiting_time_auto: boolean | null;
  payment_terms_days: number | null;
  min_margin_percent_override: number | null;
  max_credit_limit: number | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'ARCHIVED';
  approved_at: string | null;
}

export interface AccountHealthSignal {
  id: string;
  account_id: string;
  signal_type: 'DELAYS' | 'CLAIMS' | 'DISPUTES' | 'LATE_PAY' | 'LOW_MARGIN' | 'CHURN_RISK' | 'VOLUME_DROP' | 'COMPETITOR_THREAT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  details_json: any;
  suggested_action: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const useCharterGrowth = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Lanes
  const { data: lanes = [], isLoading: lanesLoading } = useQuery({
    queryKey: ['lanes', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('lanes')
        .select(`
          *,
          account_lane_profiles (
            *,
            customer:customers (id, company_name)
          )
        `)
        .eq('tenant_id', company.id)
        .order('origin_name');
      if (error) throw error;
      return data as Lane[];
    },
    enabled: !!company?.id,
  });

  // RFQ Messages
  const { data: rfqMessages = [], isLoading: rfqLoading } = useQuery({
    queryKey: ['rfq-messages', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('rfq_messages')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as RFQMessage[];
    },
    enabled: !!company?.id,
  });

  // Sales Processes
  const { data: salesProcesses = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales-processes', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('sales_processes')
        .select(`
          *,
          customer:customers (id, company_name)
        `)
        .eq('tenant_id', company.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as SalesProcess[];
    },
    enabled: !!company?.id,
  });

  // Health Signals
  const { data: healthSignals = [], isLoading: healthLoading } = useQuery({
    queryKey: ['health-signals', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('account_health_signals')
        .select('*')
        .eq('tenant_id', company.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccountHealthSignal[];
    },
    enabled: !!company?.id,
  });

  // Create Lane
  const createLane = useMutation({
    mutationFn: async (data: { origin_name: string; destination_name: string; tags?: string[] }) => {
      if (!company?.id) throw new Error('No company');
      const { error } = await supabase.from('lanes').insert({
        tenant_id: company.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lanes'] });
      toast({ title: 'Lane aangemaakt' });
    },
  });

  // Create RFQ
  const createRFQ = useMutation({
    mutationFn: async (data: { source: string; subject: string; body_text: string; sender_email?: string }) => {
      if (!company?.id) throw new Error('No company');
      const { error } = await supabase.from('rfq_messages').insert({
        tenant_id: company.id,
        ...data,
        status: 'NEW',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-messages'] });
      toast({ title: 'RFQ toegevoegd' });
    },
  });

  // Update RFQ Status
  const updateRFQStatus = useMutation({
    mutationFn: async ({ id, status, extracted_json }: { id: string; status: string; extracted_json?: any }) => {
      const { error } = await supabase.from('rfq_messages').update({
        status,
        extracted_json,
        reviewed_at: status === 'CONVERTED' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-messages'] });
    },
  });

  // Create Sales Process
  const createSalesProcess = useMutation({
    mutationFn: async (data: { account_id: string; title: string; value_estimate?: number }) => {
      if (!company?.id) throw new Error('No company');
      const { error } = await supabase.from('sales_processes').insert({
        tenant_id: company.id,
        stage: 'INTAKE',
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-processes'] });
      toast({ title: 'Deal aangemaakt' });
    },
  });

  // Update Sales Stage
  const updateSalesStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from('sales_processes').update({ stage }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-processes'] });
    },
  });

  // Resolve Health Signal
  const resolveHealthSignal = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase.from('account_health_signals').update({
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-signals'] });
      toast({ title: 'Signaal opgelost' });
    },
  });

  return {
    // Data
    lanes,
    rfqMessages,
    salesProcesses,
    healthSignals,
    // Loading states
    lanesLoading,
    rfqLoading,
    salesLoading,
    healthLoading,
    // Mutations
    createLane,
    createRFQ,
    updateRFQStatus,
    createSalesProcess,
    updateSalesStage,
    resolveHealthSignal,
  };
};

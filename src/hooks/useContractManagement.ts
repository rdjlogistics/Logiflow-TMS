import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Json, Database } from '@/integrations/supabase/types';

type CounterpartyType = Database['public']['Enums']['counterparty_type'];
type ContractStatus = Database['public']['Enums']['contract_status'];
type ContractEventType = Database['public']['Enums']['contract_event_type'];

export interface ContractDocument {
  id: string;
  title: string;
  type: string;
  status: ContractStatus;
  version: number;
  content_html: string | null;
  pdf_storage_url: string | null;
  counterparty_id: string;
  counterparty_type: CounterpartyType;
  related_order_id: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  expires_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  merged_data: Json | null;
  company_id: string;
  counterparty_name?: string;
  counterparty_email?: string;
  signature_requests?: SignatureRequest[];
}

export interface SignatureRequest {
  id: string;
  contract_id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  signing_order: number;
  status: string;
  auth_method: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
}

export interface ContractEvent {
  id: string;
  contract_id: string;
  event_type: ContractEventType;
  timestamp: string;
  actor_name: string | null;
  actor_email: string | null;
  event_description: string | null;
  ip_address: string | null;
  device_type: string | null;
}

export interface CreateContractParams {
  title: string;
  type: string;
  content_html: string;
  counterparty_id: string;
  counterparty_type: CounterpartyType;
  counterparty_name: string;
  counterparty_email: string;
  template_id?: string;
  related_order_id?: string;
  merged_data?: Record<string, string>;
  expires_at?: string;
  send_immediately?: boolean;
}

export function useContractManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContract, setSelectedContract] = useState<ContractDocument | null>(null);

  // Fetch all contracts for the company
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['contracts-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with counterparty info and signature requests
      const enrichedContracts: ContractDocument[] = [];
      
      for (const contract of data || []) {
        let counterpartyName = '';
        let counterpartyEmail = '';
        
        if (contract.counterparty_type === 'driver') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', contract.counterparty_id)
            .maybeSingle();
          
          counterpartyName = profile?.full_name || 'Chauffeur';
        } else if (contract.counterparty_type === 'customer') {
          const { data: customer } = await supabase
            .from('customers')
            .select('company_name, contact_name, email')
            .eq('id', contract.counterparty_id)
            .maybeSingle();
          
          counterpartyName = customer?.contact_name || customer?.company_name || 'Klant';
          counterpartyEmail = customer?.email || '';
        } else if (contract.counterparty_type === 'carrier') {
          const { data: carrier } = await supabase
            .from('carriers')
            .select('company_name, contact_name, email')
            .eq('id', contract.counterparty_id)
            .maybeSingle();
          
          counterpartyName = carrier?.contact_name || carrier?.company_name || 'Charter';
          counterpartyEmail = carrier?.email || '';
        }
        
        // Get signature requests
        const { data: sigRequests } = await supabase
          .from('signature_requests')
          .select('*')
          .eq('contract_id', contract.id)
          .order('signing_order');
        
        enrichedContracts.push({
          ...contract,
          counterparty_name: counterpartyName,
          counterparty_email: counterpartyEmail,
          signature_requests: sigRequests || [],
        });
      }
      
      return enrichedContracts;
    },
    enabled: !!user?.id,
  });

  // Fetch contract events/timeline
  const fetchContractEvents = useCallback(async (contractId: string): Promise<ContractEvent[]> => {
    const { data, error } = await supabase
      .from('contract_events')
      .select('*')
      .eq('contract_id', contractId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  }, []);

  // Create a new contract
  const createContractMutation = useMutation({
    mutationFn: async (params: CreateContractParams) => {
      // Get company ID
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!companyData) throw new Error('Geen bedrijf gevonden');

      const status: ContractStatus = params.send_immediately ? 'sent' : 'draft';
      
      // Create contract document
      const { data: contract, error: contractError } = await supabase
        .from('contract_documents')
        .insert({
          title: params.title,
          type: params.type,
          content_html: params.content_html,
          counterparty_id: params.counterparty_id,
          counterparty_type: params.counterparty_type,
          template_id: params.template_id || null,
          related_order_id: params.related_order_id || null,
          merged_data: params.merged_data || null,
          expires_at: params.expires_at || null,
          company_id: companyData.id,
          created_by: user?.id,
          status,
          sent_at: params.send_immediately ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Create signature request for counterparty
      const { error: sigError } = await supabase
        .from('signature_requests')
        .insert({
          contract_id: contract.id,
          signer_name: params.counterparty_name,
          signer_email: params.counterparty_email,
          signer_role: params.counterparty_type,
          signer_party_type: params.counterparty_type,
          signer_party_id: params.counterparty_id,
          signing_order: 1,
          status: params.send_immediately ? 'sent' : 'pending',
          auth_method: 'email_link',
          sent_at: params.send_immediately ? new Date().toISOString() : null,
        });

      if (sigError) throw sigError;

      // Log creation event
      await supabase.from('contract_events').insert({
        contract_id: contract.id,
        event_type: 'created' as ContractEventType,
        actor_user_id: user?.id,
        actor_name: user?.user_metadata?.full_name || user?.email,
        actor_email: user?.email,
        event_description: 'Contract aangemaakt',
      });

      if (params.send_immediately) {
        await supabase.from('contract_events').insert({
          contract_id: contract.id,
          event_type: 'sent' as ContractEventType,
          actor_user_id: user?.id,
          actor_name: user?.user_metadata?.full_name || user?.email,
          actor_email: user?.email,
          event_description: `Contract verzonden naar ${params.counterparty_name}`,
        });
      }

      return contract;
    },
    onSuccess: () => {
      toast({
        title: 'Contract aangemaakt',
        description: 'Het contract is succesvol aangemaakt.',
      });
      queryClient.invalidateQueries({ queryKey: ['contracts-management'] });
    },
    onError: (error) => {
      console.error('Create contract error:', error);
      toast({
        title: 'Fout',
        description: 'Kon contract niet aanmaken.',
        variant: 'destructive',
      });
    },
  });

  // Send contract for signing
  const sendContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      // Update contract status
      const { error: contractError } = await supabase
        .from('contract_documents')
        .update({
          status: 'sent' as ContractStatus,
          sent_at: new Date().toISOString(),
        })
        .eq('id', contractId);

      if (contractError) throw contractError;

      // Update signature requests
      const { error: sigError } = await supabase
        .from('signature_requests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('contract_id', contractId)
        .eq('status', 'pending');

      if (sigError) throw sigError;

      // Log event
      await supabase.from('contract_events').insert({
        contract_id: contractId,
        event_type: 'sent' as ContractEventType,
        actor_user_id: user?.id,
        actor_name: user?.user_metadata?.full_name || user?.email,
        actor_email: user?.email,
        event_description: 'Contract verzonden voor ondertekening',
      });

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Contract verzonden',
        description: 'Het contract is verzonden voor ondertekening.',
      });
      queryClient.invalidateQueries({ queryKey: ['contracts-management'] });
    },
    onError: (error) => {
      console.error('Send contract error:', error);
      toast({
        title: 'Fout',
        description: 'Kon contract niet verzenden.',
        variant: 'destructive',
      });
    },
  });

  // Void/cancel a contract - mark as expired instead of voided
  const voidContractMutation = useMutation({
    mutationFn: async ({ contractId, reason }: { contractId: string; reason: string }) => {
      const { error } = await supabase
        .from('contract_documents')
        .update({
          status: 'expired' as ContractStatus,
        })
        .eq('id', contractId);

      if (error) throw error;

      // Log event
      await supabase.from('contract_events').insert({
        contract_id: contractId,
        event_type: 'expired' as ContractEventType,
        actor_user_id: user?.id,
        actor_name: user?.user_metadata?.full_name || user?.email,
        actor_email: user?.email,
        event_description: 'Contract geannuleerd',
        payload: { reason },
      });

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Contract geannuleerd',
        description: 'Het contract is geannuleerd.',
      });
      queryClient.invalidateQueries({ queryKey: ['contracts-management'] });
    },
    onError: (error) => {
      console.error('Void contract error:', error);
      toast({
        title: 'Fout',
        description: 'Kon contract niet annuleren.',
        variant: 'destructive',
      });
    },
  });

  // Resend contract
  const resendContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      // Update signature requests sent_at
      const { error } = await supabase
        .from('signature_requests')
        .update({
          last_reminder_at: new Date().toISOString(),
        })
        .eq('contract_id', contractId)
        .in('status', ['sent', 'viewed']);

      if (error) throw error;

      // Log event
      await supabase.from('contract_events').insert({
        contract_id: contractId,
        event_type: 'reminder_sent' as ContractEventType,
        actor_user_id: user?.id,
        actor_name: user?.user_metadata?.full_name || user?.email,
        actor_email: user?.email,
        event_description: 'Herinnering verzonden',
      });

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Herinnering verzonden',
        description: 'De herinnering is verzonden.',
      });
      queryClient.invalidateQueries({ queryKey: ['contracts-management'] });
    },
    onError: (error) => {
      console.error('Resend contract error:', error);
      toast({
        title: 'Fout',
        description: 'Kon herinnering niet verzenden.',
        variant: 'destructive',
      });
    },
  });

  // Stats
  const stats = {
    total: contracts?.length || 0,
    draft: contracts?.filter(c => c.status === 'draft').length || 0,
    sent: contracts?.filter(c => c.status === 'sent').length || 0,
    viewed: contracts?.filter(c => c.status === 'viewed').length || 0,
    completed: contracts?.filter(c => c.status === 'completed').length || 0,
    declined: contracts?.filter(c => c.status === 'declined').length || 0,
    expired: contracts?.filter(c => c.status === 'expired').length || 0,
  };

  return {
    contracts: contracts || [],
    isLoading,
    refetch,
    selectedContract,
    setSelectedContract,
    fetchContractEvents,
    createContract: createContractMutation.mutateAsync,
    isCreating: createContractMutation.isPending,
    sendContract: sendContractMutation.mutate,
    isSending: sendContractMutation.isPending,
    voidContract: voidContractMutation.mutate,
    isVoiding: voidContractMutation.isPending,
    resendContract: resendContractMutation.mutate,
    isResending: resendContractMutation.isPending,
    stats,
  };
}

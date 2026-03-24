import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface CustomerContract {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number;
  content_html: string | null;
  pdf_storage_url: string | null;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
  related_order_id: string | null;
  signature_request?: {
    id: string;
    status: string;
    signer_name: string;
    signer_email: string;
    auth_method: string;
    signed_at: string | null;
  };
}

export const useCustomerContracts = (customerId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contracts assigned to the customer
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['customer-contracts', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      // Get contracts where the customer is the counterparty
      const { data: contractData, error: contractError } = await supabase
        .from('contract_documents')
        .select(`
          id,
          title,
          type,
          status,
          version,
          content_html,
          pdf_storage_url,
          created_at,
          expires_at,
          completed_at,
          related_order_id
        `)
        .eq('counterparty_type', 'customer')
        .eq('counterparty_id', customerId)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (contractError) throw contractError;

      // Get signature requests for these contracts
      const contractIds = (contractData || []).map(c => c.id);
      
      if (contractIds.length === 0) return [];

      const { data: signatureData, error: signatureError } = await supabase
        .from('signature_requests')
        .select('id, contract_id, status, signer_name, signer_email, auth_method, signed_at')
        .in('contract_id', contractIds);

      if (signatureError) throw signatureError;

      // Combine contracts with their signature requests
      const contractsWithSignatures: CustomerContract[] = (contractData || []).map(contract => {
        const signatureRequest = (signatureData || []).find(
          sig => sig.contract_id === contract.id
        );
        return {
          ...contract,
          signature_request: signatureRequest ? {
            id: signatureRequest.id,
            status: signatureRequest.status,
            signer_name: signatureRequest.signer_name,
            signer_email: signatureRequest.signer_email,
            auth_method: signatureRequest.auth_method,
            signed_at: signatureRequest.signed_at,
          } : undefined,
        };
      });

      return contractsWithSignatures;
    },
    enabled: !!customerId,
  });

  // Sign a contract
  const signContractMutation = useMutation({
    mutationFn: async ({ 
      contractId, 
      signatureRequestId, 
      signatureData,
      ipAddress,
      userAgent,
    }: { 
      contractId: string; 
      signatureRequestId: string; 
      signatureData: string;
      ipAddress?: string;
      userAgent?: string;
    }) => {
      // Update signature request
      const { error: signatureError } = await supabase
        .from('signature_requests')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_data: signatureData,
          signature_ip: ipAddress || null,
          signature_user_agent: userAgent || navigator.userAgent,
        })
        .eq('id', signatureRequestId);

      if (signatureError) throw signatureError;

      // Log the signing event
      const { error: eventError } = await supabase
        .from('contract_events')
        .insert({
          contract_id: contractId,
          event_type: 'signed',
          actor_user_id: user?.id,
          actor_name: user?.user_metadata?.full_name || user?.email,
          actor_email: user?.email,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          event_description: 'Contract ondertekend door klant',
          payload: { signature_request_id: signatureRequestId },
        });

      if (eventError) console.error('Failed to log signing event:', eventError);

      // Check if all signatures are complete and update contract status
      const { data: allSignatures } = await supabase
        .from('signature_requests')
        .select('status')
        .eq('contract_id', contractId);

      const allSigned = allSignatures?.every(sig => sig.status === 'signed');

      if (allSigned) {
        const { error: contractUpdateError } = await supabase
          .from('contract_documents')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', contractId);

        if (contractUpdateError) throw contractUpdateError;
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Contract ondertekend',
        description: 'Het contract is succesvol ondertekend.',
      });
      queryClient.invalidateQueries({ queryKey: ['customer-contracts'] });
    },
    onError: (error) => {
      toast({
        title: 'Fout bij ondertekenen',
        description: 'Er is een fout opgetreden. Probeer het opnieuw.',
        variant: 'destructive',
      });
      console.error('Sign contract error:', error);
    },
  });

  // Decline a contract
  const declineContractMutation = useMutation({
    mutationFn: async ({ 
      contractId, 
      signatureRequestId, 
      reason 
    }: { 
      contractId: string; 
      signatureRequestId: string; 
      reason: string;
    }) => {
      // Update signature request
      const { error: signatureError } = await supabase
        .from('signature_requests')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: reason,
        })
        .eq('id', signatureRequestId);

      if (signatureError) throw signatureError;

      // Update contract status
      const { error: contractError } = await supabase
        .from('contract_documents')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
        })
        .eq('id', contractId);

      if (contractError) throw contractError;

      // Log the decline event
      await supabase
        .from('contract_events')
        .insert({
          contract_id: contractId,
          event_type: 'declined',
          actor_user_id: user?.id,
          actor_name: user?.user_metadata?.full_name || user?.email,
          actor_email: user?.email,
          user_agent: navigator.userAgent,
          event_description: 'Contract afgewezen door klant',
          payload: { reason, signature_request_id: signatureRequestId },
        });

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Contract afgewezen',
        description: 'Het contract is afgewezen.',
      });
      queryClient.invalidateQueries({ queryKey: ['customer-contracts'] });
    },
    onError: (error) => {
      toast({
        title: 'Fout bij afwijzen',
        description: 'Er is een fout opgetreden. Probeer het opnieuw.',
        variant: 'destructive',
      });
      console.error('Decline contract error:', error);
    },
  });

  // Log view event
  const logViewEvent = async (contractId: string, signatureRequestId?: string) => {
    // Update signature request to viewed if pending/sent
    if (signatureRequestId) {
      await supabase
        .from('signature_requests')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', signatureRequestId)
        .in('status', ['pending', 'sent']);
    }

    // Log view event
    await supabase
      .from('contract_events')
      .insert({
        contract_id: contractId,
        event_type: 'viewed',
        actor_user_id: user?.id,
        actor_name: user?.user_metadata?.full_name || user?.email,
        actor_email: user?.email,
        user_agent: navigator.userAgent,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        event_description: 'Contract bekeken door klant',
        payload: signatureRequestId ? { signature_request_id: signatureRequestId } : {},
      });
  };

  // Stats
  const stats = {
    total: contracts?.length || 0,
    pending: contracts?.filter(c => 
      c.signature_request?.status && 
      ['pending', 'sent', 'viewed'].includes(c.signature_request.status)
    ).length || 0,
    signed: contracts?.filter(c => c.status === 'completed').length || 0,
  };

  return {
    contracts: contracts || [],
    isLoading,
    refetch,
    signContract: signContractMutation.mutate,
    isSigning: signContractMutation.isPending,
    declineContract: declineContractMutation.mutate,
    isDeclining: declineContractMutation.isPending,
    logViewEvent,
    stats,
  };
};

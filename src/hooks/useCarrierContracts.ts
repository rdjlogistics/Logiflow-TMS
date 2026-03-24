import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface CarrierContract {
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
  company_name: string; // The company that sent the contract
  signature_request?: {
    id: string;
    status: string;
    signer_name: string;
    signer_email: string;
    auth_method: string;
    signed_at: string | null;
    decline_reason: string | null;
  };
}

export const useCarrierContracts = (carrierId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contracts assigned to the carrier
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['carrier-contracts', carrierId],
    queryFn: async () => {
      if (!carrierId) return [];

      // Get contracts where the carrier is the counterparty
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
          related_order_id,
          company_id
        `)
        .eq('counterparty_type', 'carrier')
        .eq('counterparty_id', carrierId)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });

      if (contractError) throw contractError;

      // Get company names and signature requests
      const contractIds = (contractData || []).map(c => c.id);
      const companyIds = [...new Set((contractData || []).map(c => c.company_id))];
      
      if (contractIds.length === 0) return [];

      const [{ data: signatureData }, { data: companiesData }] = await Promise.all([
        supabase
          .from('signature_requests')
          .select('id, contract_id, status, signer_name, signer_email, auth_method, signed_at, decline_reason')
          .in('contract_id', contractIds),
        supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds),
      ]);

      // Create company lookup
      const companyLookup = (companiesData || []).reduce((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {} as Record<string, string>);

      // Combine contracts with their signature requests
      const contractsWithSignatures: CarrierContract[] = (contractData || []).map(contract => {
        const signatureRequest = (signatureData || []).find(
          sig => sig.contract_id === contract.id
        );
        return {
          ...contract,
          company_name: companyLookup[contract.company_id] || 'Onbekend bedrijf',
          signature_request: signatureRequest ? {
            id: signatureRequest.id,
            status: signatureRequest.status,
            signer_name: signatureRequest.signer_name,
            signer_email: signatureRequest.signer_email,
            auth_method: signatureRequest.auth_method,
            signed_at: signatureRequest.signed_at,
            decline_reason: signatureRequest.decline_reason,
          } : undefined,
        };
      });

      return contractsWithSignatures;
    },
    enabled: !!carrierId,
  });

  // Sign a contract
  const signContractMutation = useMutation({
    mutationFn: async ({ 
      contractId, 
      signatureRequestId, 
      signatureData,
      signerName,
      signerEmail,
    }: { 
      contractId: string; 
      signatureRequestId: string; 
      signatureData: string;
      signerName?: string;
      signerEmail?: string;
    }) => {
      // Update signature request
      const { error: signatureError } = await supabase
        .from('signature_requests')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_data: signatureData,
          signature_user_agent: navigator.userAgent,
        })
        .eq('id', signatureRequestId);

      if (signatureError) throw signatureError;

      // Log the signing event
      await supabase
        .from('contract_events')
        .insert({
          contract_id: contractId,
          event_type: 'signed',
          actor_name: signerName,
          actor_email: signerEmail,
          actor_party_type: 'carrier',
          actor_party_id: carrierId,
          user_agent: navigator.userAgent,
          device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          event_description: 'Contract ondertekend door charter',
          payload: { signature_request_id: signatureRequestId },
        });

      // Check if all signatures are complete and update contract status
      const { data: allSignatures } = await supabase
        .from('signature_requests')
        .select('status')
        .eq('contract_id', contractId);

      const allSigned = allSignatures?.every(sig => sig.status === 'signed');

      if (allSigned) {
        await supabase
          .from('contract_documents')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', contractId);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Contract ondertekend',
        description: 'Het contract is succesvol ondertekend.',
      });
      queryClient.invalidateQueries({ queryKey: ['carrier-contracts'] });
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
      reason,
      signerName,
      signerEmail,
    }: { 
      contractId: string; 
      signatureRequestId: string; 
      reason: string;
      signerName?: string;
      signerEmail?: string;
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
          actor_name: signerName,
          actor_email: signerEmail,
          actor_party_type: 'carrier',
          actor_party_id: carrierId,
          user_agent: navigator.userAgent,
          event_description: 'Contract afgewezen door charter',
          payload: { reason, signature_request_id: signatureRequestId },
        });

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Contract afgewezen',
        description: 'Het contract is afgewezen.',
      });
      queryClient.invalidateQueries({ queryKey: ['carrier-contracts'] });
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
  const logViewEvent = async (contractId: string, signatureRequestId?: string, signerName?: string, signerEmail?: string) => {
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
        actor_name: signerName,
        actor_email: signerEmail,
        actor_party_type: 'carrier',
        actor_party_id: carrierId,
        user_agent: navigator.userAgent,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        event_description: 'Contract bekeken door charter',
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
    declined: contracts?.filter(c => c.status === 'declined').length || 0,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

// Types
export interface ProofOfDelivery {
  id: string;
  tenant_id: string;
  order_id: string;
  stop_id: string | null;
  method: 'signature' | 'photo' | 'scan' | 'multi';
  signed_name: string | null;
  signature_blob_url: string | null;
  photos_urls: string[];
  documents_urls: string[];
  geo_lat: number | null;
  geo_lng: number | null;
  captured_at: string;
  notes: string | null;
  created_by_driver_id: string | null;
  hash: string | null;
  created_at: string;
  // Joined
  order?: { order_number: string; customer_id: string };
}

export interface ClaimCase {
  id: string;
  tenant_id: string;
  order_id: string;
  stop_id: string | null;
  opened_by_role: string;
  claim_type: 'damage' | 'shortage' | 'delay' | 'no_show' | 'other';
  status: 'open' | 'in_review' | 'awaiting_info' | 'approved' | 'rejected' | 'settled';
  liability: 'undecided' | 'carrier' | 'customer' | 'charter';
  claimed_amount: number;
  approved_amount: number | null;
  currency: string;
  evidence_urls: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  updated_at: string;
  // Joined
  order?: { order_number: string; customers?: { company_name: string } };
}

export interface ChainOfCustodyEvent {
  id: string;
  tenant_id: string;
  order_id: string;
  event_type: 'received' | 'loaded' | 'departed' | 'arrived' | 'delivered' | 'pod_collected' | 'exception';
  recorded_at: string;
  actor_role: string | null;
  actor_id: string | null;
  details_json: Record<string, unknown>;
}

export const usePODClaims = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  // Fetch PODs
  const { data: pods = [], isLoading: podsLoading } = useQuery({
    queryKey: ["proof_of_delivery", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_of_delivery")
        .select("*, order:order_id(order_number, customer:customer_id(company_name))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ProofOfDelivery[];
    },
    enabled: !!company?.id,
  });

  // Fetch claims
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["claim_cases", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claim_cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClaimCase[];
    },
    enabled: !!company?.id,
  });

  // Fetch custody events
  const { data: custodyEvents = [], isLoading: custodyEventsLoading } = useQuery({
    queryKey: ["chain_of_custody_events", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chain_of_custody_events")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as ChainOfCustodyEvent[];
    },
    enabled: !!company?.id,
  });

  // Create POD mutation
  const createPOD = useMutation({
    mutationFn: async (pod: Partial<ProofOfDelivery>) => {
      const { data, error } = await supabase
        .from("proof_of_delivery")
        .insert({
          order_id: pod.order_id || '',
          method: pod.method || 'signature',
          tenant_id: company?.id!,
          ...pod
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proof_of_delivery"] });
      toast({ title: "POD opgeslagen" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij opslaan POD", description: error.message, variant: "destructive" });
    },
  });

  // Create claim mutation
  const createClaim = useMutation({
    mutationFn: async (claim: Partial<ClaimCase>) => {
      const { data, error } = await supabase
        .from("claim_cases")
        .insert({
          order_id: claim.order_id || '',
          claim_type: claim.claim_type || 'other',
          status: 'open',
          liability: 'undecided',
          tenant_id: company?.id!,
          ...claim
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim_cases"] });
      toast({ title: "Claim aangemaakt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij aanmaken claim", description: error.message, variant: "destructive" });
    },
  });

  // Update claim mutation
  const updateClaim = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ClaimCase> & { id: string }) => {
      const { data, error } = await supabase
        .from("claim_cases")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim_cases"] });
      toast({ title: "Claim bijgewerkt" });
    },
  });

  // Resolve claim
  const resolveClaim = useMutation({
    mutationFn: async ({ id, status, approved_amount, liability }: { 
      id: string; 
      status: 'approved' | 'rejected' | 'settled';
      approved_amount?: number;
      liability?: ClaimCase['liability'];
    }) => {
      const { data, error } = await supabase
        .from("claim_cases")
        .update({
          status,
          approved_amount,
          liability,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim_cases"] });
      toast({ title: "Claim afgehandeld" });
    },
  });

  // Stats
  const claimStats = {
    open: claims.filter(c => c.status === 'open').length,
    inReview: claims.filter(c => c.status === 'in_review').length,
    awaitingInfo: claims.filter(c => c.status === 'awaiting_info').length,
    resolved: claims.filter(c => ['approved', 'rejected', 'settled'].includes(c.status)).length,
    totalClaimedAmount: claims.reduce((sum, c) => sum + (c.claimed_amount || 0), 0),
    totalApprovedAmount: claims.reduce((sum, c) => sum + (c.approved_amount || 0), 0),
  };

  return {
    pods,
    podsLoading,
    claims,
    claimsLoading,
    custodyEvents,
    custodyEventsLoading,
    createPOD,
    createClaim,
    updateClaim,
    resolveClaim,
    claimStats,
    isLoading: podsLoading || claimsLoading,
  };
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

// Types
export interface CreditProfile {
  id: string;
  tenant_id: string;
  customer_id: string;
  credit_limit: number;
  currency: string;
  payment_terms_days: number;
  risk_level: 'low' | 'medium' | 'high';
  proforma_required: boolean;
  stop_shipping_on_overdue: boolean;
  grace_days: number;
  last_reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: { company_name: string };
}

export interface CreditExposure {
  id: string;
  tenant_id: string;
  customer_id: string;
  open_invoices_amount: number;
  overdue_amount: number;
  unbilled_delivered_amount: number;
  reserved_amount: number;
  exposure_total: number;
  updated_at: string;
  // Joined
  customer?: { company_name: string };
  credit_profile?: CreditProfile;
}

export interface CollectionCase {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_id: string | null;
  status: 'open' | 'contacted' | 'promised' | 'disputed' | 'paid' | 'escalated' | 'closed';
  next_action_at: string | null;
  owner_user_id: string | null;
  promised_date: string | null;
  promised_amount: number | null;
  notes: string | null;
  history_json: unknown[];
  created_at: string;
  updated_at: string;
  // Joined
  customer?: { company_name: string };
  invoice?: { invoice_number: string; total_amount: number; due_date: string };
}

export const useCreditControl = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  // Fetch credit profiles
  const { data: creditProfiles = [], isLoading: creditProfilesLoading } = useQuery({
    queryKey: ["credit_profiles", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_profiles")
        .select("*, customers(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CreditProfile[];
    },
    enabled: !!company?.id,
  });

  // Fetch credit exposures
  const { data: creditExposures = [], isLoading: creditExposuresLoading } = useQuery({
    queryKey: ["credit_exposures", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_exposures")
        .select("*")
        .order("exposure_total", { ascending: false });
      if (error) throw error;
      return data as CreditExposure[];
    },
    enabled: !!company?.id,
  });

  // Fetch collection cases
  const { data: collectionCases = [], isLoading: collectionCasesLoading } = useQuery({
    queryKey: ["collection_cases", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_cases")
        .select("*, customers(company_name, phone, email), invoices(invoice_number, total_amount, due_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CollectionCase[];
    },
    enabled: !!company?.id,
  });

  // Create or update credit profile
  const upsertCreditProfile = useMutation({
    mutationFn: async (profile: Partial<CreditProfile> & { customer_id: string }) => {
      const { data, error } = await supabase
        .from("credit_profiles")
        .upsert(
          { ...profile, tenant_id: company?.id } as any,
          { onConflict: "tenant_id,customer_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_profiles"] });
      toast({ title: "Kredietprofiel opgeslagen" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij opslaan profiel", description: error.message, variant: "destructive" });
    },
  });

  // Create collection case
  const createCollectionCase = useMutation({
    mutationFn: async (collectionCase: Partial<CollectionCase>) => {
      const { data, error } = await supabase
        .from("collection_cases")
        .insert({
          customer_id: collectionCase.customer_id || '',
          status: 'open',
          tenant_id: company?.id!,
          ...collectionCase
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection_cases"] });
      toast({ title: "Incasso case aangemaakt" });
    },
  });

  // Update collection case
  const updateCollectionCase = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CollectionCase> & { id: string }) => {
      const historyEntry = {
        timestamp: new Date().toISOString(),
        action: updates.status ? `Status gewijzigd naar ${updates.status}` : 'Case bijgewerkt',
        notes: updates.notes,
      };

      const { data: existing } = await supabase
        .from("collection_cases")
        .select("history_json")
        .eq("id", id)
        .maybeSingle();

      const existingHistory = Array.isArray(existing?.history_json) ? existing.history_json : [];
      const newHistory = [...existingHistory, historyEntry];

      const { data, error } = await supabase
        .from("collection_cases")
        .update({ ...updates, history_json: newHistory } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection_cases"] });
      toast({ title: "Incasso case bijgewerkt" });
    },
  });

  // Stats
  const collectionStats = {
    open: collectionCases.filter(c => c.status === 'open').length,
    contacted: collectionCases.filter(c => c.status === 'contacted').length,
    promised: collectionCases.filter(c => c.status === 'promised').length,
    disputed: collectionCases.filter(c => c.status === 'disputed').length,
    escalated: collectionCases.filter(c => c.status === 'escalated').length,
    closed: collectionCases.filter(c => ['paid', 'closed'].includes(c.status)).length,
  };

  const exposureStats = {
    totalExposure: creditExposures.reduce((sum, e) => sum + (e.exposure_total || 0), 0),
    totalOverdue: creditExposures.reduce((sum, e) => sum + (e.overdue_amount || 0), 0),
    atRiskCustomers: creditExposures.filter(e => e.overdue_amount > 0).length,
  };

  // Check if customer can place new order based on credit
  const checkCustomerCredit = (customerId: string, orderAmount: number = 0): {
    allowed: boolean;
    reason?: string;
    warningLevel?: 'info' | 'warning' | 'error';
    creditLimit?: number;
    currentExposure?: number;
    availableCredit?: number;
  } => {
    const profile = creditProfiles.find(p => p.customer_id === customerId);
    const exposure = creditExposures.find(e => e.customer_id === customerId);

    if (!profile) {
      return { allowed: true }; // No credit profile = no restrictions
    }

    const currentExposure = exposure?.exposure_total || 0;
    const availableCredit = profile.credit_limit - currentExposure;
    const newExposure = currentExposure + orderAmount;

    // Check if overdue and stop shipping flag is set
    if (profile.stop_shipping_on_overdue && (exposure?.overdue_amount || 0) > 0) {
      return {
        allowed: false,
        reason: `Klant heeft openstaande achterstallige facturen (€${(exposure?.overdue_amount || 0).toLocaleString()})`,
        warningLevel: 'error',
        creditLimit: profile.credit_limit,
        currentExposure,
        availableCredit,
      };
    }

    // Check if proforma required
    if (profile.proforma_required) {
      return {
        allowed: true,
        reason: 'Proforma factuur vereist voor deze klant',
        warningLevel: 'warning',
        creditLimit: profile.credit_limit,
        currentExposure,
        availableCredit,
      };
    }

    // Check credit limit
    if (orderAmount > 0 && newExposure > profile.credit_limit) {
      return {
        allowed: false,
        reason: `Kredietlimiet overschreden. Limiet: €${profile.credit_limit.toLocaleString()}, Huidig: €${currentExposure.toLocaleString()}, Beschikbaar: €${availableCredit.toLocaleString()}`,
        warningLevel: 'error',
        creditLimit: profile.credit_limit,
        currentExposure,
        availableCredit,
      };
    }

    // Warning if approaching limit (>80%)
    if (orderAmount > 0 && newExposure > profile.credit_limit * 0.8) {
      return {
        allowed: true,
        reason: `Kredietlimiet bijna bereikt (${Math.round(newExposure / profile.credit_limit * 100)}% gebruikt)`,
        warningLevel: 'warning',
        creditLimit: profile.credit_limit,
        currentExposure,
        availableCredit,
      };
    }

    return {
      allowed: true,
      creditLimit: profile.credit_limit,
      currentExposure,
      availableCredit,
    };
  };

  return {
    creditProfiles,
    creditProfilesLoading,
    creditExposures,
    creditExposuresLoading,
    collectionCases,
    collectionCasesLoading,
    upsertCreditProfile,
    createCollectionCase,
    updateCollectionCase,
    collectionStats,
    exposureStats,
    checkCustomerCredit,
    isLoading: creditProfilesLoading || collectionCasesLoading,
  };
};

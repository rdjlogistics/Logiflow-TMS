import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

// Types
export interface Zone {
  id: string;
  tenant_id: string;
  name: string;
  match_type: 'postcode_range' | 'city' | 'country' | 'geo_polygon';
  match_rules_json: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateContract {
  id: string;
  tenant_id: string;
  contract_type: 'customer' | 'carrier';
  counterparty_id: string;
  name: string;
  currency: string;
  status: 'draft' | 'active' | 'expired' | 'archived';
  effective_from: string;
  effective_to: string | null;
  approval_status: string;
  version: number;
  parent_version_id: string | null;
  hash: string | null;
  created_by: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  updated_at: string;
  // Joined data
  counterparty_name?: string;
  lanes_count?: number;
}

export interface RateLane {
  id: string;
  contract_id: string;
  origin_zone_id: string | null;
  destination_zone_id: string | null;
  service_level: string | null;
  vehicle_type: string | null;
  base_price: number;
  base_included_km: number;
  min_charge: number;
  price_per_km: number;
  price_per_stop: number;
  time_window_fee: number;
  weekend_fee: number;
  night_fee: number;
  fuel_surcharge_rule_id: string | null;
  toll_rule_id: string | null;
  rounding_rule: string;
  grace_minutes_waiting: number;
  waiting_tiers_json: unknown[];
  max_transit_time_minutes: number | null;
  priority: number;
  is_active: boolean;
  // Joined - partial Zone data from select
  origin_zone?: { id: string; name: string } | null;
  destination_zone?: { id: string; name: string } | null;
}

export interface Accessorial {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  applies_to: 'customer' | 'carrier' | 'both';
  calc_type: 'fixed' | 'per_km' | 'per_stop' | 'per_min' | 'percent';
  amount: number;
  tax_code: string | null;
  requires_proof: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurchargeRule {
  id: string;
  tenant_id: string;
  name: string;
  surcharge_type: 'fuel' | 'toll' | 'other';
  method: 'fixed' | 'percent' | 'table';
  payload_json: Record<string, unknown>;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RatingResult {
  id: string;
  tenant_id: string;
  order_id: string;
  customer_contract_id: string | null;
  customer_contract_version: number | null;
  carrier_contract_id: string | null;
  carrier_contract_version: number | null;
  snapshot_id: string | null;
  sell_total_excl: number;
  buy_total_excl: number;
  sell_breakdown_json: Record<string, unknown>;
  buy_breakdown_json: Record<string, unknown>;
  warnings_json: unknown[];
  is_locked: boolean;
  rerate_required: boolean;
  created_at: string;
  created_by: string | null;
  // Computed
  margin_amount?: number;
  margin_percent?: number;
  // Joined
  order?: { order_number: string; customer_id: string };
  customer_contract?: RateContract;
}

export const useRateContractEngine = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  // Fetch zones
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["zones", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zones")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Zone[];
    },
    enabled: !!company?.id,
  });

  // Fetch rate contracts
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["rate_contracts", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RateContract[];
    },
    enabled: !!company?.id,
  });

  // Fetch accessorials
  const { data: accessorials = [], isLoading: accessorialsLoading } = useQuery({
    queryKey: ["accessorials", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accessorials")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as Accessorial[];
    },
    enabled: !!company?.id,
  });

  // Fetch surcharge rules
  const { data: surchargeRules = [], isLoading: surchargeRulesLoading } = useQuery({
    queryKey: ["surcharge_rules", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surcharge_rules")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as SurchargeRule[];
    },
    enabled: !!company?.id,
  });

  // Fetch rating results
  const { data: ratingResults = [], isLoading: ratingResultsLoading } = useQuery({
    queryKey: ["rating_results", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rating_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as RatingResult[];
    },
    enabled: !!company?.id,
  });

  // ============== ZONE MUTATIONS ==============

  // Create zone mutation
  const createZone = useMutation({
    mutationFn: async (zone: Partial<Zone>) => {
      const { data, error } = await supabase
        .from("zones")
        .insert({ 
          name: zone.name || '', 
          match_type: zone.match_type || 'city', 
          match_rules_json: zone.match_rules_json || {},
          is_active: zone.is_active ?? true,
          tenant_id: company?.id! 
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast({ title: "Zone aangemaakt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij aanmaken zone", description: error.message, variant: "destructive" });
    },
  });

  // Update zone mutation
  const updateZone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Zone> & { id: string }) => {
      const updatePayload: Record<string, unknown> = {};
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.match_type !== undefined) updatePayload.match_type = updates.match_type;
      if (updates.match_rules_json !== undefined) updatePayload.match_rules_json = updates.match_rules_json as unknown;
      if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;
      
      const { data, error } = await supabase
        .from("zones")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast({ title: "Zone bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij bijwerken zone", description: error.message, variant: "destructive" });
    },
  });

  // Delete zone mutation
  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("zones")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast({ title: "Zone verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij verwijderen zone", description: error.message, variant: "destructive" });
    },
  });

  // Duplicate zone mutation
  const duplicateZone = useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await supabase
        .from("zones")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("zones")
        .insert({
          name: `${original.name} (kopie)`,
          match_type: original.match_type,
          match_rules_json: original.match_rules_json,
          is_active: true,
          tenant_id: company?.id!,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zones"] });
      toast({ title: "Zone gekopieerd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij kopiëren zone", description: error.message, variant: "destructive" });
    },
  });

  // ============== CONTRACT MUTATIONS ==============

  // Create contract mutation
  const createContract = useMutation({
    mutationFn: async (contract: Partial<RateContract>) => {
      const { data, error } = await supabase
        .from("rate_contracts")
        .insert({
          name: contract.name || '',
          contract_type: contract.contract_type || 'customer',
          counterparty_id: contract.counterparty_id || '',
          effective_from: contract.effective_from || new Date().toISOString(),
          effective_to: contract.effective_to || null,
          currency: contract.currency || 'EUR',
          status: 'draft',
          approval_status: 'pending',
          version: 1,
          tenant_id: company?.id!
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Contract aangemaakt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij aanmaken contract", description: error.message, variant: "destructive" });
    },
  });

  // Update contract mutation
  const updateContract = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RateContract> & { id: string }) => {
      const { data, error } = await supabase
        .from("rate_contracts")
        .update({
          name: updates.name,
          contract_type: updates.contract_type,
          counterparty_id: updates.counterparty_id,
          effective_from: updates.effective_from,
          effective_to: updates.effective_to,
          currency: updates.currency,
          status: updates.status,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Contract bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij bijwerken contract", description: error.message, variant: "destructive" });
    },
  });

  // Delete contract mutation
  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("rate_contracts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Contract verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij verwijderen contract", description: error.message, variant: "destructive" });
    },
  });

  // Duplicate contract mutation
  const duplicateContract = useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await supabase
        .from("rate_contracts")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("rate_contracts")
        .insert({
          name: `${original.name} (kopie)`,
          contract_type: original.contract_type,
          counterparty_id: original.counterparty_id,
          effective_from: original.effective_from,
          effective_to: original.effective_to,
          currency: original.currency,
          status: 'draft',
          approval_status: 'pending',
          version: 1,
          tenant_id: company?.id!,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Contract gekopieerd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij kopiëren contract", description: error.message, variant: "destructive" });
    },
  });

  // Update contract status
  const updateContractStatus = useMutation({
    mutationFn: async ({ id, status, approval_status }: { id: string; status?: string; approval_status?: string }) => {
      const updates: Record<string, unknown> = {};
      if (status) updates.status = status;
      if (approval_status) updates.approval_status = approval_status;
      if (approval_status === 'approved') {
        updates.approved_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from("rate_contracts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Contract bijgewerkt" });
    },
  });

  // ============== ACCESSORIAL MUTATIONS ==============

  // Create accessorial mutation
  const createAccessorial = useMutation({
    mutationFn: async (accessorial: Partial<Accessorial>) => {
      const { data, error } = await supabase
        .from("accessorials")
        .insert({
          code: accessorial.code || '',
          name: accessorial.name || '',
          applies_to: accessorial.applies_to || 'both',
          calc_type: accessorial.calc_type || 'fixed',
          amount: accessorial.amount || 0,
          tax_code: accessorial.tax_code || null,
          requires_proof: accessorial.requires_proof ?? false,
          is_active: accessorial.is_active ?? true,
          tenant_id: company?.id!
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessorials"] });
      toast({ title: "Toeslag aangemaakt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij aanmaken toeslag", description: error.message, variant: "destructive" });
    },
  });

  // Update accessorial mutation
  const updateAccessorial = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Accessorial> & { id: string }) => {
      const { data, error } = await supabase
        .from("accessorials")
        .update({
          code: updates.code,
          name: updates.name,
          applies_to: updates.applies_to,
          calc_type: updates.calc_type,
          amount: updates.amount,
          tax_code: updates.tax_code,
          requires_proof: updates.requires_proof,
          is_active: updates.is_active,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessorials"] });
      toast({ title: "Toeslag bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij bijwerken toeslag", description: error.message, variant: "destructive" });
    },
  });

  // Delete accessorial mutation
  const deleteAccessorial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accessorials")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessorials"] });
      toast({ title: "Toeslag verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij verwijderen toeslag", description: error.message, variant: "destructive" });
    },
  });

  // Duplicate accessorial mutation
  const duplicateAccessorial = useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchError } = await supabase
        .from("accessorials")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from("accessorials")
        .insert({
          code: `${original.code}_COPY`,
          name: `${original.name} (kopie)`,
          applies_to: original.applies_to,
          calc_type: original.calc_type,
          amount: original.amount,
          tax_code: original.tax_code,
          requires_proof: original.requires_proof,
          is_active: true,
          tenant_id: company?.id!,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessorials"] });
      toast({ title: "Toeslag gekopieerd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij kopiëren toeslag", description: error.message, variant: "destructive" });
    },
  });

  // ============== RATE LANE MUTATIONS ==============

  // Fetch rate lanes for a specific contract
  const useContractLanes = (contractId: string | null) => {
    return useQuery({
      queryKey: ["rate_lanes", contractId],
      queryFn: async () => {
        if (!contractId) return [];
        const { data, error } = await supabase
          .from("rate_lanes")
          .select(`
            *,
            origin_zone:zones!rate_lanes_origin_zone_id_fkey(id, name),
            destination_zone:zones!rate_lanes_destination_zone_id_fkey(id, name)
          `)
          .eq("contract_id", contractId)
          .order("priority");
        if (error) throw error;
        return data as RateLane[];
      },
      enabled: !!contractId,
    });
  };

  // Create rate lane mutation
  const createRateLane = useMutation({
    mutationFn: async (lane: Partial<RateLane> & { contract_id: string }) => {
      const insertData = {
        contract_id: lane.contract_id,
        origin_zone_id: lane.origin_zone_id || null,
        destination_zone_id: lane.destination_zone_id || null,
        service_level: lane.service_level || 'standard',
        vehicle_type: lane.vehicle_type || null,
        base_price: lane.base_price || 0,
        base_included_km: lane.base_included_km || 0,
        min_charge: lane.min_charge || 0,
        price_per_km: lane.price_per_km || 0,
        price_per_stop: lane.price_per_stop || 0,
        time_window_fee: lane.time_window_fee || 0,
        weekend_fee: lane.weekend_fee || 0,
        night_fee: lane.night_fee || 0,
        rounding_rule: lane.rounding_rule || 'none',
        grace_minutes_waiting: lane.grace_minutes_waiting || 15,
        waiting_tiers_json: lane.waiting_tiers_json || [],
        priority: lane.priority || 100,
        is_active: lane.is_active ?? true,
      };
      const { data, error } = await supabase
        .from("rate_lanes")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rate_lanes", variables.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Tariefroute aangemaakt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij aanmaken tariefroute", description: error.message, variant: "destructive" });
    },
  });

  // Update rate lane mutation
  const updateRateLane = useMutation({
    mutationFn: async ({ id, contract_id, ...updates }: Partial<RateLane> & { id: string; contract_id: string }) => {
      const { data, error } = await supabase
        .from("rate_lanes")
        .update({
          origin_zone_id: updates.origin_zone_id,
          destination_zone_id: updates.destination_zone_id,
          service_level: updates.service_level,
          vehicle_type: updates.vehicle_type,
          base_price: updates.base_price,
          base_included_km: updates.base_included_km,
          min_charge: updates.min_charge,
          price_per_km: updates.price_per_km,
          price_per_stop: updates.price_per_stop,
          time_window_fee: updates.time_window_fee,
          weekend_fee: updates.weekend_fee,
          night_fee: updates.night_fee,
          rounding_rule: updates.rounding_rule,
          grace_minutes_waiting: updates.grace_minutes_waiting,
          priority: updates.priority,
          is_active: updates.is_active,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rate_lanes", variables.contract_id] });
      toast({ title: "Tariefroute bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij bijwerken tariefroute", description: error.message, variant: "destructive" });
    },
  });

  // Delete rate lane mutation
  const deleteRateLane = useMutation({
    mutationFn: async ({ id, contract_id }: { id: string; contract_id: string }) => {
      const { error } = await supabase
        .from("rate_lanes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { contract_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["rate_lanes", result.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["rate_contracts"] });
      toast({ title: "Tariefroute verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout bij verwijderen tariefroute", description: error.message, variant: "destructive" });
    },
  });

  return {
    // Data
    zones,
    zonesLoading,
    contracts,
    contractsLoading,
    accessorials,
    accessorialsLoading,
    surchargeRules,
    surchargeRulesLoading,
    ratingResults,
    ratingResultsLoading,
    
    // Zone mutations
    createZone,
    updateZone,
    deleteZone,
    duplicateZone,
    
    // Contract mutations
    createContract,
    updateContract,
    deleteContract,
    duplicateContract,
    updateContractStatus,
    
    // Accessorial mutations
    createAccessorial,
    updateAccessorial,
    deleteAccessorial,
    duplicateAccessorial,
    
    // Rate lane hooks & mutations
    useContractLanes,
    createRateLane,
    updateRateLane,
    deleteRateLane,
    
    // Loading state
    isLoading: zonesLoading || contractsLoading || accessorialsLoading,
  };
};

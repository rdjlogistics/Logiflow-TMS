import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

// Types
export interface PricingRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  rule_type: 'base' | 'surge' | 'discount' | 'minimum' | 'maximum';
  priority: number;
  is_active: boolean;
  conditions_json: Json;
  adjustment_type: 'percentage' | 'fixed' | 'per_km' | 'per_hour';
  adjustment_value: number;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurgeFactor {
  id: string;
  tenant_id: string;
  factor_type: 'demand' | 'capacity' | 'fuel' | 'weather' | 'event' | 'manual';
  name: string;
  description: string | null;
  applies_to_regions: string[] | null;
  applies_to_countries: string[];
  multiplier: number;
  active_from: string;
  active_until: string | null;
  is_active: boolean;
  is_auto_calculated: boolean;
  created_at: string;
}

export interface LanePricing {
  id: string;
  tenant_id: string;
  lane_id: string | null;
  customer_id: string | null;
  origin_region: string | null;
  destination_region: string | null;
  base_rate: number;
  rate_per_km: number;
  rate_per_hour: number;
  minimum_charge: number;
  vehicle_rates_json: Record<string, number>;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
}

export interface MarketDemand {
  id: string;
  region: string;
  direction: 'inbound' | 'outbound' | 'both';
  demand_score: number;
  capacity_score: number;
  balance_ratio: number;
  suggested_multiplier: number;
  avg_price_per_km: number | null;
  recorded_at: string;
}

export interface PriceCalculation {
  id: string;
  origin_city: string;
  destination_city: string;
  distance_km: number;
  base_price: number;
  lane_adjustment: number;
  surge_adjustment: number;
  discount_adjustment: number;
  calculated_price: number;
  rules_applied_json: unknown[];
  surge_factors_json: unknown[];
  calculated_at: string;
}

export interface CalculatePriceInput {
  origin_city: string;
  destination_city: string;
  distance_km: number;
  vehicle_type?: string;
  customer_id?: string;
  pickup_date?: string;
}

// Hooks
export function usePricingRules() {
  return useQuery({
    queryKey: ["pricing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .order("priority", { ascending: true });
      
      if (error) throw error;
      return data as PricingRule[];
    },
  });
}

export function useSurgeFactors() {
  return useQuery({
    queryKey: ["surge-factors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surge_factors")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SurgeFactor[];
    },
  });
}

export function useActiveSurgeFactors() {
  return useQuery({
    queryKey: ["surge-factors", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surge_factors")
        .select("*")
        .eq("is_active", true)
        .or(`active_until.is.null,active_until.gte.${new Date().toISOString()}`);
      
      if (error) throw error;
      return data as SurgeFactor[];
    },
  });
}

export function useLanePricing() {
  return useQuery({
    queryKey: ["lane-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lane_pricing")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as LanePricing[];
    },
  });
}

export function useMarketDemand() {
  return useQuery({
    queryKey: ["market-demand"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_demand")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as MarketDemand[];
    },
  });
}

export function usePriceHistory(limit = 20) {
  return useQuery({
    queryKey: ["price-calculations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_calculations")
        .select("*")
        .order("calculated_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as PriceCalculation[];
    },
  });
}

// Mutations
export function useCreatePricingRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rule: Partial<PricingRule>) => {
      // Get user's company
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      
      const { data: userCompany } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userData.user.id)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();
      
      if (!userCompany) throw new Error("No company found");

      const insertData = {
        name: rule.name || 'Nieuwe regel',
        tenant_id: userCompany.company_id,
        created_by: userData.user.id,
        rule_type: rule.rule_type || 'base',
        adjustment_type: rule.adjustment_type || 'percentage',
        adjustment_value: rule.adjustment_value || 0,
        priority: rule.priority || 100,
        is_active: rule.is_active ?? true,
        description: rule.description || null,
        conditions_json: rule.conditions_json || {},
      };

      const { data, error } = await supabase
        .from("pricing_rules")
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast({ title: "Regel aangemaakt", description: "De prijsregel is succesvol toegevoegd." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingRule> & { id: string }) => {
      const { data, error } = await supabase
        .from("pricing_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast({ title: "Regel bijgewerkt", description: "De prijsregel is succesvol aangepast." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useCreateSurgeFactor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (factor: Partial<SurgeFactor>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      
      const { data: userCompany } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userData.user.id)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();
      
      if (!userCompany) throw new Error("No company found");

      const insertData = {
        name: factor.name || 'Nieuwe factor',
        factor_type: factor.factor_type || 'manual',
        tenant_id: userCompany.company_id,
        multiplier: factor.multiplier || 1.0,
        description: factor.description || null,
        applies_to_regions: factor.applies_to_regions || null,
        applies_to_countries: factor.applies_to_countries || ['NL', 'BE', 'DE'],
        is_active: factor.is_active ?? true,
        is_auto_calculated: factor.is_auto_calculated ?? false,
      };

      const { data, error } = await supabase
        .from("surge_factors")
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surge-factors"] });
      toast({ title: "Surge factor aangemaakt", description: "De factor is succesvol toegevoegd." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pricing_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast({ title: "Regel verwijderd", description: "De prijsregel is succesvol verwijderd." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteSurgeFactor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("surge_factors")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surge-factors"] });
      toast({ title: "Factor verwijderd", description: "De surge factor is succesvol verwijderd." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useToggleSurgeFactor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("surge_factors")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["surge-factors"] });
      toast({ 
        title: data.is_active ? "Factor geactiveerd" : "Factor gedeactiveerd",
        description: `${data.name} is nu ${data.is_active ? 'actief' : 'inactief'}.`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

// Calculate price using edge function
export function useCalculatePrice() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CalculatePriceInput) => {
      const { data, error } = await supabase.functions.invoke("calculate-price", {
        body: input,
      });
      
      if (error) throw error;
      return data as {
        base_price: number;
        adjustments: Array<{ name: string; type: string; value: number }>;
        surge_multiplier: number;
        final_price: number;
        breakdown: {
          distance_charge: number;
          base_charge: number;
          surge_charge: number;
          discounts: number;
        };
      };
    },
    onError: (error: Error) => {
      toast({ title: "Berekeningsfout", description: error.message, variant: "destructive" });
    },
  });
}

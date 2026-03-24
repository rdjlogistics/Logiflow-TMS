import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface CarrierScorecard {
  id: string;
  company_id: string;
  carrier_id: string;
  otif_percentage: number | null;
  accept_rate: number | null;
  on_time_pickups: number | null;
  on_time_deliveries: number | null;
  claims_count: number | null;
  no_show_rate: number | null;
  total_tenders: number | null;
  accepted_tenders: number | null;
  completed_orders: number | null;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
  carrier?: {
    id: string;
    company_name: string;
    email: string | null;
    phone: string | null;
    rating: number | null;
  };
}

export const useCarrierScorecards = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['carrier-scorecards', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('carrier_scorecards')
        .select(`
          *,
          carriers (
            id,
            company_name,
            email,
            phone,
            rating
          )
        `)
        .eq('company_id', company.id)
        .order('otif_percentage', { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      return (data || []).map(scorecard => ({
        ...scorecard,
        carrier: scorecard.carriers
      }));
    },
    enabled: !!company?.id
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Geen bedrijf geselecteerd");
      
      const { data: carriers } = await supabase
        .from('carriers')
        .select('id')
        .eq('is_active', true);
      
      for (const carrier of carriers || []) {
        const { data: trips } = await supabase
          .from('trips')
          .select('id, status, actual_arrival, estimated_arrival')
          .eq('carrier_id', carrier.id)
          .eq('company_id', company.id);
        
        const totalOrders = trips?.length || 0;
        const completedOrders = trips?.filter(t => ['afgerond', 'gecontroleerd', 'gefactureerd'].includes(t.status)).length || 0;
        const onTimeDeliveries = trips?.filter(t => {
          if (!t.actual_arrival || !t.estimated_arrival) return false;
          return new Date(t.actual_arrival) <= new Date(t.estimated_arrival);
        }).length || 0;
        
        const otifPercentage = totalOrders > 0 ? Math.round((onTimeDeliveries / totalOrders) * 100) : null;
        
        // @ts-ignore - Supabase types too deep
        const { data: tenders } = await supabase
          .from('tenders')
          .select('id, status')
          .eq('carrier_id', carrier.id);
        
        const totalTenders = tenders?.length || 0;
        const acceptedTenders = tenders?.filter(t => t.status === 'accepted').length || 0;
        const acceptRate = totalTenders > 0 ? Math.round((acceptedTenders / totalTenders) * 100) : null;

        const { data: existing } = await supabase
          .from('carrier_scorecards')
          .select('id')
          .eq('company_id', company.id)
          .eq('carrier_id', carrier.id)
          .maybeSingle();

        if (existing) {
          await supabase.from('carrier_scorecards').update({
            otif_percentage: otifPercentage,
            accept_rate: acceptRate,
            on_time_deliveries: onTimeDeliveries,
            completed_orders: completedOrders,
            last_calculated_at: new Date().toISOString()
          }).eq('id', existing.id);
        } else {
          await supabase.from('carrier_scorecards').insert({
            company_id: company.id,
            carrier_id: carrier.id,
            otif_percentage: otifPercentage,
            accept_rate: acceptRate,
            on_time_deliveries: onTimeDeliveries,
            completed_orders: completedOrders,
            last_calculated_at: new Date().toISOString()
          });
        }
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-scorecards'] });
      toast({ title: "Scorecards herberekend", description: "Alle carrier scorecards zijn succesvol bijgewerkt." });
    },
    onError: (error) => {
      toast({ title: "Fout bij herberekenen", description: error.message, variant: "destructive" });
    }
  });

  const overallStats = {
    averageOtif: query.data?.length ? Math.round(query.data.reduce((acc, s) => acc + (s.otif_percentage || 0), 0) / query.data.length) : 0,
    averageAcceptRate: query.data?.length ? Math.round(query.data.reduce((acc, s) => acc + (s.accept_rate || 0), 0) / query.data.length) : 0,
    totalClaims: query.data?.reduce((acc, s) => acc + (s.claims_count || 0), 0) || 0,
    activeCarriers: query.data?.length || 0
  };

  return {
    scorecards: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    recalculate: recalculateMutation.mutate,
    isRecalculating: recalculateMutation.isPending,
    overallStats
  };
};

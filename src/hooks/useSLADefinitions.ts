import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

// Match the actual database schema
export interface SLADefinition {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  name: string;
  description: string | null;
  metric_type: string;
  target_value: number;
  target_unit: string;
  bonus_threshold: number | null;
  bonus_amount: number | null;
  measurement_period: string | null;
  is_active: boolean | null;
  penalty_amount: number | null;
  penalty_type: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    company_name: string;
  } | null;
}

export interface CreateSLADefinitionData {
  name: string;
  description?: string;
  metric_type: string;
  target_value: number;
  target_unit: string;
  bonus_threshold?: number;
  bonus_amount?: number;
  measurement_period?: string;
  customer_id?: string;
  penalty_amount?: number;
  penalty_type?: string;
  is_active?: boolean;
}

export const useSLADefinitions = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sla-definitions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('sla_definitions')
        .select(`
          *,
          customers (
            id,
            company_name
          )
        `)
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(sla => ({
        ...sla,
        customer: sla.customers
      })) as SLADefinition[];
    },
    enabled: !!company?.id
  });

  const createMutation = useMutation({
    mutationFn: async (slaData: CreateSLADefinitionData) => {
      if (!company?.id) throw new Error("Geen bedrijf geselecteerd");
      
      const { data, error } = await supabase
        .from('sla_definitions')
        .insert({
          tenant_id: company.id,
          name: slaData.name,
          description: slaData.description || null,
          metric_type: slaData.metric_type,
          target_value: slaData.target_value,
          target_unit: slaData.target_unit || 'percentage',
          bonus_threshold: slaData.bonus_threshold || null,
          bonus_amount: slaData.bonus_amount || null,
          measurement_period: slaData.measurement_period || 'monthly',
          customer_id: slaData.customer_id || null,
          penalty_amount: slaData.penalty_amount || null,
          penalty_type: slaData.penalty_type || null,
          is_active: slaData.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-definitions'] });
      toast({
        title: "SLA aangemaakt",
        description: "De SLA definitie is succesvol opgeslagen."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij aanmaken",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SLADefinition> & { id: string }) => {
      // Remove the customer relation from updates
      const { customer, ...dbUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('sla_definitions')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-definitions'] });
      toast({
        title: "SLA bijgewerkt",
        description: "De SLA definitie is succesvol bijgewerkt."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (slaId: string) => {
      const { error } = await supabase
        .from('sla_definitions')
        .delete()
        .eq('id', slaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-definitions'] });
      toast({
        title: "SLA verwijderd",
        description: "De SLA definitie is succesvol verwijderd."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('sla_definitions')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sla-definitions'] });
      toast({
        title: data.is_active ? "SLA geactiveerd" : "SLA gedeactiveerd",
        description: `De SLA "${data.name}" is nu ${data.is_active ? 'actief' : 'inactief'}.`
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij wijzigen status",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return {
    slaDefinitions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createSLA: createMutation.mutate,
    updateSLA: updateMutation.mutate,
    deleteSLA: deleteMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};

// Hook to calculate SLA performance from actual trip data
export const useSLAPerformance = () => {
  const { company } = useCompany();
  const { slaDefinitions } = useSLADefinitions();

  return useQuery({
    queryKey: ['sla-performance', company?.id, slaDefinitions],
    queryFn: async () => {
      if (!company?.id || !slaDefinitions.length) return [];
      
      // Get trips for performance calculation
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: trips, error } = await supabase
        .from('trips')
        .select('id, status, customer_id, trip_date, actual_arrival, estimated_arrival')
        .eq('company_id', company.id)
        .gte('trip_date', thirtyDaysAgo.toISOString());
      
      if (error) throw error;
      
      // Calculate performance for each SLA
      return slaDefinitions.map(sla => {
        let relevantTrips = trips || [];
        
        // Filter by customer if SLA is customer-specific
        if (sla.customer_id) {
          relevantTrips = relevantTrips.filter(t => t.customer_id === sla.customer_id);
        }
        
        let currentValue = 0;
        const totalTrips = relevantTrips.length;
        
        if (totalTrips === 0) {
          return {
            sla,
            currentValue: null,
            status: 'no_data' as const,
            breachCount: 0,
            totalMeasurements: 0
          };
        }
        
        // Calculate based on metric type
        switch (sla.metric_type) {
          case 'on_time_delivery':
          case 'otif':
            const onTimeCount = relevantTrips.filter(t => {
              if (!t.actual_arrival || !t.estimated_arrival) return false;
              return new Date(t.actual_arrival) <= new Date(t.estimated_arrival);
            }).length;
            currentValue = Math.round((onTimeCount / totalTrips) * 100);
            break;
          
          case 'completion_rate':
            // Use correct trip_status enum: gepland, onderweg, afgerond, geannuleerd
            const completedCount = relevantTrips.filter(t => ['afgerond', 'gecontroleerd', 'gefactureerd'].includes(t.status)).length;
            currentValue = Math.round((completedCount / totalTrips) * 100);
            break;
          
          default:
            currentValue = 0;
        }
        
        // Determine status based on bonus_threshold (used as warning) and target_value
        let status: 'ok' | 'warning' | 'at_risk' | 'critical' = 'ok';
        const warningLevel = sla.bonus_threshold ? sla.bonus_threshold * 0.8 : sla.target_value * 0.9;
        const criticalLevel = sla.target_value * 0.7;
        
        if (currentValue < criticalLevel) {
          status = 'critical';
        } else if (currentValue < warningLevel) {
          status = 'warning';
        } else if (currentValue < sla.target_value) {
          status = 'at_risk';
        }
        
        const breachCount = currentValue < sla.target_value ? 1 : 0;
        
        return {
          sla,
          currentValue,
          status,
          breachCount,
          totalMeasurements: totalTrips
        };
      });
    },
    enabled: !!company?.id && slaDefinitions.length > 0
  });
};

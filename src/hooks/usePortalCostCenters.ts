import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface PortalCostCenter {
  id: string;
  tenant_id: string;
  customer_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  budget_limit: number | null;
  current_spend: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCostCenterData {
  customer_id: string;
  code: string;
  name: string;
  description?: string;
  budget_limit?: number;
  is_active?: boolean;
}

export const usePortalCostCenters = (customerId?: string) => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['portal-cost-centers', company?.id, customerId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let queryBuilder = supabase
        .from('portal_cost_centers')
        .select('*')
        .eq('tenant_id', company.id)
        .order('code', { ascending: true });
      
      if (customerId) {
        queryBuilder = queryBuilder.eq('customer_id', customerId);
      }
      
      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id
  });

  const createMutation = useMutation({
    mutationFn: async (costCenterData: CreateCostCenterData) => {
      if (!company?.id) throw new Error("Geen bedrijf geselecteerd");
      
      const { data, error } = await supabase
        .from('portal_cost_centers')
        .insert({
          tenant_id: company.id,
          customer_id: costCenterData.customer_id,
          code: costCenterData.code,
          name: costCenterData.name,
          description: costCenterData.description || null,
          budget_limit: costCenterData.budget_limit || null,
          is_active: costCenterData.is_active ?? true,
          current_spend: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-cost-centers'] });
      toast({
        title: "Kostenplaats aangemaakt",
        description: "De kostenplaats is succesvol opgeslagen."
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
    mutationFn: async ({ id, ...updates }: Partial<PortalCostCenter> & { id: string }) => {
      const { data, error } = await supabase
        .from('portal_cost_centers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-cost-centers'] });
      toast({
        title: "Kostenplaats bijgewerkt",
        description: "De kostenplaats is succesvol bijgewerkt."
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
    mutationFn: async (costCenterId: string) => {
      const { error } = await supabase
        .from('portal_cost_centers')
        .delete()
        .eq('id', costCenterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-cost-centers'] });
      toast({
        title: "Kostenplaats verwijderd",
        description: "De kostenplaats is succesvol verwijderd."
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

  const updateSpendMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: current, error: fetchError } = await supabase
        .from('portal_cost_centers')
        .select('current_spend')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data, error } = await supabase
        .from('portal_cost_centers')
        .update({ current_spend: (current.current_spend || 0) + amount })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-cost-centers'] });
    }
  });

  return {
    costCenters: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createCostCenter: createMutation.mutate,
    updateCostCenter: updateMutation.mutate,
    deleteCostCenter: deleteMutation.mutate,
    updateSpend: updateSpendMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};

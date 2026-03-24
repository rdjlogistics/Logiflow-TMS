import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface CarrierPoolMember {
  id: string;
  pool_id: string;
  carrier_id: string;
  priority: number | null;
  created_at: string;
  carrier?: {
    id: string;
    company_name: string;
    rating: number | null;
  };
}

export interface CarrierPool {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  priority: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  carrier_pool_members?: CarrierPoolMember[];
}

export interface CreateCarrierPoolData {
  name: string;
  description?: string;
  priority?: number;
  is_active?: boolean;
}

export interface AddCarrierToPoolData {
  pool_id: string;
  carrier_id: string;
  priority?: number;
}

export const useCarrierPools = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['carrier-pools', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('carrier_pools')
        .select(`
          *,
          carrier_pool_members (
            id,
            carrier_id,
            priority,
            created_at,
            carriers (
              id,
              company_name,
              rating
            )
          )
        `)
        .eq('company_id', company.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      
      // Transform nested carriers data
      return (data || []).map(pool => ({
        ...pool,
        carrier_pool_members: pool.carrier_pool_members?.map((member: any) => ({
          ...member,
          carrier: member.carriers
        }))
      }));
    },
    enabled: !!company?.id
  });

  const createMutation = useMutation({
    mutationFn: async (poolData: CreateCarrierPoolData) => {
      if (!company?.id) throw new Error("Geen bedrijf geselecteerd");
      
      const { data, error } = await supabase
        .from('carrier_pools')
        .insert({
          company_id: company.id,
          name: poolData.name,
          description: poolData.description || null,
          priority: poolData.priority || 0,
          is_active: poolData.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-pools'] });
      toast({
        title: "Pool aangemaakt",
        description: "De carrier pool is succesvol aangemaakt."
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
    mutationFn: async ({ id, ...updates }: Partial<CarrierPool> & { id: string }) => {
      const { data, error } = await supabase
        .from('carrier_pools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-pools'] });
      toast({
        title: "Pool bijgewerkt",
        description: "De carrier pool is succesvol bijgewerkt."
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
    mutationFn: async (poolId: string) => {
      const { error } = await supabase
        .from('carrier_pools')
        .delete()
        .eq('id', poolId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-pools'] });
      toast({
        title: "Pool verwijderd",
        description: "De carrier pool is succesvol verwijderd."
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

  const addCarrierMutation = useMutation({
    mutationFn: async (data: AddCarrierToPoolData) => {
      const { data: result, error } = await supabase
        .from('carrier_pool_members')
        .insert({
          pool_id: data.pool_id,
          carrier_id: data.carrier_id,
          priority: data.priority || 0
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-pools'] });
      toast({
        title: "Carrier toegevoegd",
        description: "De carrier is succesvol aan de pool toegevoegd."
      });
    },
    onError: (error) => {
      toast({
        title: "Fout bij toevoegen",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const removeCarrierMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('carrier_pool_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-pools'] });
      toast({
        title: "Carrier verwijderd",
        description: "De carrier is succesvol uit de pool verwijderd."
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

  return {
    pools: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createPool: createMutation.mutate,
    updatePool: updateMutation.mutate,
    deletePool: deleteMutation.mutate,
    addCarrier: addCarrierMutation.mutate,
    removeCarrier: removeCarrierMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};

// Hook to get available carriers (not in any pool or for adding to pools)
export const useAvailableCarriers = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ['available-carriers', company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carriers')
        .select('id, company_name, rating')
        .eq('is_active', true)
        .order('company_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id
  });
};

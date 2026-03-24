import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { useToast } from './use-toast';

export type PenaltyType = 'late_pickup' | 'late_delivery' | 'damage' | 'documentation' | 'other';
export type PenaltyStatus = 'pending' | 'approved' | 'invoiced' | 'waived' | 'disputed';

export interface SLAPenalty {
  id: string;
  tenant_id: string;
  customer_id: string;
  trip_id: string | null;
  penalty_type: PenaltyType;
  description: string;
  amount: number;
  currency: string;
  status: PenaltyStatus;
  sla_target: string | null;
  actual_value: string | null;
  deviation_minutes: number | null;
  auto_calculated: boolean;
  approved_by: string | null;
  approved_at: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export const PENALTY_TYPES = [
  { value: 'late_pickup', label: 'Te laat ophalen', defaultAmount: 50 },
  { value: 'late_delivery', label: 'Te laat afleveren', defaultAmount: 75 },
  { value: 'damage', label: 'Schade', defaultAmount: 0 },
  { value: 'documentation', label: 'Documentatie onvolledig', defaultAmount: 25 },
  { value: 'other', label: 'Overig', defaultAmount: 0 },
] as const;

export function useSLAPenalties(customerId?: string) {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: penalties = [], isLoading } = useQuery({
    queryKey: ['sla-penalties', company?.id, customerId],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('sla_penalties')
        .select('*')
        .eq('tenant_id', company.id)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SLAPenalty[];
    },
    enabled: !!company?.id,
  });

  const createPenalty = useMutation({
    mutationFn: async (penalty: Omit<SLAPenalty, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at' | 'invoice_id'>) => {
      if (!company?.id) throw new Error('No company');
      
      const { data, error } = await supabase
        .from('sla_penalties')
        .insert({ ...penalty, tenant_id: company.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-penalties'] });
      toast({ title: 'Boete aangemaakt', description: 'De SLA boete is succesvol geregistreerd.' });
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Boete kon niet worden aangemaakt.', variant: 'destructive' });
    },
  });

  const approvePenalty = useMutation({
    mutationFn: async (penaltyId: string) => {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('sla_penalties')
        .update({ 
          status: 'approved',
          approved_by: user.data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', penaltyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-penalties'] });
      toast({ title: 'Boete goedgekeurd' });
    },
  });

  const waivePenalty = useMutation({
    mutationFn: async ({ penaltyId, reason }: { penaltyId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('sla_penalties')
        .update({ 
          status: 'waived',
          description: reason,
        })
        .eq('id', penaltyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-penalties'] });
      toast({ title: 'Boete kwijtgescholden' });
    },
  });

  const disputePenalty = useMutation({
    mutationFn: async ({ penaltyId, reason }: { penaltyId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('sla_penalties')
        .update({ 
          status: 'disputed',
          description: reason,
        })
        .eq('id', penaltyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-penalties'] });
      toast({ title: 'Boete betwist', description: 'De boete is gemarkeerd als betwist.' });
    },
  });

  // Auto-calculate penalties based on trip data
  const calculatePenaltiesForTrip = async (tripId: string) => {
    if (!company?.id) return [];

    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .select('*, stops:route_stops(*), customer:customers(payment_terms, sla_settings)')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      if (!trip) return [];

      const calculatedPenalties: Partial<SLAPenalty>[] = [];
      const customer = trip.customer as any;
      const slaSettings = customer?.sla_settings || {};

      // Check for late delivery
      const deliveryStop = (trip.stops as any[])?.find(s => s.stop_type === 'delivery');
      if (deliveryStop?.actual_arrival_at && deliveryStop?.scheduled_at) {
        const scheduledTime = new Date(deliveryStop.scheduled_at).getTime();
        const actualTime = new Date(deliveryStop.actual_arrival_at).getTime();
        const deviationMinutes = Math.round((actualTime - scheduledTime) / (1000 * 60));
        
        const gracePeriod = slaSettings.late_delivery_grace_minutes || 30;
        const penaltyPerHour = slaSettings.late_delivery_penalty_per_hour || 25;

        if (deviationMinutes > gracePeriod) {
          const excessMinutes = deviationMinutes - gracePeriod;
          const amount = Math.ceil(excessMinutes / 60) * penaltyPerHour;

          calculatedPenalties.push({
            customer_id: trip.customer_id ?? undefined,
            trip_id: tripId,
            penalty_type: 'late_delivery',
            description: `Aflevering ${deviationMinutes} minuten te laat (SLA: ${gracePeriod} min gratie)`,
            amount,
            currency: 'EUR',
            status: 'pending',
            sla_target: `${gracePeriod} minuten`,
            actual_value: `${deviationMinutes} minuten`,
            deviation_minutes: deviationMinutes,
            auto_calculated: true,
          });
        }
      }

      return calculatedPenalties;
    } catch (err) {
      console.error('Error calculating penalties:', err);
      return [];
    }
  };

  const stats = {
    total: penalties.length,
    pending: penalties.filter(p => p.status === 'pending').length,
    approved: penalties.filter(p => p.status === 'approved').length,
    invoiced: penalties.filter(p => p.status === 'invoiced').length,
    disputed: penalties.filter(p => p.status === 'disputed').length,
    totalAmount: penalties.reduce((sum, p) => sum + (p.status !== 'waived' ? p.amount : 0), 0),
    pendingAmount: penalties.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
  };

  return {
    penalties,
    isLoading,
    stats,
    createPenalty,
    approvePenalty,
    waivePenalty,
    disputePenalty,
    calculatePenaltiesForTrip,
    PENALTY_TYPES,
  };
}

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FuelLog {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  trip_id: string | null;
  tenant_id: string | null;
  log_date: string;
  liters: number;
  price_per_liter: number | null;
  total_cost: number | null;
  mileage_at_fill: number | null;
  station_name: string | null;
  station_location: string | null;
  fuel_card_number: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface FuelStats {
  totalLiters: number;
  totalCost: number;
  avgPricePerLiter: number;
  avgConsumption: number | null; // liters per 100km
  logsCount: number;
}

export function useFuelLogs(vehicleId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['fuel-logs', vehicleId],
    queryFn: async () => {
      let query = supabase
        .from('fuel_logs')
        .select('*')
        .order('log_date', { ascending: false });

      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as FuelLog[];
    },
    enabled: true,
  });

  const stats: FuelStats = {
    totalLiters: logs.reduce((sum, log) => sum + log.liters, 0),
    totalCost: logs.reduce((sum, log) => sum + (log.total_cost || 0), 0),
    avgPricePerLiter: logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.price_per_liter || 0), 0) / logs.filter(l => l.price_per_liter).length
      : 0,
    avgConsumption: calculateAvgConsumption(logs),
    logsCount: logs.length,
  };

  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase.from('fuel_logs').delete().eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-logs'] });
      toast({ title: 'Tankbeurt verwijderd' });
    },
    onError: () => {
      toast({ title: 'Fout bij verwijderen', variant: 'destructive' });
    },
  });

  return {
    logs,
    stats,
    isLoading,
    deleteLog: deleteMutation.mutate,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['fuel-logs'] }),
  };
}

function calculateAvgConsumption(logs: FuelLog[]): number | null {
  const logsWithMileage = logs.filter(l => l.mileage_at_fill).sort((a, b) => 
    (a.mileage_at_fill || 0) - (b.mileage_at_fill || 0)
  );

  if (logsWithMileage.length < 2) return null;

  const first = logsWithMileage[0];
  const last = logsWithMileage[logsWithMileage.length - 1];
  
  const kmDriven = (last.mileage_at_fill || 0) - (first.mileage_at_fill || 0);
  const litersUsed = logsWithMileage.slice(1).reduce((sum, log) => sum + log.liters, 0);

  if (kmDriven <= 0) return null;
  
  return (litersUsed / kmDriven) * 100;
}
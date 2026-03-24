import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface MaintenancePrediction {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  prediction_type: string | null;
  confidence_percent: number | null;
  severity: string | null;
  predicted_failure_date: string | null;
  estimated_cost: number | null;
  recommended_action: string | null;
  based_on_json: Record<string, unknown> | null;
  is_acknowledged: boolean | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  maintenance_scheduled_id: string | null;
  created_at: string | null;
  // Joined data
  vehicle?: {
    license_plate: string;
    brand: string;
    model: string;
  } | null;
}

export const useMaintenancePredictions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  // Fetch predictions with vehicle info
  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ["maintenance_predictions", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_predictions")
        .select(`
          *,
          vehicle:vehicles(license_plate, brand, model)
        `)
        .order("confidence_percent", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MaintenancePrediction[];
    },
    enabled: !!company?.id,
  });

  // Acknowledge a prediction (dismiss it)
  const acknowledgePrediction = useMutation({
    mutationFn: async (predictionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("maintenance_predictions")
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq("id", predictionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_predictions"] });
      toast({ title: "Voorspelling genegeerd" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Schedule maintenance from prediction
  const scheduleMaintenance = useMutation({
    mutationFn: async ({
      predictionId,
      vehicleId,
      description,
      scheduledDate,
      estimatedCost,
    }: {
      predictionId: string;
      vehicleId: string;
      description: string;
      scheduledDate: string;
      estimatedCost: number;
    }) => {
      if (!company?.id) throw new Error("No company");

      // 1. Create maintenance record
      const { data: maintenance, error: maintenanceError } = await supabase
        .from("vehicle_maintenance")
        .insert({
          vehicle_id: vehicleId,
          company_id: company.id,
          maintenance_type: description,
          scheduled_date: scheduledDate,
          cost: estimatedCost,
          status: "scheduled",
        })
        .select()
        .single();

      if (maintenanceError) throw maintenanceError;

      // 2. Update prediction with scheduled maintenance ID
      const { error: updateError } = await supabase
        .from("maintenance_predictions")
        .update({
          maintenance_scheduled_id: maintenance.id,
        })
        .eq("id", predictionId);

      if (updateError) throw updateError;

      return maintenance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_predictions"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle_maintenance"] });
      toast({ title: "Onderhoud ingepland" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij inplannen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stats
  const stats = {
    total: predictions.length,
    critical: predictions.filter((p) => p.severity === "critical" && !p.is_acknowledged).length,
    high: predictions.filter((p) => p.severity === "high" && !p.is_acknowledged).length,
    scheduled: predictions.filter((p) => p.maintenance_scheduled_id !== null).length,
    estimatedSavings: predictions
      .filter((p) => p.maintenance_scheduled_id !== null)
      .reduce((sum, p) => sum + ((p.estimated_cost || 0) * 0.3), 0), // 30% savings by proactive maintenance
    avgAccuracy: 87, // This would come from historical data
  };

  // Active predictions (not acknowledged, not scheduled)
  const activePredictions = predictions.filter(
    (p) => !p.is_acknowledged && !p.maintenance_scheduled_id
  );

  return {
    predictions,
    activePredictions,
    isLoading,
    acknowledgePrediction,
    scheduleMaintenance,
    stats,
  };
};

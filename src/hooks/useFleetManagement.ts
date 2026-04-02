import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays, differenceInDays, isPast, isFuture, parseISO } from "date-fns";

export interface Vehicle {
  id: string;
  license_plate: string;
  brand: string | null;
  model: string | null;
  vehicle_type: string | null;
  capacity_kg: number | null;
  is_active: boolean;
  notes: string | null;
  apk_expiry_date: string | null;
  last_apk_date: string | null;
  mileage_km: number | null;
  last_service_date: string | null;
  next_service_date: string | null;
  next_service_km: number | null;
  insurance_expiry_date: string | null;
  year_of_manufacture: number | null;
  purchase_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string | null;
  performed_at: string;
  performed_by: string | null;
  cost: number | null;
  mileage_at_service: number | null;
  next_maintenance_date: string | null;
  next_maintenance_km: number | null;
  notes: string | null;
  documents: any;
  created_at: string;
  updated_at: string;
}

export interface APKRecord {
  id: string;
  vehicle_id: string;
  apk_date: string;
  expiry_date: string;
  result: "approved" | "rejected" | "conditional";
  inspector: string | null;
  station_name: string | null;
  mileage_at_apk: number | null;
  remarks: string | null;
  defects: any;
  created_at: string;
}

export interface MaintenanceType {
  id: string;
  name: string;
  description: string | null;
  default_interval_months: number | null;
  default_interval_km: number | null;
  is_active: boolean;
}

export interface VehicleAlert {
  vehicle_id: string;
  vehicle: Vehicle;
  type: "apk_expired" | "apk_expiring" | "service_due" | "service_overdue" | "insurance_expired" | "insurance_expiring";
  severity: "critical" | "warning" | "info";
  message: string;
  days_remaining?: number;
}

export function useFleetManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all vehicles with fleet data
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ["vehicles-fleet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("license_plate");
      
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  // Fetch maintenance types
  const { data: maintenanceTypes = [] } = useQuery({
    queryKey: ["maintenance-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_types")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data as MaintenanceType[];
    },
  });

  // Calculate alerts
  const alerts: VehicleAlert[] = vehicles.flatMap((vehicle) => {
    const vehicleAlerts: VehicleAlert[] = [];
    const today = new Date();

    // APK alerts
    if (vehicle.apk_expiry_date) {
      const apkDate = parseISO(vehicle.apk_expiry_date);
      const daysUntil = differenceInDays(apkDate, today);

      if (daysUntil < 0) {
        vehicleAlerts.push({
          vehicle_id: vehicle.id,
          vehicle,
          type: "apk_expired",
          severity: "critical",
          message: `APK verlopen sinds ${Math.abs(daysUntil)} dagen`,
          days_remaining: daysUntil,
        });
      } else if (daysUntil <= 30) {
        vehicleAlerts.push({
          vehicle_id: vehicle.id,
          vehicle,
          type: "apk_expiring",
          severity: daysUntil <= 7 ? "critical" : "warning",
          message: `APK verloopt over ${daysUntil} dagen`,
          days_remaining: daysUntil,
        });
      }
    }

    // Service alerts
    if (vehicle.next_service_date) {
      const serviceDate = parseISO(vehicle.next_service_date);
      const daysUntil = differenceInDays(serviceDate, today);

      if (daysUntil < 0) {
        vehicleAlerts.push({
          vehicle_id: vehicle.id,
          vehicle,
          type: "service_overdue",
          severity: "warning",
          message: `Onderhoud uitgesteld met ${Math.abs(daysUntil)} dagen`,
          days_remaining: daysUntil,
        });
      } else if (daysUntil <= 14) {
        vehicleAlerts.push({
          vehicle_id: vehicle.id,
          vehicle,
          type: "service_due",
          severity: "info",
          message: `Onderhoud gepland over ${daysUntil} dagen`,
          days_remaining: daysUntil,
        });
      }
    }

    // Insurance alerts
    if (vehicle.insurance_expiry_date) {
      const insuranceDate = parseISO(vehicle.insurance_expiry_date);
      const daysUntil = differenceInDays(insuranceDate, today);

      if (daysUntil < 0) {
        vehicleAlerts.push({
          vehicle_id: vehicle.id,
          vehicle,
          type: "insurance_expired",
          severity: "critical",
          message: `Verzekering verlopen`,
          days_remaining: daysUntil,
        });
      } else if (daysUntil <= 30) {
        vehicleAlerts.push({
          vehicle_id: vehicle.id,
          vehicle,
          type: "insurance_expiring",
          severity: "warning",
          message: `Verzekering verloopt over ${daysUntil} dagen`,
          days_remaining: daysUntil,
        });
      }
    }

    return vehicleAlerts;
  });

  // Sort alerts by severity
  const sortedAlerts = alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Statistics
  const stats = {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter((v) => v.is_active).length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
    warningAlerts: alerts.filter((a) => a.severity === "warning").length,
    apkExpiringSoon: alerts.filter((a) => a.type === "apk_expiring" || a.type === "apk_expired").length,
    serviceDue: alerts.filter((a) => a.type === "service_due" || a.type === "service_overdue").length,
  };

  return {
    vehicles,
    vehiclesLoading,
    refetchVehicles,
    maintenanceTypes,
    alerts: sortedAlerts,
    stats,
  };
}

export function useVehicleMaintenance(vehicleId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch maintenance records for a vehicle
  const { data: maintenanceRecords = [], isLoading: maintenanceLoading, refetch: refetchMaintenance } = useQuery({
    queryKey: ["vehicle-maintenance", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("performed_at", { ascending: false });
      
      if (error) throw error;
      return data as MaintenanceRecord[];
    },
    enabled: !!vehicleId,
  });

  // Fetch APK history for a vehicle
  const { data: apkHistory = [], isLoading: apkLoading, refetch: refetchAPK } = useQuery({
    queryKey: ["vehicle-apk", vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      
      const { data, error } = await supabase
        .from("vehicle_apk_history")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("apk_date", { ascending: false });
      
      if (error) throw error;
      return data as APKRecord[];
    },
    enabled: !!vehicleId,
  });

  // Add maintenance record
  const addMaintenanceMutation = useMutation({
    mutationFn: async (record: Omit<MaintenanceRecord, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .insert(record)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-fleet"] });
      toast({ title: "Onderhoud toegevoegd" });
    },
    onError: (error) => {
      toast({ title: "Fout bij toevoegen onderhoud", variant: "destructive" });
      console.error(error);
    },
  });

  // Add APK record
  const addAPKMutation = useMutation({
    mutationFn: async (record: Omit<APKRecord, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("vehicle_apk_history")
        .insert(record)
        .select()
        .single();
      
      if (error) throw error;

      // Update vehicle APK dates
      await supabase
        .from("vehicles")
        .update({
          last_apk_date: record.apk_date,
          apk_expiry_date: record.expiry_date,
          mileage_km: record.mileage_at_apk || undefined,
        })
        .eq("id", vehicleId!);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-apk", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicles-fleet"] });
      toast({ title: "APK registratie toegevoegd" });
    },
    onError: (error) => {
      toast({ title: "Fout bij toevoegen APK", variant: "destructive" });
      console.error(error);
    },
  });

  // Delete maintenance record
  const deleteMaintenanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_maintenance")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance", vehicleId] });
      toast({ title: "Onderhoud verwijderd" });
    },
    onError: () => {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    },
  });

  // Delete APK record
  const deleteAPKMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_apk_history")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-apk", vehicleId] });
      toast({ title: "APK registratie verwijderd" });
    },
    onError: () => {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    },
  });

  // Calculate maintenance stats
  const maintenanceStats = {
    totalRecords: maintenanceRecords.length,
    totalCost: maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
    lastMaintenance: maintenanceRecords[0]?.performed_at || null,
    apkRecords: apkHistory.length,
    lastAPK: apkHistory[0]?.apk_date || null,
  };

  return {
    maintenanceRecords,
    maintenanceLoading,
    apkHistory,
    apkLoading,
    maintenanceStats,
    addMaintenance: addMaintenanceMutation.mutate,
    addAPK: addAPKMutation.mutate,
    deleteMaintenance: deleteMaintenanceMutation.mutate,
    deleteAPK: deleteAPKMutation.mutate,
    refetchMaintenance,
    refetchAPK,
  };
}

export function useUpdateVehicle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Vehicle> & { id: string }) => {
      const { error } = await supabase
        .from("vehicles")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles-fleet"] });
      toast({ title: "Voertuig bijgewerkt" });
    },
    onError: (error: any) => {
      let message = "Fout bij opslaan";
      if (error.code === "23505") {
        message = "Dit kenteken bestaat al";
      }
      toast({ title: message, variant: "destructive" });
    },
  });
}

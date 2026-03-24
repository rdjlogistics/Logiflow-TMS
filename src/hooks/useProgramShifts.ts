import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ShiftStatus = 'draft' | 'published' | 'paused' | 'filled' | 'in_progress' | 'completed' | 'cancelled';
export type CompensationType = 'fixed' | 'hourly' | 'per_trip' | 'per_km';

export interface ProgramShift {
  id: string;
  title: string | null;
  customer_id: string | null;
  trip_date: string;
  start_time: string;
  end_time: string | null;
  estimated_duration_hours: number;
  pickup_company: string | null;
  pickup_address: string;
  pickup_postal_code: string | null;
  pickup_city: string | null;
  pickup_country: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_company: string | null;
  delivery_address: string;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_country: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  vehicle_type: string | null;
  required_vehicle_id: string | null;
  requires_tail_lift: boolean;
  requires_adr: boolean;
  requires_cooling: boolean;
  compensation_type: CompensationType;
  compensation_amount: number;
  show_compensation_to_driver: boolean;
  surge_bonus: number;
  drivers_needed: number;
  application_deadline: string | null;
  auto_approve_threshold: number | null;
  status: ShiftStatus;
  assigned_driver_id: string | null;
  assigned_at: string | null;
  linked_trip_id: string | null;
  create_order_on_approval: boolean;
  notes: string | null;
  driver_instructions: string | null;
  carrier_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: { company_name: string } | null;
  assigned_driver?: { full_name: string } | null;
  applications_count?: number;
}

export interface CreateShiftData {
  title?: string;
  customer_id?: string;
  trip_date: string;
  start_time: string;
  end_time?: string;
  estimated_duration_hours?: number;
  pickup_company?: string;
  pickup_address: string;
  pickup_postal_code?: string;
  pickup_city?: string;
  pickup_country?: string;
  delivery_company?: string;
  delivery_address: string;
  delivery_postal_code?: string;
  delivery_city?: string;
  delivery_country?: string;
  vehicle_type?: string;
  requires_tail_lift?: boolean;
  requires_adr?: boolean;
  requires_cooling?: boolean;
  compensation_type?: CompensationType;
  compensation_amount?: number;
  show_compensation_to_driver?: boolean;
  drivers_needed?: number;
  application_deadline?: string;
  notes?: string;
  driver_instructions?: string;
  create_order_on_approval?: boolean;
  status?: ShiftStatus;
}

export function useProgramShifts(filters?: {
  status?: ShiftStatus[];
  dateFrom?: string;
  dateTo?: string;
  vehicleType?: string;
}) {
  return useQuery({
    queryKey: ["program-shifts", filters],
    queryFn: async () => {
      let query = supabase
        .from("program_shifts")
        .select(`
          *,
          customer:customers(company_name)
        `)
        .order("trip_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte("trip_date", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("trip_date", filters.dateTo);
      }
      if (filters?.vehicleType) {
        query = query.eq("vehicle_type", filters.vehicleType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch driver names separately if needed
      const shifts = data || [];
      const driverIds = [...new Set(shifts.filter(s => s.assigned_driver_id).map(s => s.assigned_driver_id))].filter((id): id is string => id != null);
      
      let driverMap: Record<string, string> = {};
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", driverIds);
        
        if (profiles) {
          driverMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name ?? '']));
        }
      }
      
      return shifts.map(s => ({
        ...s,
        assigned_driver: s.assigned_driver_id ? { full_name: driverMap[s.assigned_driver_id] || "Onbekend" } : null
      })) as ProgramShift[];
    },
  });
}

export function useAvailableShifts() {
  return useQuery({
    queryKey: ["available-shifts"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("program_shifts")
        .select(`
          *,
          customer:customers(company_name)
        `)
        .in("status", ["published"])
        .gte("trip_date", today)
        .order("trip_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as ProgramShift[];
    },
  });
}

export function useDriverAssignedShifts(driverId: string | undefined) {
  return useQuery({
    queryKey: ["driver-assigned-shifts", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from("program_shifts")
        .select(`
          *,
          customer:customers(company_name)
        `)
        .eq("assigned_driver_id", driverId)
        .in("status", ["filled", "in_progress", "completed"])
        .order("trip_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as ProgramShift[];
    },
    enabled: !!driverId,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateShiftData) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: shift, error } = await supabase
        .from("program_shifts")
        .insert({
          ...data,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from("program_audit_log").insert({
        event_type: "shift_created",
        entity_type: "shift",
        entity_id: shift.id,
        actor_id: user.user?.id,
        after_state: shift,
      });

      return shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-shifts"] });
      toast({ title: "Rit aangemaakt", description: "De rit is succesvol gepland." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProgramShift> & { id: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get before state
      const { data: beforeShift } = await supabase
        .from("program_shifts")
        .select()
        .eq("id", id)
        .single();

      const { data: shift, error } = await supabase
        .from("program_shifts")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from("program_audit_log").insert({
        event_type: "shift_updated",
        entity_type: "shift",
        entity_id: id,
        actor_id: user.user?.id,
        before_state: beforeShift,
        after_state: shift,
      });

      return shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      toast({ title: "Rit bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function usePublishShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: shift, error } = await supabase
        .from("program_shifts")
        .update({ status: "published" as ShiftStatus })
        .eq("id", shiftId)
        .select()
        .single();

      if (error) throw error;

      await supabase.from("program_audit_log").insert({
        event_type: "shift_published",
        entity_type: "shift",
        entity_id: shiftId,
        actor_id: user.user?.id,
        after_state: shift,
      });

      return shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      toast({ title: "Rit gepubliceerd", description: "Chauffeurs kunnen zich nu aanmelden." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get before state for audit
      const { data: beforeShift } = await supabase
        .from("program_shifts")
        .select()
        .eq("id", shiftId)
        .single();

      const { error } = await supabase
        .from("program_shifts")
        .delete()
        .eq("id", shiftId);

      if (error) throw error;

      await supabase.from("program_audit_log").insert({
        event_type: "shift_deleted",
        entity_type: "shift",
        entity_id: shiftId,
        actor_id: user.user?.id,
        before_state: beforeShift,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-shifts"] });
      toast({ title: "Rit verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'reserve' | 'cancelled';

export interface ShiftApplication {
  id: string;
  shift_id: string;
  driver_id: string;
  status: ApplicationStatus;
  driver_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  driver?: {
    full_name: string;
    phone: string | null;
  } | null;
  driver_score?: {
    overall_score: number;
    reliability_score: number;
    punctuality_score: number;
    no_show_count: number;
    shifts_last_30_days: number;
  } | null;
  shift?: {
    title: string | null;
    trip_date: string;
    start_time: string;
    pickup_city: string | null;
    delivery_city: string | null;
    vehicle_type: string | null;
  } | null;
}

export function useShiftApplications(shiftId?: string) {
  return useQuery({
    queryKey: ["shift-applications", shiftId],
    queryFn: async () => {
      let query = supabase
        .from("shift_applications")
        .select(`
          *,
          shift:program_shifts(title, trip_date, start_time, pickup_city, delivery_city, vehicle_type)
        `)
        .order("created_at", { ascending: false });

      if (shiftId) {
        query = query.eq("shift_id", shiftId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      const applications = data || [];
      const driverIds = [...new Set(applications.map(a => a.driver_id))];
      
      // Fetch driver profiles
      let driverMap: Record<string, { full_name: string; phone: string | null }> = {};
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", driverIds);
        
        if (profiles) {
          driverMap = Object.fromEntries(profiles.map(p => [p.user_id, { full_name: p.full_name || "Onbekend", phone: p.phone }]));
        }
      }
      
      // Fetch driver scores — resolve drivers.id from auth.uid() first
      let scoreMap: Record<string, any> = {};
      if (driverIds.length > 0) {
        const { data: driverRecords } = await supabase
          .from("drivers")
          .select("id, user_id")
          .in("user_id", driverIds);
        
        const userToDriverId = Object.fromEntries(
          (driverRecords || []).map(d => [d.user_id, d.id])
        );
        const realDriverIds = Object.values(userToDriverId).filter(Boolean) as string[];

        if (realDriverIds.length > 0) {
          const { data: scores } = await supabase
            .from("driver_scores")
            .select("driver_id, overall_score, reliability_score, punctuality_score, no_show_count, shifts_last_30_days")
            .in("driver_id", realDriverIds as string[]);
          
          if (scores) {
            const driverIdToUser = Object.fromEntries(
              (driverRecords || []).map(d => [d.id, d.user_id])
            );
            scoreMap = Object.fromEntries(
              scores.map(s => [driverIdToUser[s.driver_id] || s.driver_id, s])
            );
          }
        }
      }
      
      return applications.map(a => ({
        ...a,
        driver: driverMap[a.driver_id] || { full_name: "Onbekend", phone: null },
        driver_score: scoreMap[a.driver_id] || null
      })) as ShiftApplication[];
    },
  });
}

export function usePendingApplications() {
  return useQuery({
    queryKey: ["pending-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_applications")
        .select(`
          *,
          shift:program_shifts(title, trip_date, start_time, pickup_city, delivery_city, vehicle_type, customer:customers(company_name))
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const applications = data || [];
      const driverIds = [...new Set(applications.map(a => a.driver_id))];
      
      let driverMap: Record<string, { full_name: string; phone: string | null }> = {};
      let scoreMap: Record<string, any> = {};
      
      if (driverIds.length > 0) {
        // Resolve drivers.id from auth.uid() for driver_scores lookup
        const [{ data: profiles }, { data: driverRecords }] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone").in("user_id", driverIds),
          supabase.from("drivers").select("id, user_id").in("user_id", driverIds)
        ]);
        
        if (profiles) {
          driverMap = Object.fromEntries(profiles.map(p => [p.user_id, { full_name: p.full_name || "Onbekend", phone: p.phone }]));
        }

        // Map auth.uid() → drivers.id, then fetch scores by drivers.id
        const userToDriverId = Object.fromEntries(
          (driverRecords || []).map(d => [d.user_id, d.id])
        );
        const realDriverIds = Object.values(userToDriverId).filter(Boolean) as string[];

        if (realDriverIds.length > 0) {
          const { data: scores } = await supabase
            .from("driver_scores")
            .select("driver_id, overall_score, reliability_score, punctuality_score, no_show_count, shifts_last_30_days")
            .in("driver_id", realDriverIds as string[]);
          
          if (scores) {
            // Map scores back by auth.uid() for the result
            const driverIdToUser = Object.fromEntries(
              (driverRecords || []).map(d => [d.id, d.user_id])
            );
            scoreMap = Object.fromEntries(
              scores.map(s => [driverIdToUser[s.driver_id] || s.driver_id, s])
            );
          }
        }
      }
      
      return applications.map(a => ({
        ...a,
        driver: driverMap[a.driver_id] || { full_name: "Onbekend", phone: null },
        driver_score: scoreMap[a.driver_id] || null
      })) as ShiftApplication[];
    },
  });
}

export function useDriverApplications(driverId: string | undefined) {
  return useQuery({
    queryKey: ["driver-applications", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await supabase
        .from("shift_applications")
        .select(`
          *,
          shift:program_shifts(
            id, title, trip_date, start_time, end_time,
            pickup_city, delivery_city, vehicle_type,
            compensation_amount, compensation_type, show_compensation_to_driver
          )
        `)
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ShiftApplication[];
    },
    enabled: !!driverId,
  });
}

export function useApplyForShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ shiftId, note }: { shiftId: string; note?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Niet ingelogd");

      const { data, error } = await supabase
        .from("shift_applications")
        .insert({
          shift_id: shiftId,
          driver_id: user.user.id,
          driver_note: note || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from("program_audit_log").insert({
        event_type: "application_created",
        entity_type: "application",
        entity_id: data.id,
        actor_id: user.user.id,
        after_state: data,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-applications"] });
      queryClient.invalidateQueries({ queryKey: ["driver-applications"] });
      queryClient.invalidateQueries({ queryKey: ["available-shifts"] });
      toast({ title: "Aangemeld!", description: "Je aanmelding is verzonden." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useApproveApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Niet ingelogd");

      // Get application
      const { data: application, error: appError } = await supabase
        .from("shift_applications")
        .select("*, shift:program_shifts(*)")
        .eq("id", applicationId)
        .single();

      if (appError) throw appError;

      // Update application
      const { error: updateError } = await supabase
        .from("shift_applications")
        .update({
          status: "approved" as ApplicationStatus,
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // Update shift - assign driver
      const { error: shiftError } = await supabase
        .from("program_shifts")
        .update({
          assigned_driver_id: application.driver_id,
          assigned_at: new Date().toISOString(),
          status: "filled",
        })
        .eq("id", application.shift_id);

      if (shiftError) throw shiftError;

      // Reject other pending applications for this shift
      await supabase
        .from("shift_applications")
        .update({ 
          status: "rejected" as ApplicationStatus,
          rejection_reason: "Andere chauffeur geselecteerd",
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("shift_id", application.shift_id)
        .eq("status", "pending")
        .neq("id", applicationId);

      // Create TMS order if configured
      if (application.shift?.create_order_on_approval) {
        const shift = application.shift;

        // BUG FIX: Resolve drivers.id from auth.uid() — trips.driver_id expects drivers.id, not auth.uid()
        const { data: driverRecord } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", application.driver_id)
          .maybeSingle();

        // BUG FIX: Include company_id — required by RLS INSERT policy
        const companyId = shift.carrier_id || shift.customer_id 
          ? (await supabase.rpc("get_user_company_cached", { p_user_id: user.user.id })).data
          : null;

        const { data: trip, error: tripError } = await supabase
          .from("trips")
          .insert({
            trip_date: shift.trip_date,
            pickup_address: shift.pickup_address,
            pickup_postal_code: shift.pickup_postal_code,
            pickup_city: shift.pickup_city,
            delivery_address: shift.delivery_address,
            delivery_postal_code: shift.delivery_postal_code,
            delivery_city: shift.delivery_city,
            customer_id: shift.customer_id,
            driver_id: driverRecord?.id || null,
            company_id: companyId,
            status: "gepland",
            notes: shift.notes,
          })
          .select()
          .single();

        if (tripError) {
          // BUG FIX: Don't silently ignore trip creation failures
          console.error("Trip creation failed after shift approval:", tripError);
          // Still continue — shift is approved, but warn admin
          throw new Error(`Chauffeur goedgekeurd, maar order aanmaken mislukt: ${tripError.message}`);
        }

        if (trip) {
          // Link shift to trip
          await supabase
            .from("program_shifts")
            .update({ linked_trip_id: trip.id })
            .eq("id", application.shift_id);
        }
      }

      // Audit log
      await supabase.from("program_audit_log").insert({
        event_type: "application_approved",
        entity_type: "application",
        entity_id: applicationId,
        actor_id: user.user.id,
        metadata: { shift_id: application.shift_id, driver_id: application.driver_id },
      });

      return application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-applications"] });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
      queryClient.invalidateQueries({ queryKey: ["program-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["driver-assigned-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Chauffeur goedgekeurd", description: "Rit is toegewezen en order aangemaakt." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Niet ingelogd");

      const { error } = await supabase
        .from("shift_applications")
        .update({
          status: "rejected" as ApplicationStatus,
          rejection_reason: reason || null,
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (error) throw error;

      await supabase.from("program_audit_log").insert({
        event_type: "application_rejected",
        entity_type: "application",
        entity_id: applicationId,
        actor_id: user.user.id,
        metadata: { reason },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-applications"] });
      queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
      toast({ title: "Aanmelding afgewezen" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

export function useCancelApplication() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Niet ingelogd");

      const { error } = await supabase
        .from("shift_applications")
        .update({ status: "cancelled" as ApplicationStatus })
        .eq("id", applicationId)
        .eq("driver_id", user.user.id);

      if (error) throw error;

      await supabase.from("program_audit_log").insert({
        event_type: "application_cancelled",
        entity_type: "application",
        entity_id: applicationId,
        actor_id: user.user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-applications"] });
      queryClient.invalidateQueries({ queryKey: ["driver-applications"] });
      toast({ title: "Aanmelding geannuleerd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
}

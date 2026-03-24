import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { geocodeAddress } from "@/utils/geocoding";

export interface OptimizationStop {
  id: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  timeWindow: string;
  priority: "high" | "medium" | "low";
  tripId?: string;
  orderNumber?: string;
  stopType?: string;
}

export const useRouteOptimizationStops = () => {
  const { company } = useCompany();

  const { data: stops = [], isLoading, refetch } = useQuery({
    queryKey: ["route-optimization-stops", company?.id],
    queryFn: async () => {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch trips with route_stops that are scheduled for today/tomorrow
      const { data: trips, error } = await supabase
        .from("trips")
        .select(`
          id,
          order_number,
          status,
          pickup_address,
          pickup_city,
          pickup_latitude,
          pickup_longitude,
          delivery_address,
          delivery_city,
          delivery_latitude,
          delivery_longitude,
          route_stops (
            id,
            stop_order,
            stop_type,
            address,
            city,
            latitude,
            longitude,
            time_window_start,
            time_window_end,
            status
          )
        `)
        .in("status", ["gepland", "onderweg"])
        .gte("trip_date", today.toISOString())
        .lte("trip_date", tomorrow.toISOString())
        .order("trip_date", { ascending: true });

      if (error) {
        console.error("Error fetching stops for optimization:", error);
        return [];
      }

      // Convert to optimization stops format
      const optimizationStops: OptimizationStop[] = [];

      (trips || []).forEach((trip) => {
        // Add route stops if they exist
        if (trip.route_stops && trip.route_stops.length > 0) {
          trip.route_stops.forEach((stop: any) => {
            if (stop.status !== "completed") {
              const timeWindow = formatTimeWindow(stop.time_window_start, stop.time_window_end);
              optimizationStops.push({
                id: stop.id,
                address: stop.address || "Onbekend adres",
                city: stop.city || "",
                lat: stop.latitude || 0,
                lng: stop.longitude || 0,
                timeWindow,
                priority: stop.stop_type === "pickup" ? "high" : "medium",
                tripId: trip.id,
                orderNumber: trip.order_number || undefined,
                stopType: stop.stop_type,
              });
            }
          });
        } else {
          // Use trip pickup/delivery if no route_stops
          if (trip.pickup_latitude && trip.pickup_longitude) {
            optimizationStops.push({
              id: `${trip.id}-pickup`,
              address: trip.pickup_address,
              city: trip.pickup_city || "",
              lat: trip.pickup_latitude,
              lng: trip.pickup_longitude,
              timeWindow: "08:00-12:00",
              priority: "high",
              tripId: trip.id,
              orderNumber: trip.order_number || undefined,
              stopType: "pickup",
            });
          }
          if (trip.delivery_latitude && trip.delivery_longitude) {
            optimizationStops.push({
              id: `${trip.id}-delivery`,
              address: trip.delivery_address,
              city: trip.delivery_city || "",
              lat: trip.delivery_latitude,
              lng: trip.delivery_longitude,
              timeWindow: "12:00-18:00",
              priority: "medium",
              tripId: trip.id,
              orderNumber: trip.order_number || undefined,
              stopType: "delivery",
            });
          }
        }
      });

      // Geocode stops with missing coordinates (lat/lng = 0)
      const stopsNeedingGeocode = optimizationStops.filter(
        (s) => s.lat === 0 && s.lng === 0 && s.address && s.address !== "Onbekend adres"
      );

      if (stopsNeedingGeocode.length > 0) {
        // Geocode in batches of 5
        for (let i = 0; i < stopsNeedingGeocode.length; i += 5) {
          const batch = stopsNeedingGeocode.slice(i, i + 5);
          const results = await Promise.allSettled(
            batch.map((s) => geocodeAddress(s.address, undefined, s.city || undefined))
          );

          results.forEach((result, idx) => {
            if (result.status === "fulfilled" && result.value) {
              const stop = batch[idx];
              stop.lat = result.value.latitude;
              stop.lng = result.value.longitude;

              // Backfill to database (fire and forget)
              const stopId = stop.id;
              if (stopId && !stopId.includes("-pickup") && !stopId.includes("-delivery")) {
              supabase
                  .from("route_stops")
                  .update({ latitude: result.value.latitude, longitude: result.value.longitude })
                  .eq("id", stopId)
                  .then(({ error: updateErr }) => {
                    if (updateErr) console.error("[Backfill] Update failed for stop:", stopId, updateErr);
                    else console.log("[Backfill] ✓ Backfilled coordinates for stop:", stopId);
                  });
              }
            }
          });
        }
      }

      return optimizationStops;
    },
    enabled: !!company?.id,
  });

  return {
    stops,
    isLoading,
    refetch,
    hasRealData: stops.length > 0,
  };
};

function formatTimeWindow(start: string | null, end: string | null): string {
  if (!start && !end) return "Flexibel";
  
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    // Handle time-only format (HH:MM:SS or HH:MM)
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      return timeStr.substring(0, 5);
    }
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return null;
    }
  };

  const startTime = formatTime(start);
  const endTime = formatTime(end);

  if (startTime && endTime) {
    return `${startTime}-${endTime}`;
  } else if (startTime) {
    return `Vanaf ${startTime}`;
  } else if (endTime) {
    return `Tot ${endTime}`;
  }
  
  return "Flexibel";
}

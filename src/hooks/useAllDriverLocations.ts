import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DriverLocation {
  driver_id: string;
  driver_name: string;
  phone: string | null;
  trip_id: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
}

interface UseAllDriverLocationsOptions {
  refreshInterval?: number; // kept for API compat but ignored (realtime-only now)
  maxAgeMinutes?: number;
}

export const useAllDriverLocations = (options: UseAllDriverLocationsOptions = {}) => {
  const { maxAgeMinutes = 60 } = options;
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      // Single RPC with JOIN — replaces 3 separate queries (N+1 fix)
      const { data, error: queryError } = await supabase.rpc(
        'get_driver_locations_with_names',
        { p_max_age_minutes: maxAgeMinutes }
      );

      if (queryError) throw queryError;

      const parsed: DriverLocation[] = (data || []).map((loc: any) => ({
        driver_id: loc.driver_id,
        driver_name: loc.driver_name || `Chauffeur ${loc.driver_id?.slice(0, 6)}`,
        phone: loc.phone ?? null,
        trip_id: loc.trip_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        heading: loc.heading,
        speed: loc.speed,
        accuracy: loc.accuracy,
        recorded_at: loc.recorded_at,
      }));

      setLocations(parsed);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching driver locations:", err);
      setError(err.message || "Kon chauffeurlocaties niet ophalen");
    } finally {
      setLoading(false);
    }
  }, [maxAgeMinutes]);

  // Initial fetch only — no polling (realtime handles updates)
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Real-time subscription for new locations (replaces polling)
  useEffect(() => {
    const channelId = `all-driver-locations-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
        },
        (payload) => {
          const newLoc = payload.new as any;

          setLocations((prev) => {
            const updated = prev.filter((l) => l.driver_id !== newLoc.driver_id);
            // Keep existing name/phone if we already have this driver
            const existing = prev.find((l) => l.driver_id === newLoc.driver_id);
            return [
              {
                driver_id: newLoc.driver_id,
                driver_name: existing?.driver_name || `Chauffeur ${newLoc.driver_id.slice(0, 6)}`,
                phone: existing?.phone ?? null,
                trip_id: newLoc.trip_id,
                latitude: newLoc.latitude,
                longitude: newLoc.longitude,
                heading: newLoc.heading,
                speed: newLoc.speed,
                accuracy: newLoc.accuracy,
                recorded_at: newLoc.recorded_at,
              },
              ...updated,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
    activeCount: locations.length,
  };
};

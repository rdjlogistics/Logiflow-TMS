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
  refreshInterval?: number; // in milliseconds
  maxAgeMinutes?: number; // only show locations newer than this
}

export const useAllDriverLocations = (options: UseAllDriverLocationsOptions = {}) => {
  const { refreshInterval = 30000, maxAgeMinutes = 60 } = options;
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      // Get the latest location for each driver
      const { data, error: queryError } = await supabase
        .from("driver_locations")
        .select(`
          driver_id,
          trip_id,
          latitude,
          longitude,
          heading,
          speed,
          accuracy,
          recorded_at
        `)
        .gte("recorded_at", new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString())
        .order("recorded_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      // Get unique latest location per driver
      const latestByDriver = new Map<string, DriverLocation>();
      
      for (const loc of data || []) {
        if (!latestByDriver.has(loc.driver_id)) {
          latestByDriver.set(loc.driver_id, {
            driver_id: loc.driver_id,
            driver_name: `Chauffeur ${loc.driver_id.slice(0, 6)}`,
            phone: null,
            trip_id: loc.trip_id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            heading: loc.heading,
            speed: loc.speed,
            accuracy: loc.accuracy,
            recorded_at: loc.recorded_at,
          });
        }
      }

      // Fetch driver names from profiles (user_id matches driver_locations.driver_id)
      const driverIds = Array.from(latestByDriver.keys());
      if (driverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", driverIds);

        if (profiles && profiles.length > 0) {
          for (const profile of profiles) {
            const loc = latestByDriver.get(profile.user_id);
            if (loc) {
              if (profile.full_name) loc.driver_name = profile.full_name;
              loc.phone = (profile as any).phone ?? null;
            }
          }
        } else {
          // Fallback: try drivers table (has broader RLS)
          const { data: drivers } = await supabase
            .from("drivers")
            .select("user_id, name, phone")
            .in("user_id", driverIds);

          if (drivers) {
            for (const driver of drivers) {
              if (!driver.user_id) continue;
              const loc = latestByDriver.get(driver.user_id);
              if (loc) {
                if (driver.name) loc.driver_name = driver.name;
                loc.phone = driver.phone ?? null;
              }
            }
          }
        }
      }

      setLocations(Array.from(latestByDriver.values()));
      setError(null);
    } catch (err: any) {
      console.error("Error fetching driver locations:", err);
      setError(err.message || "Kon chauffeurlocaties niet ophalen");
    } finally {
      setLoading(false);
    }
  }, [maxAgeMinutes]);

  // Initial fetch
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Polling for updates
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchLocations, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchLocations]);

  // Real-time subscription for new locations
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
            // Update or add the driver's location
            const updated = prev.filter((l) => l.driver_id !== newLoc.driver_id);
            return [
              {
                driver_id: newLoc.driver_id,
                driver_name: `Chauffeur ${newLoc.driver_id.slice(0, 6)}`,
                phone: null,
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

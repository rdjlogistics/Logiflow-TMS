import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
}

export const useRealtimeDriverLocation = (tripId?: string) => {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial location
  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      return;
    }

    const fetchLatestLocation = async () => {
      const { data, error } = await supabase
        .from("driver_locations")
        .select("latitude, longitude, heading, speed, accuracy, recorded_at")
        .eq("trip_id", tripId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setLocation(data);
      }
      setLoading(false);
    };

    fetchLatestLocation();
  }, [tripId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`driver-location-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const newLocation = payload.new as any;
          setLocation({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            heading: newLocation.heading,
            speed: newLocation.speed,
            accuracy: newLocation.accuracy,
            recorded_at: newLocation.recorded_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return { location, loading };
};

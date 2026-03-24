import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrailPoint {
  latitude: number;
  longitude: number;
  recorded_at: string;
}

export function useDriverTrail(driverId: string | null) {
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!driverId) {
      setTrail([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchTrail = async () => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("driver_locations")
        .select("latitude, longitude, recorded_at")
        .eq("driver_id", driverId)
        .gte("recorded_at", fourHoursAgo)
        .order("recorded_at", { ascending: true });

      if (!cancelled) {
        setTrail(error ? [] : (data as TrailPoint[]) ?? []);
        setLoading(false);
      }
    };

    fetchTrail();
    return () => { cancelled = true; };
  }, [driverId]);

  return { trail, loading };
}

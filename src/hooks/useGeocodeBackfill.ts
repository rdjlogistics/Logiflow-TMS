import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/utils/geocoding";
import { useCompany } from "@/hooks/useCompany";
import { logger } from "@/lib/logger";

/**
 * Standalone hook that geocodes ALL route_stops with NULL latitude/longitude.
 * Runs once per mount, regardless of trip date.
 */
export const useGeocodeBackfill = () => {
  const { company } = useCompany();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!company?.id || hasRun.current) return;
    hasRun.current = true;

    const runBackfill = async () => {
      // Fetch all route_stops with NULL coordinates and a valid address
      const { data: missingStops, error } = await supabase
        .from("route_stops")
        .select("id, address, city")
        .is("latitude", null)
        .neq("address", "")
        .not("address", "is", null)
        .limit(50);

      if (error) {
        logger.error("[Backfill] Error fetching stops with missing coords:", error);
        return;
      }

      if (!missingStops || missingStops.length === 0) {
        logger.log("[Backfill] No route_stops with missing coordinates found.");
        return;
      }

      logger.log(`[Backfill] Found ${missingStops.length} stops with missing coordinates. Starting geocoding...`);

      // Process in batches of 5
      for (let i = 0; i < missingStops.length; i += 5) {
        const batch = missingStops.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map((s) => geocodeAddress(s.address || "", undefined, s.city || undefined))
        );

        for (let idx = 0; idx < batch.length; idx++) {
          const result = results[idx];
          const stop = batch[idx];

          if (result.status === "fulfilled" && result.value) {
            const { latitude, longitude } = result.value;
            const { error: updateError } = await supabase
              .from("route_stops")
              .update({ latitude, longitude })
              .eq("id", stop.id);

            if (updateError) {
              logger.error(`[Backfill] Update failed for stop ${stop.id}:`, updateError);
            } else {
              logger.log(`[Backfill] ✓ Geocoded stop ${stop.id}: ${stop.address}, ${stop.city} → (${latitude}, ${longitude})`);
            }
          } else {
            console.warn(`[Backfill] ✗ Could not geocode stop ${stop.id}: ${stop.address}, ${stop.city}`);
          }
        }
      }

      console.log("[Backfill] Geocoding backfill complete.");
    };

    runBackfill();
  }, [company?.id]);
};

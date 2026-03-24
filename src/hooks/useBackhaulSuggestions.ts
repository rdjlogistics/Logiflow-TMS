import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/utils/routeUtils";

export interface BackhaulSuggestion {
  trip_id: string;
  customer_name: string;
  pickup_city: string;
  pickup_postal_code: string | null;
  delivery_city: string;
  delivery_postal_code: string | null;
  distance_from_current_km: number;
  match_score: number;
  cargo_description: string | null;
  time_window: string | null;
  driver_id: string | null;
  trip_date: string;
}

interface BackhaulInput {
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_city?: string | null;
  trip_date: string;
  current_trip_id: string;
  radius_km?: number;
}

export function useBackhaulSuggestions() {
  const [suggestions, setSuggestions] = useState<BackhaulSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = useCallback(async (input: BackhaulInput) => {
    const { delivery_latitude, delivery_longitude, trip_date, current_trip_id, radius_km = 30 } = input;

    if (!delivery_latitude || !delivery_longitude) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Get planned trips for today and tomorrow
      const today = trip_date;
      const tomorrow = new Date(new Date(trip_date).getTime() + 86400000).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("trips")
        .select("id, trip_date, pickup_city, pickup_postal_code, pickup_latitude, pickup_longitude, delivery_city, delivery_postal_code, cargo_description, delivery_time_from, delivery_time_to, driver_id, customer:customers(company_name)")
        .eq("status", "gepland")
        .is("deleted_at", null)
        .in("trip_date", [today, tomorrow])
        .neq("id", current_trip_id)
        .not("pickup_latitude", "is", null)
        .not("pickup_longitude", "is", null);

      if (error) throw error;
      if (!data || data.length === 0) {
        setSuggestions([]);
        return;
      }

      // Calculate distance and score for each candidate
      const scored: BackhaulSuggestion[] = [];

      for (const trip of data) {
        if (!trip.pickup_latitude || !trip.pickup_longitude) continue;

        const dist = haversineDistance(
          delivery_latitude,
          delivery_longitude,
          trip.pickup_latitude,
          trip.pickup_longitude
        );

        if (dist > radius_km) continue;

        // Score: closer = better (0-100)
        const distanceScore = Math.max(0, 100 - (dist / radius_km) * 100);

        // Same-day bonus
        const sameDayBonus = trip.trip_date === today ? 10 : 0;

        // Unassigned bonus (easier to assign)
        const unassignedBonus = !trip.driver_id ? 5 : 0;

        const match_score = Math.round(distanceScore + sameDayBonus + unassignedBonus);

        // Format time window
        let time_window: string | null = null;
        if (trip.delivery_time_from || trip.delivery_time_to) {
          const from = trip.delivery_time_from?.substring(0, 5);
          const to = trip.delivery_time_to?.substring(0, 5);
          time_window = from && to ? `${from}–${to}` : from || to || null;
        }

        const customer = trip.customer as { company_name: string } | null;

        scored.push({
          trip_id: trip.id,
          customer_name: customer?.company_name || "Onbekend",
          pickup_city: trip.pickup_city || "–",
          pickup_postal_code: trip.pickup_postal_code,
          delivery_city: trip.delivery_city || "–",
          delivery_postal_code: trip.delivery_postal_code,
          distance_from_current_km: Math.round(dist * 10) / 10,
          match_score,
          cargo_description: trip.cargo_description,
          time_window,
          driver_id: trip.driver_id,
          trip_date: trip.trip_date,
        });
      }

      // Sort by score desc, take top 5
      scored.sort((a, b) => b.match_score - a.match_score);
      setSuggestions(scored.slice(0, 5));
    } catch (err) {
      console.error("Backhaul suggestions error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const assignDriver = useCallback(async (tripId: string, driverId: string) => {
    const { error } = await supabase
      .from("trips")
      .update({ driver_id: driverId })
      .eq("id", tripId);

    if (error) throw error;
  }, []);

  return { suggestions, loading, fetchSuggestions, assignDriver };
}

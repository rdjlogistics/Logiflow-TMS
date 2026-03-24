import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DriverLocation {
  latitude: number;
  longitude: number;
}

interface Destination {
  lat: number;
  lng: number;
}

interface LiveETAResult {
  etaMinutes: number | null;
  routeDistanceKm: number | null;
  arrivalTime: string | null;
  isCalculating: boolean;
}

const MIN_INTERVAL_MS = 30000; // 30 seconds
const MIN_DISTANCE_M = 200; // 200 meters

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useLiveETA = (
  driverLocation: DriverLocation | null,
  destination: Destination | null
): LiveETAResult => {
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [arrivalTime, setArrivalTime] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const lastCallRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const isFetchingRef = useRef(false);

  const fetchETA = useCallback(async (origin: DriverLocation, dest: Destination) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsCalculating(true);

    try {
      const { data, error } = await supabase.functions.invoke("live-eta", {
        body: {
          origin_lat: origin.latitude,
          origin_lng: origin.longitude,
          dest_lat: dest.lat,
          dest_lng: dest.lng,
        },
      });

      if (error || !data || data.error) {
        // Fallback to Haversine
        const distM = haversineDistance(origin.latitude, origin.longitude, dest.lat, dest.lng);
        const distKm = distM / 1000;
        const mins = Math.round((distKm / 50) * 60); // 50 km/h average
        setEtaMinutes(mins);
        setRouteDistanceKm(Math.round(distKm * 10) / 10);
        setArrivalTime(new Date(Date.now() + mins * 60000).toISOString());
      } else {
        setEtaMinutes(data.duration_minutes);
        setRouteDistanceKm(data.distance_km);
        setArrivalTime(new Date(Date.now() + data.duration_minutes * 60000).toISOString());
      }

      lastCallRef.current = { lat: origin.latitude, lng: origin.longitude, time: Date.now() };
    } catch {
      // Fallback
      const distM = haversineDistance(origin.latitude, origin.longitude, dest.lat, dest.lng);
      const distKm = distM / 1000;
      const mins = Math.round((distKm / 50) * 60);
      setEtaMinutes(mins);
      setRouteDistanceKm(Math.round(distKm * 10) / 10);
      setArrivalTime(new Date(Date.now() + mins * 60000).toISOString());
    } finally {
      isFetchingRef.current = false;
      setIsCalculating(false);
    }
  }, []);

  useEffect(() => {
    if (!driverLocation || !destination) return;

    const last = lastCallRef.current;
    const now = Date.now();

    // First call or enough time/distance elapsed
    if (!last) {
      fetchETA(driverLocation, destination);
      return;
    }

    const timeSinceLast = now - last.time;
    const distanceMoved = haversineDistance(
      last.lat, last.lng,
      driverLocation.latitude, driverLocation.longitude
    );

    if (timeSinceLast >= MIN_INTERVAL_MS && distanceMoved >= MIN_DISTANCE_M) {
      fetchETA(driverLocation, destination);
    }
  }, [driverLocation, destination, fetchETA]);

  return { etaMinutes, routeDistanceKm, arrivalTime, isCalculating };
};

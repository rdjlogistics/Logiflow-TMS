import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface DeliveryCoords {
  latitude: number;
  longitude: number;
}

interface ProximityState {
  distanceKm: number | null;
  isWithinRadius: boolean;
  deliveryCoords: DeliveryCoords | null;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useDeliveryProximity = (
  tripId: string | undefined,
  driverLat: number | null,
  driverLng: number | null,
  customerId?: string,
  radiusKm = 15
) => {
  const [state, setState] = useState<ProximityState>({
    distanceKm: null,
    isWithinRadius: false,
    deliveryCoords: null,
  });
  const notificationSentRef = useRef(false);

  // Fetch delivery coordinates from trip
  useEffect(() => {
    if (!tripId) return;

    const fetchCoords = async () => {
      const { data } = await supabase
        .from("trips")
        .select("delivery_latitude, delivery_longitude")
        .eq("id", tripId)
        .maybeSingle();

      if (data?.delivery_latitude && data?.delivery_longitude) {
        setState(prev => ({
          ...prev,
          deliveryCoords: {
            latitude: data.delivery_latitude as number,
            longitude: data.delivery_longitude as number,
          },
        }));
      }
    };

    fetchCoords();
  }, [tripId]);

  // Calculate distance when driver location updates
  useEffect(() => {
    if (!driverLat || !driverLng || !state.deliveryCoords) return;

    const dist = haversineDistance(
      driverLat, driverLng,
      state.deliveryCoords.latitude, state.deliveryCoords.longitude
    );
    const within = dist <= radiusKm;

    setState(prev => ({
      ...prev,
      distanceKm: Math.round(dist * 10) / 10,
      isWithinRadius: within,
    }));
  }, [driverLat, driverLng, state.deliveryCoords, radiusKm]);

  // Send one-time proximity notification
  useEffect(() => {
    if (!state.isWithinRadius || notificationSentRef.current || !customerId || !tripId) return;
    notificationSentRef.current = true;

    const sendNotification = async () => {
      try {
        await supabase.functions.invoke("send-customer-notification", {
          body: {
            customer_id: customerId,
            title: "Chauffeur nadert afleveradres",
            body: `Uw zending is bijna bij u — de chauffeur is nog ${Math.round(state.distanceKm || 0)} km verwijderd.`,
            notification_type: "proximity_alert",
            data: { trip_id: tripId, distance_km: state.distanceKm },
          },
        });
        logger.log("Proximity notification sent to customer");
      } catch (err) {
        logger.error("Failed to send proximity notification:", err);
      }
    };

    sendNotification();
  }, [state.isWithinRadius, customerId, tripId, state.distanceKm]);

  return state;
};

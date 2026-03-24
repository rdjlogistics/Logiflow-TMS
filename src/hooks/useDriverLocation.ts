import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
}

export const useDriverLocation = (tripId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<DriverLocation | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!user || !tripId) return;

      const location: DriverLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        accuracy: position.coords.accuracy,
        recorded_at: new Date().toISOString(),
      };

      setCurrentLocation(location);

      try {
        const { error: insertError } = await supabase.from("driver_locations").insert({
          driver_id: user.id,
          trip_id: tripId,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
          recorded_at: location.recorded_at,
        });

        if (insertError) {
          console.error("Error inserting location:", insertError);
        }
      } catch (err) {
        console.error("Error sending location:", err);
      }
    },
    [user, tripId]
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocatie wordt niet ondersteund door deze browser");
      toast({
        title: "Fout",
        description: "Geolocatie wordt niet ondersteund door deze browser",
        variant: "destructive",
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position);
        setError(null);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError(err.message);
        toast({
          title: "Locatiefout",
          description: err.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
    toast({
      title: "GPS Tracking gestart",
      description: "Je locatie wordt nu gedeeld met de organisatie en klant",
    });
  }, [sendLocation, toast]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast({
      title: "GPS Tracking gestopt",
      description: "Je locatie wordt niet meer gedeeld",
    });
  }, [watchId, toast]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    isTracking,
    currentLocation,
    error,
    startTracking,
    stopTracking,
  };
};

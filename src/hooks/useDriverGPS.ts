import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
}

interface UseDriverGPSOptions {
  tripId?: string;
  intervalMs?: number;
  enabled?: boolean;
}

// Check if location was enabled during onboarding
const LOCATION_ENABLED_KEY = 'driver_location_enabled';

export const useDriverGPS = ({
  tripId,
  intervalMs = 10000, // Update every 10 seconds
  enabled = false,
}: UseDriverGPSOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  
  const hasAutoStarted = useRef(false);

  // Check permission status and auto-start if previously granted
  useEffect(() => {
    const checkAndInitialize = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          setPermissionStatus(result.state);
          
          // If permission was granted (either from onboarding or browser), save it
          if (result.state === 'granted') {
            localStorage.setItem(LOCATION_ENABLED_KEY, 'true');
          }
          
          result.onchange = () => {
            setPermissionStatus(result.state);
            if (result.state === 'granted') {
              localStorage.setItem(LOCATION_ENABLED_KEY, 'true');
            }
          };
        } catch (err) {
          console.error('Permission check failed:', err);
        }
      }
      
      // Check if location was enabled during onboarding — use permissions API, no blocking getCurrentPosition
      const wasEnabledInOnboarding = localStorage.getItem(LOCATION_ENABLED_KEY) === 'true';
      if (wasEnabledInOnboarding && permissionStatus === null) {
        if ('permissions' in navigator) {
          try {
            const perm = await navigator.permissions.query({ name: 'geolocation' });
            if (perm.state === 'granted') {
              setPermissionStatus('granted');
            } else {
              localStorage.removeItem(LOCATION_ENABLED_KEY);
            }
          } catch {
            localStorage.removeItem(LOCATION_ENABLED_KEY);
          }
        }
      }
    };
    
    checkAndInitialize();
  }, []);

  // Send location to database
  const sendLocation = useCallback(async (location: LocationData) => {
    if (!user || !tripId) return;

    try {
      const { error: insertError } = await supabase
        .from('driver_locations')
        .insert({
          driver_id: user.id,
          trip_id: tripId,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
        });

      if (insertError) {
        console.error('Error sending location:', insertError);
      }
    } catch (err) {
      console.error('Failed to send location:', err);
    }
  }, [user, tripId]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocatie wordt niet ondersteund door deze browser');
      return;
    }

    setError(null);
    setIsTracking(true);

    // Watch position for continuous updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
        };
        setCurrentLocation(location);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(getErrorMessage(err));
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });
      
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed,
        accuracy: position.coords.accuracy,
      });
      setPermissionStatus('granted');
      // Save to localStorage so it persists from onboarding to portal
      localStorage.setItem(LOCATION_ENABLED_KEY, 'true');
      return true;
    } catch (err: any) {
      setError(getErrorMessage(err));
      return false;
    }
  }, []);

  // Auto-start when enabled and tripId changes
  useEffect(() => {
    if (enabled && tripId && permissionStatus === 'granted') {
      startTracking();
    } else {
      stopTracking();
    }

    return () => stopTracking();
  }, [enabled, tripId, permissionStatus]);

  // Send location when it updates (throttled to intervalMs)
  useEffect(() => {
    if (isTracking && currentLocation && tripId) {
      const now = Date.now();
      if (now - lastSentRef.current >= intervalMs) {
        lastSentRef.current = now;
        sendLocation(currentLocation);
      }
    }
  }, [currentLocation, isTracking, tripId, sendLocation, intervalMs]);

  return {
    isTracking,
    currentLocation,
    error,
    permissionStatus,
    startTracking,
    stopTracking,
    requestPermission,
  };
};

const getErrorMessage = (error: GeolocationPositionError): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Locatietoegang geweigerd. Sta locatie toe in je browser instellingen.';
    case error.POSITION_UNAVAILABLE:
      return 'Locatie niet beschikbaar. Controleer je GPS.';
    case error.TIMEOUT:
      return 'Locatie opvragen duurde te lang. Probeer opnieuw.';
    default:
      return 'Onbekende fout bij ophalen locatie.';
  }
};

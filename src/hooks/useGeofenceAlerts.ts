import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { haversineDistance } from '@/utils/routeUtils';

// Configurable thresholds
export const GEOFENCE_CONFIG = {
  STANDSTILL_TIMEOUT_MIN: 15,
  GEOFENCE_RADIUS_KM: 25,
  CHECK_INTERVAL_MS: 30000,
};

export interface GeofenceAlert {
  id: string;
  driver_id: string;
  driver_name: string;
  exception_type: 'unplanned_stop' | 'geofence_violation';
  severity: 'warning' | 'critical';
  title: string;
  description: string | null;
  latitude?: number;
  longitude?: number;
  created_at: string;
  status: string;
}

interface DriverLocation {
  driver_id: string;
  driver_name: string;
  trip_id: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  recorded_at: string;
}

interface StandstillTracker {
  firstSeenStill: string; // ISO timestamp
  alerted: boolean;
}

interface GeofenceTracker {
  alerted: boolean;
}

export const useGeofenceAlerts = (driverLocations: DriverLocation[]) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [newAlertCount, setNewAlertCount] = useState(0);

  // In-memory dedup trackers
  const standstillRef = useRef<Map<string, StandstillTracker>>(new Map());
  const geofenceRef = useRef<Map<string, GeofenceTracker>>(new Map());
  const lastAlertCountRef = useRef(0);

  // Fetch active alerts from exception_cases
  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('exception_cases')
      .select('id, driver_id, exception_type, severity, title, description, created_at, status, details')
      .in('exception_type', ['unplanned_stop', 'geofence_violation'])
      .in('status', ['open', 'acknowledged'])
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const mapped: GeofenceAlert[] = data.map((d: any) => ({
        id: d.id,
        driver_id: d.driver_id || '',
        driver_name: (d.details as any)?.driver_name || `Chauffeur ${(d.driver_id || '').slice(0, 6)}`,
        exception_type: d.exception_type as 'unplanned_stop' | 'geofence_violation',
        severity: d.severity as 'warning' | 'critical',
        title: d.title,
        description: d.description,
        latitude: (d.details as any)?.latitude,
        longitude: (d.details as any)?.longitude,
        created_at: d.created_at,
        status: d.status,
      }));
      setAlerts(mapped);

      // Track new alerts for audio
      if (mapped.length > lastAlertCountRef.current) {
        setNewAlertCount(mapped.length - lastAlertCountRef.current);
      }
      lastAlertCountRef.current = mapped.length;
    }
  }, [user]);

  // Detect standstill and geofence violations
  const runChecks = useCallback(async () => {
    if (!user) return;

    // Get user company
    const { data: companyData } = await supabase.rpc('get_user_company', { p_user_id: user.id });
    if (!companyData) return;
    const companyId = companyData as string;

    for (const loc of driverLocations) {
      if (!loc.trip_id) continue;

      const driverKey = loc.driver_id;

      // --- Standstill detection ---
      const isStill = loc.speed === null || loc.speed === 0;
      const tracker = standstillRef.current.get(driverKey);

      if (isStill) {
        if (!tracker) {
          standstillRef.current.set(driverKey, { firstSeenStill: loc.recorded_at, alerted: false });
        } else if (!tracker.alerted) {
          const stillSince = new Date(tracker.firstSeenStill).getTime();
          const now = new Date(loc.recorded_at).getTime();
          const minutesStill = (now - stillSince) / 60000;

          if (minutesStill >= GEOFENCE_CONFIG.STANDSTILL_TIMEOUT_MIN) {
            tracker.alerted = true;
            // Insert exception
            await supabase.from('exception_cases').insert({
              company_id: companyId,
              driver_id: loc.driver_id,
              order_id: loc.trip_id,
              exception_type: 'unplanned_stop' as any,
              severity: 'warning' as any,
              title: `Stilstand: ${loc.driver_name}`,
              description: `${loc.driver_name} staat al ${Math.round(minutesStill)} minuten stil`,
              auto_detected: true,
              detected_at: new Date().toISOString(),
              details: {
                driver_name: loc.driver_name,
                latitude: loc.latitude,
                longitude: loc.longitude,
                minutes_still: Math.round(minutesStill),
              } as any,
            }).then(({ error }) => {
              if (error) console.error('[Geofence] Insert standstill alert failed:', error);
            });
          }
        }
      } else {
        // Driver is moving again, reset tracker
        standstillRef.current.delete(driverKey);
      }

      // --- Geofence check ---
      const geoKey = `${driverKey}-geo`;
      const geoTracker = geofenceRef.current.get(geoKey);

      if (!geoTracker?.alerted) {
        // Fetch route stops for this trip
        const { data: stops } = await supabase
          .from('route_stops')
          .select('latitude, longitude, stop_type, address, city')
          .eq('trip_id', loc.trip_id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (stops && stops.length > 0) {
          // Find minimum distance to any stop
          let minDist = Infinity;
          for (const stop of stops) {
            if (stop.latitude && stop.longitude) {
              const dist = haversineDistance(loc.latitude, loc.longitude, stop.latitude, stop.longitude);
              if (dist < minDist) minDist = dist;
            }
          }

          if (minDist > GEOFENCE_CONFIG.GEOFENCE_RADIUS_KM) {
            geofenceRef.current.set(geoKey, { alerted: true });
            await supabase.from('exception_cases').insert({
              company_id: companyId,
              driver_id: loc.driver_id,
              order_id: loc.trip_id,
              exception_type: 'geofence_violation' as any,
              severity: 'critical' as any,
              title: `Geofence: ${loc.driver_name}`,
              description: `${loc.driver_name} is ${Math.round(minDist)} km van de dichtstbijzijnde stop`,
              auto_detected: true,
              detected_at: new Date().toISOString(),
              details: {
                driver_name: loc.driver_name,
                latitude: loc.latitude,
                longitude: loc.longitude,
                distance_km: Math.round(minDist),
              } as any,
            }).then(({ error }) => {
              if (error) console.error('[Geofence] Insert geofence alert failed:', error);
            });
          }
        }
      }
    }

    // After checks, fetch latest alerts
    await fetchAlerts();
  }, [driverLocations, user, fetchAlerts]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Run checks on location updates (throttled)
  const lastCheckRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastCheckRef.current < GEOFENCE_CONFIG.CHECK_INTERVAL_MS) return;
    if (driverLocations.length === 0) return;
    lastCheckRef.current = now;
    runChecks();
  }, [driverLocations, runChecks]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(fetchAlerts, GEOFENCE_CONFIG.CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    if (!user) return;
    await supabase
      .from('exception_cases')
      .update({
        status: 'acknowledged' as any,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      })
      .eq('id', alertId);
    await fetchAlerts();
  }, [user, fetchAlerts]);

  const dismissAlert = useCallback(async (alertId: string) => {
    if (!user) return;
    await supabase
      .from('exception_cases')
      .update({
        status: 'resolved' as any,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: 'Afgewezen door planner',
      })
      .eq('id', alertId);
    await fetchAlerts();
  }, [user, fetchAlerts]);

  const clearNewAlertCount = useCallback(() => setNewAlertCount(0), []);

  const alertCounts = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
  };

  const driversWithAlerts = new Set(alerts.map(a => a.driver_id));

  return {
    alerts,
    alertCounts,
    newAlertCount,
    clearNewAlertCount,
    acknowledgeAlert,
    dismissAlert,
    driversWithAlerts,
    refetchAlerts: fetchAlerts,
  };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';

interface RouteStop {
  id: string;
  trip_id: string;
  stop_order: number;
  stop_type: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  time_window_start: string | null;
  time_window_end: string | null;
  actual_arrival: string | null;
  customer_reference: string | null;
  waybill_number: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface DriverTrip {
  id: string;
  order_number: string | null;
  trip_date: string;
  pickup_address: string;
  pickup_city: string | null;
  pickup_postal_code: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_address: string;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  status: string;
  cargo_description: string | null;
  weight_kg: number | null;
  notes: string | null;
  remarks_waybill: string | null;
  purchase_total: number | null;
  vehicle_id: string | null;
  customer: { company_name: string; contact_name: string | null; phone: string | null } | null;
  vehicle: { license_plate: string; brand: string | null; model: string | null } | null;
  route_stops: RouteStop[];
}

export const useDriverTrips = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrip, setActiveTrip] = useState<DriverTrip | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  // First, get the driver record for the current user
  const fetchDriverId = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error fetching driver ID:', error);
      return null;
    }
  };

  // Fetch driver's trips with route stops
  const fetchTrips = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get driver ID for current user
      const currentDriverId = await fetchDriverId();
      setDriverId(currentDriverId);

      if (!currentDriverId) {
        // User is not linked to a driver record
        setTrips([]);
        setActiveTrip(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          customer:customers(company_name, contact_name, phone),
          vehicle:vehicles(license_plate, brand, model),
          route_stops(*)
        `)
        .eq('driver_id', currentDriverId)
        .in('status', ['gepland', 'geladen', 'onderweg', 'afgeleverd', 'afgerond'] as any)
        .order('trip_date', { ascending: true });

      if (error) throw error;
      
      // Sort route_stops by stop_order
      const tripsWithSortedStops = (data || []).map(trip => ({
        ...trip,
        route_stops: (trip.route_stops || []).sort((a: RouteStop, b: RouteStop) => a.stop_order - b.stop_order)
      }));
      
      setTrips(tripsWithSortedStops as DriverTrip[]);
      
      // Set active trip (first one that's onderweg)
      const active = tripsWithSortedStops?.find(t => t.status === 'onderweg');
      setActiveTrip(active as DriverTrip || null);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  // Log order event
  const logOrderEvent = async (orderId: string, eventType: string, payload: Record<string, any> = {}) => {
    try {
      await supabase.from('order_events').insert({
        order_id: orderId,
        event_type: eventType,
        actor_user_id: user?.id,
        payload,
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  };

  // Check out a stop - this triggers the color changes
  const checkOutStop = async (tripId: string, stopId: string, stopOrder: number) => {
    if (!user) return false;

    try {
      // Get current location for GPS snapshot
      let gpsData: { latitude?: number; longitude?: number; accuracy?: number } = {};
      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });
          gpsData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
        } catch (geoError) {
          console.warn('Could not get GPS position:', geoError);
        }
      }

      const now = new Date().toISOString();

      // Update the stop status to 'completed'
      const { error: stopError } = await supabase
        .from('route_stops')
        .update({
          status: 'completed',
          actual_arrival: now,
        })
        .eq('id', stopId);

      if (stopError) throw stopError;

      // Get all stops for this trip to determine next actions
      const { data: allStops } = await supabase
        .from('route_stops')
        .select('*')
        .eq('trip_id', tripId)
        .order('stop_order');

      const stops = allStops || [];
      const completedStops = stops.filter(s => s.status === 'completed');
      const isFirstStop = stopOrder === 1 || completedStops.length === 1;
      const isLastStop = stopOrder === stops.length;

      // Determine trip status change
      let newTripStatus: string | null = null;
      let eventType = 'STOP_COMPLETED';

      if (isFirstStop && stops.length > 1) {
        // First stop completed = trip is now "onderweg"
        newTripStatus = 'onderweg';
        eventType = 'STOP_1_COMPLETED';
      } else if (isLastStop || completedStops.length === stops.length) {
        // Last stop completed — check checkout_mode to decide final status
        eventType = 'STOP_2_COMPLETED';

        // Look up customer checkout_mode
        const { data: tripData } = await supabase
          .from('trips')
          .select('customer_id')
          .eq('id', tripId)
          .single();

        let checkoutMode = 'to_planning';
        if (tripData?.customer_id) {
          const { data: custSettings } = await supabase
            .from('customer_settings')
            .select('checkout_mode')
            .eq('customer_id', tripData.customer_id)
            .maybeSingle();
          checkoutMode = (custSettings as any)?.checkout_mode ?? 'to_planning';
        }

        if (checkoutMode === 'direct_complete') {
          // Direct complete: skip afgeleverd, go straight to afgerond with metadata
          newTripStatus = 'afgerond';
        } else {
          // Default: set to afgeleverd, admin/checkout flow handles afgerond
          newTripStatus = 'afgeleverd';
        }
      }

      // Update trip status if needed
      if (newTripStatus) {
        const tripUpdates: Record<string, any> = { status: newTripStatus };
        
        if (newTripStatus === 'onderweg') {
          tripUpdates.actual_departure = now;
        } else if (newTripStatus === 'afgeleverd') {
          tripUpdates.actual_arrival = now;
        } else if (newTripStatus === 'afgerond') {
          tripUpdates.actual_arrival = now;
          tripUpdates.checkout_completed_at = now;
          tripUpdates.checkout_completed_by = user.id;
        }

        const { error: tripError } = await supabase
          .from('trips')
          .update(tripUpdates)
          .eq('id', tripId);

        if (tripError) throw tripError;
      }

      // Notify B2B customer of status change
      if (newTripStatus) {
        const { data: tripForNotif } = await supabase
          .from('trips')
          .select('customer_id, order_number')
          .eq('id', tripId)
          .single();
        notifyCustomerStatusChange(tripForNotif?.customer_id, tripId, newTripStatus, tripForNotif?.order_number);
      }

      // Auto-send vrachtbrief if tenant setting enabled
      if (newTripStatus === 'afgerond' || newTripStatus === 'afgeleverd') {
        try {
          const { data: tenantSettings } = await supabase
            .from('tenant_settings')
            .select('auto_send_pod_email')
            .limit(1)
            .maybeSingle();

          if (tenantSettings?.auto_send_pod_email) {
            supabase.functions.invoke('auto-send-vrachtbrief', {
              body: { tripId },
            }).catch(err => console.error('Auto-send vrachtbrief error:', err));
          }
        } catch (err) {
          console.error('Error checking tenant settings for auto-send:', err);
        }
      }

      // Send delivery confirmation on afgeleverd
      if (newTripStatus === 'afgeleverd') {
        supabase.functions.invoke('send-delivery-confirmation', {
          body: { tripId },
        }).catch(err => console.error('Delivery confirmation error:', err));
      }

      // Log the event with GPS data
      await logOrderEvent(tripId, eventType, {
        stop_id: stopId,
        stop_order: stopOrder,
        completed_at: now,
        gps: gpsData,
        new_trip_status: newTripStatus,
      });

      // Show success message
      const statusMessage = newTripStatus === 'afgerond' 
        ? 'Rit afgerond!' 
        : newTripStatus === 'afgeleverd'
          ? 'Rit afgeleverd!'
          : newTripStatus === 'onderweg' 
            ? 'Onderweg naar volgende stop' 
            : 'Stop afgemeld';

      toast({
        title: 'Stop afgemeld',
        description: statusMessage,
      });

      // Refresh trips
      await fetchTrips();
      return true;
    } catch (error: any) {
      console.error('Error checking out stop:', error);
      toast({
        title: 'Fout bij afmelden',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Start trip (marks first stop as started, sets trip to onderweg)
  const startTrip = async (tripId: string) => {
    if (!user) return false;

    try {
      const now = new Date().toISOString();

      // Update trip status
      const { error: tripError } = await supabase
        .from('trips')
        .update({
          status: 'onderweg',
          actual_departure: now,
        })
        .eq('id', tripId);

      if (tripError) throw tripError;

      // Log event
      await logOrderEvent(tripId, 'TRIP_STARTED', {
        started_at: now,
      });

      // Notify B2B customer trip is underway
      const { data: tripForNotif } = await supabase
        .from('trips')
        .select('customer_id, order_number')
        .eq('id', tripId)
        .single();
      notifyCustomerStatusChange(tripForNotif?.customer_id, tripId, 'onderweg', tripForNotif?.order_number);

      toast({
        title: 'Rit gestart',
        description: 'GPS tracking is actief',
      });

      await fetchTrips();
      return true;
    } catch (error: any) {
      toast({
        title: 'Fout',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Update trip status (legacy, kept for compatibility)
  const updateTripStatus = async (tripId: string, newStatus: string) => {
    try {
      // Fetch current status for audit trail
      const { data: currentTrip } = await supabase
        .from('trips')
        .select('status')
        .eq('id', tripId)
        .single();
      const oldStatus = currentTrip?.status || 'unknown';

      const updates: Record<string, any> = { status: newStatus };
      
      if (newStatus === 'onderweg') {
        updates.actual_departure = new Date().toISOString();
      } else if (newStatus === 'afgeleverd') {
        updates.actual_arrival = new Date().toISOString();
      } else if (newStatus === 'afgerond') {
        updates.actual_arrival = new Date().toISOString();
        updates.checkout_completed_at = new Date().toISOString();
        updates.checkout_completed_by = user?.id || null;
      }

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId);

      if (error) throw error;

      await logOrderEvent(tripId, 'STATUS_UPDATED', {
        old_value: oldStatus,
        new_value: newStatus,
        source: 'driver_portal',
      });

      // Fetch trip for customer notification context
      const { data: tripData } = await supabase
        .from('trips')
        .select('customer_id, order_number')
        .eq('id', tripId)
        .single();

      // B2B notification (non-blocking)
      notifyCustomerStatusChange(tripData?.customer_id, tripId, newStatus, tripData?.order_number);

      // Auto-send vrachtbrief for terminal statuses (respects tenant setting)
      if (['afgeleverd', 'afgerond'].includes(newStatus)) {
        const { data: tSettings } = await supabase.from('tenant_settings').select('auto_send_pod_email').limit(1).maybeSingle();
        if (tSettings?.auto_send_pod_email) {
          supabase.functions.invoke('auto-send-vrachtbrief', { body: { tripId } }).catch(() => {});
        }
      }

      // Send delivery confirmation for afgeleverd
      if (newStatus === 'afgeleverd') {
        supabase.functions.invoke('send-delivery-confirmation', { body: { tripId } }).catch(() => {});
      }

      toast({
        title: 'Status bijgewerkt',
        description: `Rit is nu: ${newStatus}`,
      });

      await fetchTrips();
      return true;
    } catch (error: any) {
      toast({
        title: 'Fout',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Accept trip (set as active)
  const acceptTrip = async (tripId: string) => {
    return startTrip(tripId);
  };

  // Mark as delivered (completed)
  const markAsDelivered = async (tripId: string) => {
    return updateTripStatus(tripId, 'afgeleverd');
  };

  // Subscribe to realtime updates with debounce
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isMounted) fetchTrips();
      }, 300);
    };
    
    // Initial fetch (no debounce)
    if (isMounted) fetchTrips();

    const channel = supabase
      .channel(`driver-trips-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
        },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'route_stops',
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    trips,
    loading,
    activeTrip,
    driverId,
    fetchTrips,
    updateTripStatus,
    acceptTrip,
    startTrip,
    markAsDelivered,
    checkOutStop,
  };
};

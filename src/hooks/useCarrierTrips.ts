import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CarrierRouteStop {
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
}

export interface CarrierTrip {
  id: string;
  order_number: string | null;
  trip_date: string;
  pickup_address: string;
  pickup_city: string | null;
  delivery_address: string;
  delivery_city: string | null;
  status: string;
  cargo_description: string | null;
  cargo_weight: number | null;
  loading_meters: number | null;
  vehicle_type: string | null;
  reference: string | null;
  route_stops: CarrierRouteStop[];
}

interface UseCarrierTripsOptions {
  portalScope?: string;
  contactId?: string;
  allStatuses?: boolean;
}

export const useCarrierTrips = (carrierId: string | null, options?: UseCarrierTripsOptions) => {
  const [trips, setTrips] = useState<CarrierTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    if (!carrierId) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('trips')
        .select(`
          id, order_number, trip_date, pickup_address, pickup_city,
          delivery_address, delivery_city, status, cargo_description,
          cargo_weight, loading_meters, vehicle_type, reference,
          route_stops(
            id, trip_id, stop_order, stop_type, address, city, postal_code,
            company_name, contact_name, phone, notes, status,
            time_window_start, time_window_end, actual_arrival
          )
        `)
        .eq('carrier_id', carrierId);

      if (!options?.allStatuses) {
        query = query.in('status', ['gepland', 'geladen', 'onderweg', 'afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd']);
      }

      // Scope filter: only show trips assigned to this contact
      if (options?.portalScope === 'own_orders_only' && options?.contactId) {
        query = query.eq('carrier_contact_id', options.contactId);
      }

      query = query.order('trip_date', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((t: any) => ({
        ...t,
        route_stops: (t.route_stops || []).sort(
          (a: any, b: any) => a.stop_order - b.stop_order
        ),
      }));

      setTrips(mapped);
    } catch (err) {
      console.error('Error fetching carrier trips:', err);
    } finally {
      setLoading(false);
    }
  }, [carrierId, options?.portalScope, options?.contactId, options?.allStatuses]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const activeTrip = trips.find(t => t.status === 'onderweg') || null;

  return { trips, loading, activeTrip, fetchTrips };
};

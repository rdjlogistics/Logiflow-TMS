// Trip service — centralized data access for trips/orders
import { supabase } from '@/integrations/supabase/client';
import type { Trip, TripInsert, TripUpdate } from '@/types/supabase-helpers';

export interface TripFilters {
  status?: string;
  customerId?: string;
  driverId?: string;
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  invoiced?: boolean;
  companyId?: string;
  limit?: number;
  offset?: number;
}

const TRIP_SELECT = `
  *,
  customers(company_name, email, phone),
  drivers(name, phone),
  vehicles(license_plate, brand, model),
  carriers(company_name),
  invoices(invoice_number, status, due_date)
`;

export async function fetchTrips(filters: TripFilters = {}) {
  let query = supabase
    .from('trips')
    .select(TRIP_SELECT)
    .is('deleted_at', null)
    .order('trip_date', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status as any);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.driverId) query = query.eq('driver_id', filters.driverId);
  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.dateFrom) query = query.gte('trip_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('trip_date', filters.dateTo);
  if (filters.invoiced === true) query = query.not('invoice_id', 'is', null);
  if (filters.invoiced === false) query = query.is('invoice_id', null);
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

  if (!filters.limit) query = query.limit(5000);

  const { data, error } = await query;
  if (error) throw error;

  // Client-side search filter
  if (filters.search && data) {
    const q = filters.search.toLowerCase();
    return data.filter(t =>
      t.order_number?.toLowerCase().includes(q) ||
      t.pickup_city?.toLowerCase().includes(q) ||
      t.delivery_city?.toLowerCase().includes(q) ||
      (t.customers as { company_name?: string } | null)?.company_name?.toLowerCase().includes(q) ||
      (t.drivers as { name?: string } | null)?.name?.toLowerCase().includes(q) ||
      (t.vehicles as { license_plate?: string } | null)?.license_plate?.toLowerCase().includes(q)
    );
  }

  return data ?? [];
}

export async function fetchTripById(id: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(`${TRIP_SELECT}, route_stops(*)`)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createTrip(input: TripInsert) {
  const { data, error } = await supabase
    .from('trips')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrip(id: string, updates: TripUpdate) {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTripStatus(id: string, status: Trip['status']) {
  return updateTrip(id, { status });
}

export async function softDeleteTrip(id: string) {
  const { error } = await supabase
    .from('trips')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function fetchTripStats(companyId?: string) {
  let query = supabase
    .from('trips')
    .select('status, sales_total, purchase_total, distance_km, trip_date')
    .is('deleted_at', null);

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) throw error;

  const trips = data ?? [];
  const totalRevenue = trips.reduce((s, t) => s + (t.sales_total ?? 0), 0);
  const totalCost = trips.reduce((s, t) => s + (t.purchase_total ?? 0), 0);
  const totalKm = trips.reduce((s, t) => s + (t.distance_km ?? 0), 0);

  return {
    total: trips.length,
    totalRevenue,
    totalCost,
    grossProfit: totalRevenue - totalCost,
    totalKm,
    byStatus: trips.reduce<Record<string, number>>((acc, t) => {
      const s = t.status ?? 'unknown';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

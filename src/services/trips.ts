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

// Explicit columns instead of * to reduce payload
const TRIP_COLUMNS = `
  id, order_number, trip_date, status, trip_type,
  pickup_address, pickup_city, pickup_postal_code, pickup_country, pickup_date, pickup_time_from, pickup_time_to, pickup_reference, pickup_contact, pickup_phone, pickup_instructions,
  delivery_address, delivery_city, delivery_postal_code, delivery_country, delivery_date, delivery_time_from, delivery_time_to, delivery_reference, delivery_contact, delivery_phone, delivery_instructions,
  customer_id, driver_id, vehicle_id, carrier_id, invoice_id, company_id,
  sales_total, purchase_total, distance_km, weight_kg, loading_meters, volume_m3, goods_description,
  pod_available, pod_signed_by, pod_notes, pod_timestamp,
  notes, created_at, updated_at, deleted_at
`;

const TRIP_SELECT = `
  ${TRIP_COLUMNS},
  customers(company_name, email, phone),
  drivers(name, phone),
  vehicles(license_plate, brand, model),
  carriers(company_name),
  invoices(invoice_number, status, due_date)
`;

const DEFAULT_LIMIT = 100;

export async function fetchTrips(filters: TripFilters = {}) {
  const limit = filters.limit ?? DEFAULT_LIMIT;

  let query = supabase
    .from('trips')
    .select(TRIP_SELECT, { count: 'exact' })
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
  if (filters.companyId) query = query.eq('company_id', filters.companyId);

  // Server-side search with ilike
  if (filters.search) {
    const q = `%${filters.search}%`;
    query = query.or(
      `order_number.ilike.${q},pickup_city.ilike.${q},delivery_city.ilike.${q}`
    );
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + limit - 1);
  } else {
    query = query.limit(limit);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { data: data ?? [], count: count ?? 0 };
}

// Legacy wrapper for callers that expect a plain array
export async function fetchTripsArray(filters: TripFilters = {}) {
  const { data } = await fetchTrips(filters);
  return data;
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

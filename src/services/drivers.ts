// Driver service — centralized data access for drivers
import { supabase } from '@/integrations/supabase/client';

export interface DriverFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'on_leave';
  isZzp?: boolean;
  vehicleId?: string;
  companyId?: string;
  limit?: number;
}

export interface DriverInsert {
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  tenant_id: string;
  vehicle_id?: string;
  license_number?: string;
  license_expiry?: string;
  driver_category?: 'light' | 'heavy';
  is_zzp?: boolean;
  date_of_birth?: string;
  adr_expiry?: string;
  cpc_expiry?: string;
}

export interface DriverUpdate extends Partial<DriverInsert> {}

const DRIVER_SELECT = `
  *,
  vehicles(license_plate, brand, model)
`;

export async function fetchDrivers(filters: DriverFilters = {}) {
  let query = supabase
    .from('drivers')
    .select(DRIVER_SELECT)
    .is('deleted_at', null)
    .order('name');

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.isZzp !== undefined) query = query.eq('is_zzp', filters.isZzp);
  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;

  let result = data ?? [];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(d =>
      d.name?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q) ||
      d.license_number?.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function fetchDriverById(id: string) {
  const { data, error } = await supabase
    .from('drivers')
    .select(DRIVER_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDriver(input: DriverInsert) {
  const { data, error } = await supabase
    .from('drivers')
    .insert(input)
    .select(DRIVER_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDriver(id: string, updates: DriverUpdate) {
  const { data, error } = await supabase
    .from('drivers')
    .update(updates)
    .eq('id', id)
    .select(DRIVER_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteDriver(id: string) {
  const { error } = await supabase
    .from('drivers')
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export interface DriverStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  zzp: number;
  expiringSoon: number; // license/compliance expiring within 30 days
}

export async function fetchDriverStats(): Promise<DriverStats> {
  const { data, error } = await supabase
    .from('drivers')
    .select('status, is_zzp, license_expiry, adr_expiry, cpc_expiry')
    .is('deleted_at', null);

  if (error) throw error;

  const drivers = data ?? [];
  const today = new Date();
  const in30 = new Date();
  in30.setDate(today.getDate() + 30);
  const todayStr = today.toISOString().split('T')[0];
  const in30Str = in30.toISOString().split('T')[0];

  return {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    inactive: drivers.filter(d => d.status === 'inactive').length,
    onLeave: drivers.filter(d => d.status === 'on_leave').length,
    zzp: drivers.filter(d => d.is_zzp).length,
    expiringSoon: drivers.filter(d => {
      const expiries = [d.license_expiry, d.adr_expiry, d.cpc_expiry].filter(Boolean) as string[];
      return expiries.some(e => e >= todayStr && e <= in30Str);
    }).length,
  };
}

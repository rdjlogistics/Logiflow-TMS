// Carrier service — centralized data access for carriers (subcontractors)
import { supabase } from '@/integrations/supabase/client';

export interface CarrierFilters {
  search?: string;
  isActive?: boolean;
  minRating?: number;
  limit?: number;
}

export interface CarrierInsert {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  vat_number?: string;
  iban?: string;
  tenant_id: string;
  is_active?: boolean;
}

export interface CarrierUpdate extends Partial<CarrierInsert> {}

const CARRIER_SELECT = `*`;

export async function fetchCarriers(filters: CarrierFilters = {}) {
  let query = supabase
    .from('carriers')
    .select(CARRIER_SELECT)
    .is('deleted_at', null)
    .order('company_name');

  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.minRating !== undefined) query = query.gte('rating', filters.minRating);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;

  let result = data ?? [];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(c =>
      c.company_name?.toLowerCase().includes(q) ||
      c.contact_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.vat_number?.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function fetchCarrierById(id: string) {
  const { data, error } = await supabase
    .from('carriers')
    .select(CARRIER_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCarrier(input: CarrierInsert) {
  const { data, error } = await supabase
    .from('carriers')
    .insert(input)
    .select(CARRIER_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateCarrier(id: string, updates: CarrierUpdate) {
  const { data, error } = await supabase
    .from('carriers')
    .update(updates)
    .eq('id', id)
    .select(CARRIER_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteCarrier(id: string) {
  const { error } = await supabase
    .from('carriers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export interface CarrierStats {
  total: number;
  active: number;
  inactive: number;
  avgRating: number;
}

export async function fetchCarrierStats(): Promise<CarrierStats> {
  const { data, error } = await supabase
    .from('carriers')
    .select('is_active, rating')
    .is('deleted_at', null);

  if (error) throw error;

  const carriers = data ?? [];
  const withRating = carriers.filter(c => c.rating != null);

  return {
    total: carriers.length,
    active: carriers.filter(c => c.is_active).length,
    inactive: carriers.filter(c => !c.is_active).length,
    avgRating: withRating.length
      ? withRating.reduce((sum, c) => sum + (c.rating ?? 0), 0) / withRating.length
      : 0,
  };
}

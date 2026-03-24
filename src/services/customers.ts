// Customer service — centralized data access for customers
import { supabase } from '@/integrations/supabase/client';
import type { CustomerInsert, CustomerUpdate } from '@/types/supabase-helpers';

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  creditBlocked?: boolean;
  limit?: number;
}

const CUSTOMER_SELECT = `
  *,
  invoices(id, status, total_amount, amount_paid)
`;

export async function fetchCustomers(filters: CustomerFilters = {}) {
  let query = supabase
    .from('customers')
    .select('*')
    .is('deleted_at', null)
    .order('company_name');

  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.creditBlocked !== undefined) query = query.eq('credit_blocked', filters.creditBlocked);
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

export async function fetchCustomerById(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCustomer(input: CustomerInsert) {
  const { data, error } = await supabase
    .from('customers')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, updates: CustomerUpdate) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function softDeleteCustomer(id: string) {
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function fetchCustomerStats() {
  const { data, error } = await supabase
    .from('customers')
    .select('is_active, credit_blocked, credit_limit')
    .is('deleted_at', null);

  if (error) throw error;

  const customers = data ?? [];
  return {
    total: customers.length,
    active: customers.filter(c => c.is_active).length,
    inactive: customers.filter(c => !c.is_active).length,
    creditBlocked: customers.filter(c => c.credit_blocked).length,
    totalCreditLimit: customers.reduce((s, c) => s + (c.credit_limit ?? 0), 0),
  };
}

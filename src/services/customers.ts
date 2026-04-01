// Customer service — centralized data access for customers
import { supabase } from '@/integrations/supabase/client';
import type { CustomerInsert, CustomerUpdate } from '@/types/supabase-helpers';

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  creditBlocked?: boolean;
  companyId?: string;
  limit?: number;
}

const CUSTOMER_SELECT = `
  id, tenant_id, company_name, contact_name, email, phone, address, city, postal_code, country,
  vat_number, kvk_number, is_active, credit_blocked, credit_limit, payment_terms_days,
  iban, bic, notes, created_at, updated_at,
  invoices(id, status, total_amount, amount_paid)
`;

export async function fetchCustomers(filters: CustomerFilters = {}) {
  let query = supabase
    .from('customers')
    .select('id, tenant_id, company_name, contact_name, email, phone, city, postal_code, country, vat_number, is_active, credit_blocked, credit_limit, payment_terms_days, created_at, updated_at')
    .is('deleted_at', null)
    .order('company_name');

  if (filters.companyId) query = query.eq('tenant_id', filters.companyId);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.creditBlocked !== undefined) query = query.eq('credit_blocked', filters.creditBlocked);
  if (filters.limit) query = query.limit(filters.limit);

  if (filters.search) {
    const q = `%${filters.search}%`;
    query = query.or(`company_name.ilike.${q},contact_name.ilike.${q},email.ilike.${q},vat_number.ilike.${q}`);
  }

  if (!filters.limit) query = query.limit(100);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
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

export async function fetchCustomerStats(companyId?: string) {
  let query = supabase
    .from('customers')
    .select('is_active, credit_blocked, credit_limit')
    .is('deleted_at', null);

  if (companyId) query = query.eq('tenant_id', companyId);

  const { data, error } = await query;

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

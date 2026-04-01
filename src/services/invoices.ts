// Invoice service — centralized data access for invoices
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceInsert, InvoiceUpdate } from '@/types/supabase-helpers';

export interface InvoiceFilters {
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  companyId?: string;
  limit?: number;
}

const INVOICE_SELECT = `
  *,
  customers(company_name, email, payment_terms_days),
  invoice_lines(*, trips(order_number))
`;

export async function fetchInvoices(filters: InvoiceFilters = {}) {
  let query = supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .order('invoice_date', { ascending: false });

  if (filters.companyId) query = query.eq('company_id', filters.companyId);
  if (filters.status) query = query.eq('status', filters.status as any);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.dateFrom) query = query.gte('invoice_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('invoice_date', filters.dateTo);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;

  let result = data ?? [];

  if (filters.overdue) {
    const today = new Date().toISOString().split('T')[0];
    result = result.filter(
      inv => inv.status !== 'betaald' && inv.due_date && inv.due_date < today
    );
  }

  return result;
}

export async function fetchInvoiceById(id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createInvoice(input: InvoiceInsert) {
  const { data, error } = await supabase
    .from('invoices')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInvoice(id: string, updates: InvoiceUpdate) {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markInvoicePaid(id: string, amountPaid: number) {
  return updateInvoice(id, {
    status: 'betaald',
    amount_paid: amountPaid,
    paid_at: new Date().toISOString(),
  });
}

export async function fetchOverdueInvoices(companyId?: string) {
  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('invoices')
    .select(`id, invoice_number, invoice_date, due_date, status, total_amount, amount_paid, customers(company_name, email)`)
    .not('status', 'in', '("betaald","gedeeltelijk_betaald")')
    .lt('due_date', today)
    .order('due_date', { ascending: true });

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function fetchInvoiceStats(companyId?: string) {
  let query = supabase
    .from('invoices')
    .select('status, total_amount, amount_paid, due_date');

  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;

  if (error) throw error;

  const invoices = data ?? [];
  const today = new Date().toISOString().split('T')[0];

  let totalRevenue = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let countOverdue = 0;

  for (const inv of invoices) {
    const total = inv.total_amount ?? 0;
    const paid = inv.amount_paid ?? 0;
    const open = Math.max(0, total - paid);

    if (inv.status === 'betaald') {
      totalPaid += total;
    } else {
      totalOutstanding += open;
      if (inv.due_date && inv.due_date < today) {
        totalOverdue += open;
        countOverdue++;
      }
    }
    totalRevenue += total;
  }

  return {
    totalRevenue,
    totalPaid,
    totalOutstanding,
    totalOverdue,
    countOverdue,
    total: invoices.length,
    byStatus: invoices.reduce<Record<string, number>>((acc, inv) => {
      const s = inv.status ?? 'unknown';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

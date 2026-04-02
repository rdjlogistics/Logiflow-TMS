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

// Light select for list views — no nested invoice_lines
const INVOICE_LIST_SELECT = `
  id, invoice_number, invoice_date, due_date, status, total_amount, amount_paid, paid_at,
  company_id, customer_id, notes, created_at, updated_at,
  customers(company_name, email, payment_terms_days)
`;

// Full select for detail views — includes lines and trip refs
const INVOICE_DETAIL_SELECT = `
  *,
  customers(company_name, email, payment_terms_days),
  invoice_lines(*, trips(order_number))
`;

export async function fetchInvoices(filters: InvoiceFilters = {}) {
  let query = supabase
    .from('invoices')
    .select(INVOICE_LIST_SELECT)
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
    .select(INVOICE_DETAIL_SELECT)
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
  if (!companyId) {
    return { totalRevenue: 0, totalPaid: 0, totalOutstanding: 0, totalOverdue: 0, countOverdue: 0, total: 0, byStatus: {} };
  }

  const { data, error } = await supabase.rpc('get_invoice_stats', { p_company_id: companyId });
  if (error) throw error;

  const stats = data as any ?? {};
  return {
    totalRevenue: stats.total_revenue ?? 0,
    totalPaid: stats.total_paid ?? 0,
    totalOutstanding: stats.total_outstanding ?? 0,
    totalOverdue: stats.total_overdue ?? 0,
    countOverdue: stats.count_overdue ?? 0,
    total: stats.total ?? 0,
    openInvoices: stats.open_invoices ?? 0,
    pendingPayments: stats.pending_payments ?? 0,
    byStatus: {},
  };
}

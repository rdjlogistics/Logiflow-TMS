import { useState, useEffect, useCallback } from 'react';
import {
  fetchInvoices,
  fetchInvoiceStats,
  fetchOverdueInvoices,
  type InvoiceFilters,
} from '@/services/invoices';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';

/**
 * Hook for fetching and filtering invoices with automatic refresh.
 * Automatically injects companyId for defense-in-depth tenant isolation.
 */
export function useInvoicesData(filters: InvoiceFilters = {}) {
  const { company } = useCompany();
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof fetchInvoices>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices({ ...filters, companyId: company.id });
      setInvoices(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden facturen';
      setError(msg);
      toast({ title: 'Laden mislukt', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters), company?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { invoices, loading, error, refetch: load };
}

/**
 * Hook for invoice statistics (totals, overdue counts, DSO).
 */
export function useInvoiceStats(companyId?: string) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchInvoiceStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    fetchInvoiceStats(companyId)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  return { stats, loading };
}

/**
 * Hook for overdue invoices with automatic refresh.
 * Returns invoices past their due date that haven't been paid.
 */
export function useOverdueInvoices(companyId?: string) {
  const [invoices, setInvoices] = useState<Awaited<ReturnType<typeof fetchOverdueInvoices>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOverdueInvoices();
      setInvoices(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden vervallen facturen';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { invoices, loading, error, refetch: load };
}

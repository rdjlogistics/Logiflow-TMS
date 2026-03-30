import { useState, useEffect, useCallback } from 'react';
import {
  fetchCustomers,
  fetchCustomerStats,
  type CustomerFilters,
} from '@/services/customers';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';

/**
 * Hook for fetching and filtering customers with automatic refresh.
 * Automatically injects companyId for defense-in-depth tenant isolation.
 */
export function useCustomersData(filters: CustomerFilters = {}) {
  const { company } = useCompany();
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof fetchCustomers>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers({ ...filters, companyId: company.id });
      setCustomers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden klanten';
      setError(msg);
      toast({ title: 'Laden mislukt', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters), company?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { customers, loading, error, refetch: load };
}

/**
 * Hook for customer statistics (total, active, credit-blocked).
 */
export function useCustomerStats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchCustomerStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomerStats()
      .then(setStats)
      .catch((err) => {
        console.error(err);
        toast({ title: 'Statistieken laden mislukt', description: err instanceof Error ? err.message : 'Onbekende fout', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, loading };
}

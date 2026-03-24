import { useState, useEffect, useCallback } from 'react';
import {
  fetchCustomers,
  fetchCustomerStats,
  type CustomerFilters,
} from '@/services/customers';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for fetching and filtering customers with automatic refresh.
 * Wraps the customers service with loading state, error handling, and refetch.
 *
 * Example:
 *   const { customers, loading, refetch } = useCustomersData({ isActive: true });
 */
export function useCustomersData(filters: CustomerFilters = {}) {
  const [customers, setCustomers] = useState<Awaited<ReturnType<typeof fetchCustomers>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers(filters);
      setCustomers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden klanten';
      setError(msg);
      toast({ title: 'Laden mislukt', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { customers, loading, error, refetch: load };
}

/**
 * Hook for customer statistics (total, active, credit-blocked).
 */
export function useCustomerStats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchCustomerStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

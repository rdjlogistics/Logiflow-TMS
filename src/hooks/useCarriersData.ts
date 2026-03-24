import { useState, useEffect, useCallback } from 'react';
import {
  fetchCarriers,
  fetchCarrierStats,
  type CarrierFilters,
} from '@/services/carriers';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for fetching and filtering carriers with automatic refresh.
 *
 * Example:
 *   const { carriers, loading, refetch } = useCarriersData({ isActive: true });
 */
export function useCarriersData(filters: CarrierFilters = {}) {
  const [carriers, setCarriers] = useState<Awaited<ReturnType<typeof fetchCarriers>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCarriers(filters);
      setCarriers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden charters';
      setError(msg);
      toast({ title: 'Laden mislukt', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { carriers, loading, error, refetch: load };
}

/**
 * Hook for carrier statistics (total, active, avg rating).
 */
export function useCarrierStats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchCarrierStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCarrierStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

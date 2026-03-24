import { useState, useEffect, useCallback } from 'react';
import {
  fetchDrivers,
  fetchDriverStats,
  type DriverFilters,
} from '@/services/drivers';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for fetching and filtering drivers with automatic refresh.
 *
 * Example:
 *   const { drivers, loading, refetch } = useDriversData({ status: 'active' });
 */
export function useDriversData(filters: DriverFilters = {}) {
  const [drivers, setDrivers] = useState<Awaited<ReturnType<typeof fetchDrivers>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDrivers(filters);
      setDrivers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden chauffeurs';
      setError(msg);
      toast({ title: 'Laden mislukt', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { drivers, loading, error, refetch: load };
}

/**
 * Hook for driver statistics (total, active, expiring compliance).
 */
export function useDriverStats() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDriverStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDriverStats()
      .then(setStats)
      .catch((err) => {
        console.error(err);
        toast({ title: 'Statistieken laden mislukt', description: err instanceof Error ? err.message : 'Onbekende fout', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, loading };
}

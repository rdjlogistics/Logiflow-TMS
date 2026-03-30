import { useState, useEffect, useCallback } from 'react';
import {
  fetchDrivers,
  fetchDriverStats,
  type DriverFilters,
} from '@/services/drivers';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';

/**
 * Hook for fetching and filtering drivers with automatic refresh.
 * Automatically injects companyId for defense-in-depth tenant isolation.
 */
export function useDriversData(filters: DriverFilters = {}) {
  const { company } = useCompany();
  const [drivers, setDrivers] = useState<Awaited<ReturnType<typeof fetchDrivers>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDrivers({ ...filters, companyId: company.id });
      setDrivers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden chauffeurs';
      setError(msg);
      toast({ title: 'Laden mislukt', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters), company?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

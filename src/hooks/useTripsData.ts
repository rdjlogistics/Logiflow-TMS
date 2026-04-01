import { useState, useEffect, useCallback } from 'react';
import { fetchTrips, fetchTripStats, type TripFilters } from '@/services/trips';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for fetching and filtering trips with automatic refresh.
 * Wraps the trips service with loading state, error handling, and refetch.
 */
export function useTripsData(filters: TripFilters = {}) {
  const [trips, setTrips] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await fetchTrips(filters);
      setTrips(data);
      setTotalCount(count);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fout bij laden ritten';
      setError(msg);
      toast({ title: 'Laden mislukt', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return { trips, totalCount, loading, error, refetch: load };
}

/**
 * Hook for trip statistics (total revenue, cost, km, by status).
 */
export function useTripStats(companyId?: string) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchTripStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTripStats(companyId)
      .then(setStats)
      .catch((err) => {
        console.error(err);
        toast({ title: 'Statistieken laden mislukt', description: err instanceof Error ? err.message : 'Onbekende fout', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, loading };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/utils/storageUtils';

export interface StopProofRecord {
  id: string;
  stop_id: string;
  trip_id: string;
  driver_id: string;
  signature_url: string | null;
  photo_urls: string[] | null;
  receiver_first_name: string | null;
  receiver_last_name: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  waiting_minutes: number | null;
  loading_minutes: number | null;
  actual_distance_km: number | null;
  sub_status: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  created_at: string;
  // Joined fields
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  stop_company_name: string | null;
  stop_address: string | null;
  stop_city: string | null;
  driver_name: string | null;
  driver_remarks: string | null;
  // Derived
  status: 'signed' | 'photo_only' | 'pending';
}

// Cache for signed URLs (valid 1 hour)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function useStopProofs() {
  const [proofs, setProofs] = useState<StopProofRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchProofs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rawProofs, error: queryError } = await supabase
        .from('stop_proofs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (queryError) throw queryError;
      if (!rawProofs || rawProofs.length === 0) {
        setProofs([]);
        return;
      }

      const tripIds = [...new Set(rawProofs.map(r => r.trip_id))];
      const stopIds = [...new Set(rawProofs.map(r => r.stop_id))];
      const driverIds = [...new Set(rawProofs.map(r => r.driver_id))];

      const [tripsRes, stopsRes, driversRes] = await Promise.all([
        supabase.from('trips').select('id, order_number, customer_id, customers:customer_id (company_name, email)').in('id', tripIds),
        supabase.from('route_stops').select('id, company_name, address, city, driver_remarks').in('id', stopIds),
        supabase.from('drivers').select('id, name').in('id', driverIds),
      ]);

      const tripsMap = new Map((tripsRes.data || []).map((t: any) => [t.id, t]));
      const stopsMap = new Map((stopsRes.data || []).map((s: any) => [s.id, s]));
      const driversMap = new Map((driversRes.data || []).map((d: any) => [d.id, d]));

      const mapped: StopProofRecord[] = rawProofs.map((row: any) => {
        const hasSignature = !!row.signature_url;
        const hasPhotos = row.photo_urls && row.photo_urls.length > 0;
        const trip = tripsMap.get(row.trip_id);
        const stop = stopsMap.get(row.stop_id);
        const driver = driversMap.get(row.driver_id);

        return {
          id: row.id,
          stop_id: row.stop_id,
          trip_id: row.trip_id,
          driver_id: row.driver_id,
          signature_url: row.signature_url,
          photo_urls: row.photo_urls,
          receiver_first_name: row.receiver_first_name,
          receiver_last_name: row.receiver_last_name,
          arrival_time: row.arrival_time,
          departure_time: row.departure_time,
          waiting_minutes: row.waiting_minutes,
          loading_minutes: row.loading_minutes,
          actual_distance_km: row.actual_distance_km,
          sub_status: row.sub_status,
          note: row.note,
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy,
          created_at: row.created_at,
          order_number: trip?.order_number || null,
          customer_name: trip?.customers?.company_name || null,
          stop_company_name: stop?.company_name || null,
          stop_address: stop?.address || null,
          stop_city: stop?.city || null,
          driver_name: profile?.full_name || null,
          driver_remarks: stop?.driver_remarks || null,
          status: hasSignature ? 'signed' : hasPhotos ? 'photo_only' : 'pending',
        };
      });

      setProofs(mapped);
    } catch (err: any) {
      console.error('Error fetching stop proofs:', err);
      setError(err.message || 'Fout bij ophalen van afleverbewijzen');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCachedSignedUrl = useCallback(async (path: string): Promise<string | null> => {
    if (!path) return null;
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    const url = await getSignedUrl('pod-files', path);
    if (url) signedUrlCache.set(path, { url, expiresAt: Date.now() + 55 * 60 * 1000 });
    return url;
  }, []);

  const getSignedUrls = useCallback(async (paths: string[]): Promise<string[]> => {
    const results = await Promise.all(paths.map(p => getCachedSignedUrl(p)));
    return results.filter((u): u is string => u !== null);
  }, [getCachedSignedUrl]);

  useEffect(() => {
    fetchProofs();
    channelRef.current = supabase
      .channel(`stop_proofs_realtime-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stop_proofs' }, () => fetchProofs())
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [fetchProofs]);

  const stats = {
    total: proofs.length,
    signed: proofs.filter(p => p.status === 'signed').length,
    photoOnly: proofs.filter(p => p.status === 'photo_only').length,
    pending: proofs.filter(p => p.status === 'pending').length,
  };

  return { proofs, loading, error, stats, refetch: fetchProofs, getCachedSignedUrl, getSignedUrls };
}

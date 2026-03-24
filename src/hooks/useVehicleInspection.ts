import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface InspectionItem {
  name: string;
  status: 'ok' | 'nok' | 'na';
  notes?: string;
  photo_url?: string;
  critical?: boolean;
}

export const DEFAULT_INSPECTION_ITEMS: InspectionItem[] = [
  { name: 'Remmen', status: 'ok', critical: true },
  { name: 'Banden', status: 'ok', critical: true },
  { name: 'Verlichting', status: 'ok', critical: true },
  { name: 'Vloeistoffen', status: 'ok', critical: false },
  { name: 'Spiegels', status: 'ok', critical: false },
  { name: 'Lading/Bevestiging', status: 'ok', critical: true },
  { name: 'Documenten', status: 'ok', critical: false },
  { name: 'Exterieur', status: 'ok', critical: false },
];

interface VehicleInspection {
  id: string;
  inspection_date: string;
  status: string;
  items: InspectionItem[];
  overall_notes: string | null;
  vehicle_id: string | null;
}

interface UseVehicleInspectionReturn {
  todayInspection: VehicleInspection | null;
  isRequired: boolean;
  loading: boolean;
  submitInspection: (params: {
    vehicleId: string;
    tripId?: string;
    items: InspectionItem[];
    notes?: string;
    photoUrls?: string[];
  }) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useVehicleInspection(): UseVehicleInspectionReturn {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [todayInspection, setTodayInspection] = useState<VehicleInspection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('drivers')
      .select('id, tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDriverId(data.id);
          setTenantId(data.tenant_id);
        }
      });
  }, [user?.id]);

  const fetchToday = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('vehicle_inspections')
      .select('id, inspection_date, status, items, overall_notes, vehicle_id')
      .eq('driver_id', driverId)
      .eq('inspection_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setTodayInspection({
        ...data,
        items: (data.items as any) || [],
      });
    } else {
      setTodayInspection(null);
    }
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const isRequired = !todayInspection;

  const submitInspection = useCallback(async ({
    vehicleId,
    tripId,
    items,
    notes,
    photoUrls,
  }: {
    vehicleId: string;
    tripId?: string;
    items: InspectionItem[];
    notes?: string;
    photoUrls?: string[];
  }): Promise<boolean> => {
    if (!driverId || !tenantId) return false;

    const hasCriticalFailure = items.some(i => i.critical && i.status === 'nok');
    const hasAnyFailure = items.some(i => i.status === 'nok');
    const status = hasCriticalFailure ? 'failed' : hasAnyFailure ? 'partial' : 'passed';

    const { error } = await supabase
      .from('vehicle_inspections')
      .insert({
        driver_id: driverId,
        vehicle_id: vehicleId,
        trip_id: tripId || null,
        tenant_id: tenantId,
        items: items as any,
        overall_notes: notes || null,
        photo_urls: photoUrls || null,
        status,
      });

    if (error) {
      console.error('Inspection submit error:', error);
      return false;
    }

    await fetchToday();
    return true;
  }, [driverId, tenantId, fetchToday]);

  return {
    todayInspection,
    isRequired,
    loading,
    submitInspection,
    refetch: fetchToday,
  };
}

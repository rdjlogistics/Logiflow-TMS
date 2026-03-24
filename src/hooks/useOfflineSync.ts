import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';

export interface OfflineCheckout {
  id: string;
  tripId: string;
  stopId: string;
  stopOrder: number;
  signatureDataUrl: string | null;
  photos: string[]; // base64 data URLs
  formData: {
    receiverFirstName: string;
    receiverLastName: string;
    arrivalTime: string;
    departureTime: string;
    waitingMinutes: number;
    loadingMinutes: number;
    actualDistanceKm: number | null;
    subStatus: string | null;
    note: string;
  };
  gpsData: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  };
  createdAt: string;
  retryCount: number;
}

const STORAGE_KEY = 'offline_checkouts';
const MAX_RETRIES = 5;

export const useOfflineSync = () => {
  const { toast } = useToast();
  const [pendingCheckouts, setPendingCheckouts] = useState<OfflineCheckout[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load pending checkouts from localStorage
  const loadPendingCheckouts = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OfflineCheckout[];
        setPendingCheckouts(parsed);
        return parsed;
      }
    } catch {
      // Silent fail for localStorage read
    }
    return [];
  }, []);

  // Save pending checkouts to localStorage
  const savePendingCheckouts = useCallback((checkouts: OfflineCheckout[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checkouts));
      setPendingCheckouts(checkouts);
    } catch {
      // Silent fail for localStorage write
    }
  }, []);

  // Add a checkout to the offline queue
  const queueCheckout = useCallback((checkout: Omit<OfflineCheckout, 'id' | 'createdAt' | 'retryCount'>) => {
    const newCheckout: OfflineCheckout = {
      ...checkout,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    const current = loadPendingCheckouts();
    const updated = [...current, newCheckout];
    savePendingCheckouts(updated);

    toast({
      title: 'Offline opgeslagen',
      description: 'Afmelding wordt verstuurd zodra er verbinding is',
    });

    return newCheckout.id;
  }, [loadPendingCheckouts, savePendingCheckouts, toast]);

  // Convert base64 to File
  const base64ToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Upload signature to storage
  const uploadSignature = async (dataUrl: string, tripId: string, stopId: string): Promise<string | null> => {
    try {
      const file = base64ToFile(dataUrl, `signature_${stopId}.png`);
      const filePath = `${tripId}/${stopId}/signature_${Date.now()}.png`;
      
      const { error } = await supabase.storage
        .from('pod-files')
        .upload(filePath, file);

      if (error) throw error;

      return filePath;
    } catch {
      return null;
    }
  };

  // Upload photos to storage
  const uploadPhotos = async (photos: string[], tripId: string, stopId: string): Promise<string[]> => {
    const filePaths: string[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      try {
        const file = base64ToFile(photos[i], `photo_${stopId}_${i}.jpg`);
        const filePath = `${tripId}/${stopId}/photo_${Date.now()}_${i}.jpg`;
        
        const { error } = await supabase.storage
          .from('pod-files')
          .upload(filePath, file);

        if (error) throw error;

        filePaths.push(filePath);
      } catch {
        // Continue with next photo
      }
    }
    
    return filePaths;
  };

  // Process a single checkout
  const processCheckout = async (checkout: OfflineCheckout): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Resolve drivers.id from auth.uid() — RLS requires drivers.id, not auth.uid()
      const { data: driverRecord, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverError || !driverRecord) throw new Error('Driver profile not found');

      // Upload signature
      let signatureUrl: string | null = null;
      if (checkout.signatureDataUrl) {
        signatureUrl = await uploadSignature(checkout.signatureDataUrl, checkout.tripId, checkout.stopId);
      }

      // Upload photos
      const photoUrls = await uploadPhotos(checkout.photos, checkout.tripId, checkout.stopId);

      // Create stop proof record — include all fields matching the online flow
      const { error: proofError } = await supabase
        .from('stop_proofs')
        .insert({
          trip_id: checkout.tripId,
          stop_id: checkout.stopId,
          driver_id: driverRecord.id,
          signature_url: signatureUrl,
          photo_urls: photoUrls,
          receiver_first_name: checkout.formData.receiverFirstName,
          receiver_last_name: checkout.formData.receiverLastName,
          arrival_time: checkout.formData.arrivalTime,
          departure_time: checkout.formData.departureTime,
          waiting_minutes: checkout.formData.waitingMinutes,
          loading_minutes: checkout.formData.loadingMinutes || null,
          actual_distance_km: checkout.formData.actualDistanceKm,
          sub_status: checkout.formData.subStatus,
          note: checkout.formData.note || null,
          latitude: checkout.gpsData.latitude,
          longitude: checkout.gpsData.longitude,
          accuracy: checkout.gpsData.accuracy,
        });

      if (proofError) throw proofError;

      // Update stop status
      const { error: stopError } = await supabase
        .from('route_stops')
        .update({
          status: 'completed',
          actual_arrival: checkout.formData.arrivalTime,
        })
        .eq('id', checkout.stopId);

      if (stopError) throw stopError;

      // Replicate processCheckoutData: atomic cumulative update via RPC
      const waitToAdd = checkout.formData.waitingMinutes || 0;
      const loadToAdd = checkout.formData.loadingMinutes || 0;
      if (waitToAdd > 0 || loadToAdd > 0) {
        await supabase.rpc('increment_trip_cumulative', {
          p_trip_id: checkout.tripId,
          p_wait_minutes: waitToAdd,
          p_load_minutes: loadToAdd,
        });
      }

      // Apply trip-level fields (distance, sub_status)
      const tripFieldUpdates: Record<string, unknown> = {};
      if (checkout.formData.actualDistanceKm != null) {
        tripFieldUpdates.purchase_distance_km = checkout.formData.actualDistanceKm;
      }
      if (checkout.formData.subStatus) {
        tripFieldUpdates.sub_status = checkout.formData.subStatus;
      }
      if (Object.keys(tripFieldUpdates).length > 0) {
        await supabase.from('trips').update(tripFieldUpdates).eq('id', checkout.tripId);
      }

      // Get all stops for this trip
      const { data: allStops } = await supabase
        .from('route_stops')
        .select('*')
        .eq('trip_id', checkout.tripId)
        .order('stop_order');

      const stops = allStops || [];
      const completedStops = stops.filter(s => s.status === 'completed');
      const isLastStop = completedStops.length === stops.length;

      // Determine new trip status — matching online flow exactly (single if/else if)
      const isFirstStop = checkout.stopOrder === 1 || completedStops.length === 1;

      if (isLastStop) {
        // Last stop: determine final status based on customer checkout_mode
        let checkoutMode = 'to_planning';
        const { data: tripData } = await supabase
          .from('trips')
          .select('customer_id, order_number')
          .eq('id', checkout.tripId)
          .single();

        if (tripData?.customer_id) {
          const { data: cs } = await supabase
            .from('customer_settings')
            .select('checkout_mode')
            .eq('customer_id', tripData.customer_id)
            .maybeSingle();
          if (cs?.checkout_mode) {
            checkoutMode = cs.checkout_mode as string;
          }
        }

        const newStatus = checkoutMode === 'direct_complete' ? 'afgerond' : 'afgeleverd';
        await supabase
          .from('trips')
          .update({
            status: newStatus,
            actual_arrival: checkout.formData.departureTime,
            ...(isFirstStop ? { actual_departure: checkout.formData.arrivalTime } : {}),
            ...(newStatus === 'afgerond' ? {
              checkout_completed_at: new Date().toISOString(),
              checkout_completed_by: user.id,
            } : {}),
          })
          .eq('id', checkout.tripId);

        // Auto-send vrachtbrief if tenant setting enabled
        const { data: tenantSettings } = await supabase
          .from('tenant_settings')
          .select('auto_send_pod_email')
          .maybeSingle();

        if ((newStatus === 'afgeleverd' || newStatus === 'afgerond') && tenantSettings?.auto_send_pod_email) {
          supabase.functions.invoke('auto-send-vrachtbrief', { body: { tripId: checkout.tripId } })
            .catch((err) => console.error('[OfflineSync] Auto-send vrachtbrief failed:', err));
        }

        if (newStatus === 'afgeleverd') {
          supabase.functions.invoke('send-delivery-confirmation', { body: { tripId: checkout.tripId } })
            .catch((err) => console.error('[OfflineSync] Send delivery confirmation failed:', err));
        }

        // Notify B2B customer of status change
        notifyCustomerStatusChange(tripData?.customer_id, checkout.tripId, newStatus, tripData?.order_number);
      } else if (isFirstStop && stops.length > 1) {
        // First stop of multi-stop trip: set 'onderweg'
        await supabase.from('trips').update({
          status: 'onderweg',
          actual_departure: checkout.formData.arrivalTime,
        }).eq('id', checkout.tripId);

        // Notify B2B customer trip is underway
        const { data: tripForNotif } = await supabase
          .from('trips')
          .select('customer_id, order_number')
          .eq('id', checkout.tripId)
          .single();
        notifyCustomerStatusChange(tripForNotif?.customer_id, checkout.tripId, 'onderweg', tripForNotif?.order_number);
      }

      // Log order event
      await supabase.from('order_events').insert({
        order_id: checkout.tripId,
        event_type: isLastStop ? 'STOP_2_COMPLETED' : 'STOP_COMPLETED',
        actor_user_id: user.id,
        payload: {
          stop_id: checkout.stopId,
          stop_order: checkout.stopOrder,
          completed_at: checkout.formData.departureTime,
          offline_sync: true,
          original_created_at: checkout.createdAt,
          gps: checkout.gpsData,
        },
      });

      return true;
    } catch {
      return false;
    }
  };

  // Sync all pending checkouts
  const syncPendingCheckouts = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    const pending = loadPendingCheckouts();
    if (pending.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let failedCheckouts: OfflineCheckout[] = [];

    for (const checkout of pending) {
      const success = await processCheckout(checkout);
      
      if (success) {
        successCount++;
      } else {
        const updated = {
          ...checkout,
          retryCount: checkout.retryCount + 1,
        };
        
        if (updated.retryCount < MAX_RETRIES) {
          failedCheckouts.push(updated);
        }
      }
    }

    savePendingCheckouts(failedCheckouts);

    if (successCount > 0) {
      toast({
        title: 'Synchronisatie voltooid',
        description: `${successCount} afmelding${successCount > 1 ? 'en' : ''} succesvol verstuurd`,
      });
    }

    if (failedCheckouts.length > 0) {
      toast({
        title: 'Enkele afmeldingen niet verstuurd',
        description: `${failedCheckouts.length} afmelding${failedCheckouts.length > 1 ? 'en' : ''} worden later opnieuw geprobeerd`,
        variant: 'destructive',
      });
    }

    setIsSyncing(false);
  }, [isSyncing, isOnline, loadPendingCheckouts, savePendingCheckouts, toast]);

  // Remove a checkout from the queue
  const removeCheckout = useCallback((checkoutId: string) => {
    const current = loadPendingCheckouts();
    const updated = current.filter(c => c.id !== checkoutId);
    savePendingCheckouts(updated);
  }, [loadPendingCheckouts, savePendingCheckouts]);

  // Clear all pending checkouts
  const clearAllPending = useCallback(() => {
    savePendingCheckouts([]);
  }, [savePendingCheckouts]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadPendingCheckouts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadPendingCheckouts]);

  // Auto-sync when coming online or on mount
  useEffect(() => {
    if (isOnline && pendingCheckouts.length > 0 && !isSyncing) {
      const timeoutId = setTimeout(() => {
        syncPendingCheckouts();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline, pendingCheckouts.length, isSyncing, syncPendingCheckouts]);

  return {
    pendingCheckouts,
    pendingCount: pendingCheckouts.length,
    isOnline,
    isSyncing,
    queueCheckout,
    syncPendingCheckouts,
    removeCheckout,
    clearAllPending,
  };
};

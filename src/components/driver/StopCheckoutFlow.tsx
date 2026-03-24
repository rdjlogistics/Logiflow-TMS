import { useState } from 'react';
import { format } from 'date-fns';
import { SignaturePad } from './SignaturePad';
import { PhotoCapture } from './PhotoCapture';
import { CheckoutForm, CheckoutFormData } from './CheckoutForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';

interface StopCheckoutFlowProps {
  stop: {
    id: string;
    trip_id: string;
    stop_order: number;
    company_name: string | null;
    address: string;
    city: string | null;
  };
  tripId: string;
  isLastStop?: boolean;
  totalStops?: number;
  onComplete: () => void;
  onCancel: () => void;
}

type CheckoutStep = 'signature' | 'photos' | 'form';

// BUG 2 FIX: Build proper ISO timestamps using local date, with overnight detection
const buildTimestamp = (timeStr: string, baseDate: Date, isAfterMidnight = false): string => {
  const localDate = format(baseDate, 'yyyy-MM-dd');
  const dt = new Date(`${localDate}T${timeStr}:00`);
  if (isAfterMidnight) {
    dt.setDate(dt.getDate() + 1);
  }
  return dt.toISOString();
};

export const StopCheckoutFlow = ({
  stop,
  tripId,
  isLastStop = false,
  onComplete,
  onCancel,
}: StopCheckoutFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, queueCheckout } = useOfflineSync();
  const { data: tenantSettings } = useTenantSettings();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('signature');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  // Convert file to base64 for offline storage
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // BUG 4 FIX: Upload signature — throws on failure instead of returning null
  const uploadSignature = async (dataUrl: string): Promise<string> => {
    const blob = await fetch(dataUrl).then(r => r.blob());
    const fileName = `${tripId}/${stop.id}/signature-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from('pod-files')
      .upload(fileName, blob, { contentType: 'image/png', upsert: true });
    if (error) throw new Error(`Handtekening upload mislukt: ${error.message}`);
    return fileName;
  };

  // BUG 5 FIX: Upload photos — reports partial failures
  const uploadPhotos = async (photoFiles: File[]): Promise<{ paths: string[]; failedCount: number }> => {
    const paths: string[] = [];
    let failedCount = 0;
    for (const file of photoFiles) {
      try {
        const fileName = `${tripId}/${stop.id}/photo-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage
          .from('pod-files')
          .upload(fileName, file, { contentType: file.type, upsert: true });
        if (error) throw error;
        paths.push(fileName);
      } catch (error) {
        console.error('Error uploading photo:', error);
        failedCount++;
      }
    }
    return { paths, failedCount };
  };

  // Get current GPS position
  const getCurrentPosition = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    if (!('geolocation' in navigator)) return null;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      return { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
    } catch {
      return null;
    }
  };

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setCurrentStep('photos');
  };

  const handlePhotosSave = (photoFiles: File[]) => {
    setPhotos(photoFiles);
    setCurrentStep('form');
  };

  // ========================================
  // BUG 1 FIX: Use atomic RPC for cumulative updates
  // ========================================
  const processCheckoutData = async (formData: CheckoutFormData) => {
    const settings = tenantSettings;
    if (!settings) return;

    // Atomic cumulative update via RPC (no more read-then-update race condition)
    const waitToAdd = settings.driver_app_auto_save_waiting ? formData.waitingMinutes : 0;
    const loadToAdd = settings.driver_app_auto_save_loading ? (formData.loadingMinutes || 0) : 0;

    if (waitToAdd > 0 || loadToAdd > 0) {
      await supabase.rpc('increment_trip_cumulative', {
        p_trip_id: tripId,
        p_wait_minutes: waitToAdd,
        p_load_minutes: loadToAdd,
      });
    }

    const tripUpdates: Record<string, unknown> = {};

    // Auto-save distance to trips.purchase_distance_km (only last stop)
    if (settings.driver_app_auto_save_distance && isLastStop && formData.actualDistanceKm != null) {
      tripUpdates.purchase_distance_km = formData.actualDistanceKm;
    }

    // Save sub_status to trip
    if (formData.subStatus) {
      tripUpdates.sub_status = formData.subStatus;
    }

    // Apply trip updates if any
    if (Object.keys(tripUpdates).length > 0) {
      await supabase.from('trips').update(tripUpdates).eq('id', tripId);
    }

    // Handle remarks: separate field (internal) vs public
    const routeStopUpdates: Record<string, unknown> = {};
    if (formData.note) {
      if (settings.driver_app_separate_remarks_field) {
        routeStopUpdates.driver_remarks = formData.note;
      } else {
        routeStopUpdates.notes = formData.note;
      }
    }

    if (Object.keys(routeStopUpdates).length > 0) {
      await supabase.from('route_stops').update(routeStopUpdates).eq('id', stop.id);
    }
  };

  // BUG 7 FIX: Build complete offline payload with all fields
  const buildOfflinePayload = (formData: CheckoutFormData, arrivalTime: string, departureTime: string, gpsData: { latitude: number; longitude: number; accuracy: number } | null) => ({
    tripId,
    stopId: stop.id,
    stopOrder: stop.stop_order,
    signatureDataUrl,
    photos: [] as string[], // filled with base64 before queuing
    formData: {
      receiverFirstName: formData.receiverFirstName,
      receiverLastName: formData.receiverLastName,
      arrivalTime,
      departureTime,
      waitingMinutes: formData.waitingMinutes,
      loadingMinutes: formData.loadingMinutes || 0,
      actualDistanceKm: formData.actualDistanceKm ?? null,
      subStatus: formData.subStatus || null,
      note: formData.note,
    },
    gpsData: {
      latitude: gpsData?.latitude || null,
      longitude: gpsData?.longitude || null,
      accuracy: gpsData?.accuracy || null,
    },
  });

  const handleFormSubmit = async (formData: CheckoutFormData) => {
    if (!user) return;

    const gpsData = await getCurrentPosition();

    // BUG 2 FIX: Use local date and detect overnight departure
    const now = new Date();
    const arrivalTime = buildTimestamp(formData.arrivalTime, now);
    let departureTime = buildTimestamp(formData.departureTime, now);

    // Overnight detection: if departure is before arrival, add 1 day
    if (new Date(departureTime) < new Date(arrivalTime)) {
      departureTime = buildTimestamp(formData.departureTime, now, true);
    }

    // Offline flow
    if (!isOnline) {
      try {
        const photoBase64s = await Promise.all(photos.map(f => fileToBase64(f)));
        const payload = buildOfflinePayload(formData, arrivalTime, departureTime, gpsData);
        payload.photos = photoBase64s;
        queueCheckout(payload);
        onComplete();
        return;
      } catch (error) {
        console.error('Error queuing offline checkout:', error);
        toast({ title: 'Fout', description: 'Kon afmelding niet opslaan', variant: 'destructive' });
        return;
      }
    }

    // Online flow
    try {
      // Resolve drivers.id from auth.uid() — RLS requires drivers.id, not auth.uid()
      const { data: driverRecord, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driverError || !driverRecord) {
        throw new Error('Chauffeursprofiel niet gevonden. Neem contact op met de beheerder.');
      }

      // Upload signature and photos in parallel
      const [signatureResult, photosResult] = await Promise.all([
        signatureDataUrl ? uploadSignature(signatureDataUrl) : Promise.resolve(null),
        uploadPhotos(photos),
      ]);
      const signatureUrl = signatureResult;
      const { paths: photoUrls, failedCount: photoFailures } = photosResult;

      if (photoFailures > 0) {
        toast({
          title: 'Waarschuwing',
          description: `${photoFailures} van ${photos.length} foto's konden niet worden geüpload`,
          variant: 'destructive',
        });
      }

      // Create stop_proof record
      const { error: proofError } = await supabase.from('stop_proofs').insert({
        stop_id: stop.id,
        trip_id: tripId,
        driver_id: driverRecord.id,
        signature_url: signatureUrl,
        photo_urls: photoUrls,
        receiver_first_name: formData.receiverFirstName,
        receiver_last_name: formData.receiverLastName,
        arrival_time: arrivalTime,
        departure_time: departureTime,
        waiting_minutes: formData.waitingMinutes,
        loading_minutes: formData.loadingMinutes || null,
        actual_distance_km: formData.actualDistanceKm,
        sub_status: formData.subStatus,
        note: formData.note || null,
        latitude: gpsData?.latitude,
        longitude: gpsData?.longitude,
        accuracy: gpsData?.accuracy,
      });

      if (proofError) throw proofError;

      // Update stop status
      const { error: stopError } = await supabase
        .from('route_stops')
        .update({ status: 'completed', actual_arrival: arrivalTime })
        .eq('id', stop.id);

      if (stopError) throw stopError;

      // Process checkout data (atomic cumulative updates)
      await processCheckoutData(formData);

      // BUG 3 FIX: No more || s.id === stop.id — status is already 'completed'
      const { data: allStops } = await supabase
        .from('route_stops')
        .select('*')
        .eq('trip_id', tripId)
        .order('stop_order');

      const stops = allStops || [];
      const completedStops = stops.filter(s => s.status === 'completed');
      const isFirstStop = stop.stop_order === 1 || completedStops.length === 1;
      const allCompleted = completedStops.length === stops.length;

      let newTripStatus: string | null = null;
      let eventType = 'STOP_COMPLETED';

      if (isFirstStop && stops.length > 1) {
        newTripStatus = 'onderweg';
        eventType = 'STOP_1_COMPLETED';
      } else if (allCompleted) {
        const { data: tripData } = await supabase
          .from('trips')
          .select('customer_id')
          .eq('id', tripId)
          .single();

        let checkoutMode = 'to_planning';
        if (tripData?.customer_id) {
          const { data: cs } = await supabase
            .from('customer_settings')
            .select('checkout_mode')
            .eq('customer_id', tripData.customer_id)
            .maybeSingle();
          checkoutMode = cs?.checkout_mode || 'to_planning';
        }

        if (checkoutMode === 'direct_complete') {
          newTripStatus = 'afgerond';
        } else {
          newTripStatus = 'afgeleverd';
        }
        eventType = 'STOP_2_COMPLETED';
      }

      if (newTripStatus) {
        const statusUpdates: Record<string, unknown> = { status: newTripStatus };
        if (newTripStatus === 'onderweg') statusUpdates.actual_departure = arrivalTime;
        else if (newTripStatus === 'afgeleverd') {
          statusUpdates.actual_arrival = departureTime;
        } else if (newTripStatus === 'afgerond') {
          statusUpdates.actual_arrival = departureTime;
          statusUpdates.checkout_completed_at = new Date().toISOString();
          statusUpdates.checkout_completed_by = user.id;
        }

        await supabase.from('trips').update(statusUpdates).eq('id', tripId);

        // Notify B2B customer of status change
        const { data: tripForNotif } = await supabase
          .from('trips')
          .select('customer_id, order_number')
          .eq('id', tripId)
          .single();
        notifyCustomerStatusChange(tripForNotif?.customer_id, tripId, newTripStatus, tripForNotif?.order_number);

        if ((newTripStatus === 'afgeleverd' || newTripStatus === 'afgerond') && tenantSettings?.auto_send_pod_email) {
          supabase.functions.invoke('auto-send-vrachtbrief', { body: { tripId } })
            .catch((err) => console.error('Auto-send vrachtbrief failed:', err));
        }

        if (newTripStatus === 'afgeleverd') {
          supabase.functions.invoke('send-delivery-confirmation', { body: { tripId } })
            .catch((err) => console.error('Send delivery confirmation failed:', err));
        }
      }

      // Log order event
      await supabase.from('order_events').insert({
        order_id: tripId,
        event_type: eventType,
        actor_user_id: user.id,
        payload: {
          stop_id: stop.id,
          stop_order: stop.stop_order,
          receiver_name: `${formData.receiverFirstName} ${formData.receiverLastName}`,
          arrival_time: arrivalTime,
          departure_time: departureTime,
          waiting_minutes: formData.waitingMinutes,
          loading_minutes: formData.loadingMinutes,
          actual_distance_km: formData.actualDistanceKm,
          sub_status: formData.subStatus,
          has_signature: !!signatureUrl,
          photo_count: photoUrls.length,
          gps: gpsData,
          new_trip_status: newTripStatus,
        },
      });

      toast({
        title: 'Stop afgemeld!',
        description: newTripStatus === 'afgeleverd' ? 'Rit afgeleverd! Klant ontvangt bevestiging.' : newTripStatus === 'afgerond' ? 'Rit afgemeld naar planning.' : 'Stop succesvol afgemeld',
      });

      onComplete();
    } catch (error: unknown) {
      console.error('Checkout error:', error);

      // Fallback to offline queue
      try {
        const photoBase64s = await Promise.all(photos.map(f => fileToBase64(f)));
        const payload = buildOfflinePayload(formData, arrivalTime, departureTime, gpsData);
        payload.photos = photoBase64s;
        queueCheckout(payload);
        toast({ title: 'Opgeslagen voor later', description: 'Afmelding wordt verstuurd zodra er verbinding is' });
        onComplete();
      } catch (offlineError) {
        toast({
          title: 'Fout bij afmelden',
          description: error instanceof Error ? error.message : 'Er is een fout opgetreden',
          variant: 'destructive',
        });
      }
    }
  };

  if (currentStep === 'signature') {
    return <SignaturePad onSave={handleSignatureSave} onCancel={onCancel} />;
  }

  if (currentStep === 'photos') {
    return <PhotoCapture onSave={handlePhotosSave} onCancel={() => setCurrentStep('signature')} />;
  }

  return (
    <CheckoutForm
      stop={stop}
      isLastStop={isLastStop}
      onSubmit={handleFormSubmit}
      onCancel={() => setCurrentStep('photos')}
    />
  );
};

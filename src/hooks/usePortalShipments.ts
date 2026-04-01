import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PortalShipment {
  id: string;
  referenceNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'delivered';
  fromCity: string;
  toCity: string;
  fromAddress?: string;
  toAddress?: string;
  fromPostalCode?: string;
  toPostalCode?: string;
  createdAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  trackingCode?: string;
  carrier?: string;
  parcels: number;
  weight?: number;
  price?: number;
  description?: string;
  tripId?: string;
  driverPhone?: string;
  driverName?: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    recordedAt: string;
  };
}

export interface SubmissionData {
  pickupCompany: string;
  pickupAddress: string;
  pickupPostalCode: string;
  pickupCity: string;
  pickupHouseNumber?: string;
  pickupContactPerson?: string;
  pickupPhone?: string;
  pickupEmail?: string;
  pickupDate: string;
  pickupTimeFrom?: string;
  pickupTimeTo?: string;
  deliveryCompany: string;
  deliveryAddress: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryHouseNumber?: string;
  deliveryContactPerson?: string;
  deliveryPhone?: string;
  deliveryEmail?: string;
  deliveryDate?: string;
  deliveryTimeFrom?: string;
  deliveryTimeTo?: string;
  productDescription?: string;
  quantity?: number;
  weightKg?: number;
  volumeM3?: number;
  specialInstructions?: string;
  referenceNumber?: string;
  serviceType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * @deprecated Use usePortalData() instead for shipment listing.
 * Kept only for reference — do not use in new code.
 */
export function usePortalShipments(_customerId?: string) {
  console.warn('usePortalShipments is deprecated. Use usePortalData() instead.');
  return {
    shipments: [] as PortalShipment[],
    loading: false,
    error: null,
    stats: { pending: 0, active: 0, delivered: 0, problems: 0, total: 0 },
    refetch: async () => {},
  };
}

export function useCreateSubmission() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubmission = async (data: SubmissionData, customerId: string) => {
    try {
      setLoading(true);
      setError(null);

      const insertPayload = {
          customer_id: customerId,
          pickup_company: data.pickupCompany || 'Ophaaladres',
          pickup_address: data.pickupAddress,
          pickup_postal_code: data.pickupPostalCode,
          pickup_city: data.pickupCity,
          house_number_pickup: data.pickupHouseNumber,
          pickup_contact_person: data.pickupContactPerson,
          pickup_phone: data.pickupPhone,
          pickup_email: data.pickupEmail,
          pickup_date: data.pickupDate,
          pickup_time_from: data.pickupTimeFrom,
          pickup_time_to: data.pickupTimeTo,
          delivery_company: data.deliveryCompany || 'Afleveradres',
          delivery_address: data.deliveryAddress,
          delivery_postal_code: data.deliveryPostalCode,
          delivery_city: data.deliveryCity,
          house_number_delivery: data.deliveryHouseNumber,
          delivery_contact_person: data.deliveryContactPerson,
          delivery_phone: data.deliveryPhone,
          delivery_email: data.deliveryEmail,
          delivery_date: data.deliveryDate,
          delivery_time_from: data.deliveryTimeFrom,
          delivery_time_to: data.deliveryTimeTo,
          product_description: data.productDescription,
          quantity: data.quantity || 1,
          weight_kg: data.weightKg,
          volume_m3: data.volumeM3,
          special_instructions: data.specialInstructions,
          reference_number: data.referenceNumber,
          service_type: data.serviceType || 'standard',
          status: 'pending',
          metadata: data.metadata || {},
      } as any;

      const { data: submission, error: insertError } = await supabase
        .from('customer_submissions')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) throw insertError;

      // Fetch order number from auto-created trip
      let orderNumber = submission.reference_number || submission.id.slice(0, 8).toUpperCase();
      if (submission.converted_trip_id) {
        const { data: trip } = await supabase
          .from('trips')
          .select('order_number')
          .eq('id', submission.converted_trip_id)
          .single();
        if (trip?.order_number) orderNumber = trip.order_number;
      }

      // Fire-and-forget: notify admins/medewerkers
      try {
        supabase.functions.invoke('notify-new-submission', {
          body: {
            submissionId: submission.id,
            pickupCompany: data.pickupCompany,
            deliveryCompany: data.deliveryCompany,
            pickupCity: data.pickupCity,
            deliveryCity: data.deliveryCity,
            customerName: data.pickupCompany || 'Klant',
          },
        }).catch((err) => console.warn('Notify admins failed (non-blocking):', err));

        // Fire-and-forget: send confirmation email to customer
        supabase.functions.invoke('send-submission-confirmation', {
          body: { submissionId: submission.id },
        }).catch((err) => console.warn('Confirmation email failed (non-blocking):', err));
      } catch (e) {
        console.warn('Notify admins failed (non-blocking):', e);
      }

      return { ...submission, orderNumber };
    } catch (err) {
      console.error('Error creating submission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Fout bij aanmaken zending';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createSubmission,
    loading,
    error,
  };
}

export function useShipmentTracking(shipmentId: string) {
  const [shipment, setShipment] = useState<PortalShipment | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    recordedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShipmentWithTracking = async () => {
      try {
        setLoading(true);
        setError(null);

        // First try to find as customer submission
        const { data: submission, error: subError } = await supabase
          .from('customer_submissions')
          .select('id, reference_number, status, pickup_city, delivery_city, pickup_address, delivery_address, house_number_pickup, house_number_delivery, pickup_postal_code, delivery_postal_code, created_at, delivery_date, quantity, weight_kg, estimated_price, product_description, converted_trip_id')
          .eq('id', shipmentId)
          .maybeSingle();

        if (subError) throw subError;

        if (submission) {
          let tripData: any = null;
          let locationData: any = null;

          if (submission.converted_trip_id) {
            // Fetch trip data
            const { data: trip, error: tripError } = await supabase
              .from('trips')
              .select('*')
              .eq('id', submission.converted_trip_id)
              .single();

            if (!tripError && trip) {
              tripData = trip;

              // Fetch latest driver location
              const { data: location } = await supabase
                .from('driver_locations')
                .select('*')
                .eq('trip_id', trip.id)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (location) {
                locationData = {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  heading: location.heading,
                  speed: location.speed,
                  recordedAt: location.recorded_at,
                };
              }
            }
          }

          let status: PortalShipment['status'] = 'pending';
          if (submission.status === 'approved' || submission.status === 'converted') {
            if (tripData) {
              if (tripData.status === 'afgeleverd' || tripData.status === 'afgerond' || tripData.status === 'gecontroleerd' || tripData.status === 'gefactureerd') {
                status = 'delivered';
              } else if (tripData.status === 'onderweg') {
                status = 'in_transit';
              } else {
                status = 'approved';
              }
            } else {
              status = 'approved';
            }
          } else if (submission.status === 'rejected') {
            status = 'rejected';
          }

          setShipment({
            id: submission.id,
            referenceNumber: submission.reference_number || `SUB-${submission.id.slice(0, 8).toUpperCase()}`,
            status,
            fromCity: submission.pickup_city,
            toCity: submission.delivery_city,
            fromAddress: `${submission.pickup_address}${submission.house_number_pickup ? ' ' + submission.house_number_pickup : ''}`,
            toAddress: `${submission.delivery_address}${submission.house_number_delivery ? ' ' + submission.house_number_delivery : ''}`,
            fromPostalCode: submission.pickup_postal_code ?? undefined,
            toPostalCode: submission.delivery_postal_code ?? undefined,
            createdAt: submission.created_at,
            estimatedDelivery: submission.delivery_date ?? undefined,
            deliveredAt: tripData?.actual_arrival ?? undefined,
            trackingCode: tripData?.tracking_token ?? undefined,
            parcels: submission.quantity || 1,
            weight: submission.weight_kg ? Number(submission.weight_kg) : undefined,
            price: submission.estimated_price ? Number(submission.estimated_price) : undefined,
            description: submission.product_description ?? undefined,
            tripId: submission.converted_trip_id ?? undefined,
          });

          setDriverLocation(locationData);
        }
      } catch (err) {
        console.error('Error fetching shipment tracking:', err);
        setError(err instanceof Error ? err.message : 'Fout bij ophalen tracking');
      } finally {
        setLoading(false);
      }
    };

    if (shipmentId) {
      fetchShipmentWithTracking();
    }
  }, [shipmentId]);

  // Subscribe to realtime driver location updates
  useEffect(() => {
    if (!shipment?.tripId) return;

    const channel = supabase
      .channel(`driver-location-${shipment.tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations',
          filter: `trip_id=eq.${shipment.tripId}`,
        },
        (payload) => {
          const loc = payload.new as any;
          setDriverLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
            heading: loc.heading,
            speed: loc.speed,
            recordedAt: loc.recorded_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipment?.tripId]);

  return {
    shipment,
    driverLocation,
    loading,
    error,
  };
}

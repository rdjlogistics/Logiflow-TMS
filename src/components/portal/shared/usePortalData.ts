import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shipment, Case, Invoice, ShipmentStatus } from './types';

// No more demo bypass — all queries require a real customer_id

export function usePortalData(customerId?: string | null) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!customerId) {
      setShipments([]);
      setCases([]);
      setInvoices([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      // Fetch customer submissions filtered by customer_id
      const { data: submissions, error } = await supabase
        .from('customer_submissions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch trips for converted submissions
      const tripIds = (submissions
        ?.filter(s => s.converted_trip_id)
        .map(s => s.converted_trip_id) || []).filter((id): id is string => id != null);

      let tripsData: any[] = [];
      if (tripIds.length > 0) {
        const { data: trips } = await supabase
          .from('trips')
          .select('*')
          .in('id', tripIds);
        tripsData = trips || [];
      }

      // Map to Shipment type
      const mappedShipments: Shipment[] = (submissions || []).map(sub => {
        const trip = tripsData.find(t => t.id === sub.converted_trip_id);
        
        let status: ShipmentStatus = 'pending';
        if (sub.status === 'approved' || sub.status === 'converted') {
          if (trip) {
            if (trip.status === 'afgeleverd' || trip.status === 'afgerond' || trip.status === 'gecontroleerd' || trip.status === 'gefactureerd') {
              status = 'delivered';
            } else if (trip.status === 'onderweg') {
              status = 'in_transit';
            } else if (trip.status === 'gepland') {
              status = 'pickup_scheduled';
            } else if (trip.status === 'geladen') {
              status = 'picked_up';
            } else {
              status = 'confirmed';
            }
          } else {
            status = 'confirmed';
          }
        } else if (sub.status === 'pending' && trip) {
          // Auto-bridge trigger creates trip with 'aanvraag' status
          if (trip.status === 'aanvraag') {
            status = 'pending'; // Still awaiting admin approval
          } else if (trip.status === 'geannuleerd') {
            status = 'cancelled';
          }
        } else if (sub.status === 'rejected') {
          status = 'cancelled';
        }

        return {
          id: sub.id,
          referenceNumber: sub.reference_number || `SUB-${sub.id.slice(0, 8).toUpperCase()}`,
          status,
          fromCity: sub.pickup_city || 'Onbekend',
          toCity: sub.delivery_city || 'Onbekend',
          fromAddress: `${sub.pickup_address || ''}${sub.house_number_pickup ? ' ' + sub.house_number_pickup : ''}`.trim() || 'Geen adres',
          toAddress: `${sub.delivery_address || ''}${sub.house_number_delivery ? ' ' + sub.house_number_delivery : ''}`.trim() || 'Geen adres',
          createdAt: sub.created_at,
          estimatedDelivery: sub.delivery_date ?? undefined,
          parcels: sub.quantity || 1,
          weight: sub.weight_kg ? Number(sub.weight_kg) : undefined,
          price: sub.estimated_price ? Number(sub.estimated_price) : undefined,
          trackingCode: trip?.tracking_token ?? undefined,
          carrier: 'PostNL',
        };
      });

      setShipments(mappedShipments);

      // Fetch invoices from database
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customerId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (invoicesData && invoicesData.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const mappedInvoices: Invoice[] = invoicesData.map(inv => {
          const dueDate = inv.due_date || inv.created_at;
          const isPastDue = dueDate && new Date(dueDate) < today;
          const rawStatus = String(inv.status ?? 'concept');
          
          let status: 'draft' | 'sent' | 'paid' | 'overdue' = 'draft';
          if (rawStatus === 'betaald') status = 'paid';
          else if (rawStatus === 'vervallen' || (['verzonden', 'definitief'].includes(rawStatus) && isPastDue)) status = 'overdue';
          else if (rawStatus === 'verzonden' || rawStatus === 'definitief') status = 'sent';

          return {
            id: inv.id,
            number: inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
            status,
            amount: Number(inv.total_amount) || 0,
            amountPaid: inv.amount_paid != null ? Number(inv.amount_paid) : undefined,
            currency: 'EUR',
            createdAt: inv.created_at,
            dueDate,
            paidAt: inv.paid_at || undefined,
            shipmentIds: [],
          };
        });
        setInvoices(mappedInvoices);
      }

      // Fetch claim cases filtered by customer's trips
      const tripIdsForClaims = (submissions || [])
        .filter(s => s.converted_trip_id)
        .map(s => s.converted_trip_id!);

      let claimsData: any[] | null = null;
      if (tripIdsForClaims.length > 0) {
        const { data } = await supabase
          .from('claim_cases')
          .select('*')
          .in('order_id', tripIdsForClaims)
          .order('created_at', { ascending: false })
          .limit(50);
        claimsData = data;
      }

      if (claimsData && claimsData.length > 0) {
        const mappedCases: Case[] = claimsData.map(claim => ({
          id: claim.id,
          shipmentId: claim.order_id,
          type: claim.claim_type === 'damage' ? 'damage'
            : claim.claim_type === 'delay' ? 'delay'
            : claim.claim_type === 'shortage' ? 'lost'
            : 'other',
          status: claim.status === 'settled' ? 'resolved'
            : claim.status === 'rejected' ? 'closed'
            : claim.status === 'in_review' || claim.status === 'awaiting_info' ? 'in_progress'
            : 'open',
          description: claim.notes || 'Geen beschrijving',
          createdAt: claim.created_at,
          updatedAt: claim.updated_at,
          resolution: claim.status === 'settled' ? 'Opgelost' : undefined,
        }));
        setCases(mappedCases);
      }
    } catch (err) {
      console.error('Error fetching portal data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch portal data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates for customer_submissions
    const channel = customerId ? supabase
      .channel(`portal-submissions-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_submissions',
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe() : null;

    // Subscribe to realtime updates for trips (status changes by admin)
    const tripsChannel = customerId ? supabase
      .channel(`portal-trips-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
        },
        () => {
          fetchData();
        }
      )
      .subscribe() : null;

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (tripsChannel) supabase.removeChannel(tripsChannel);
    };
  }, [customerId]);

  const stats = {
    pending: shipments.filter(s => s.status === 'pending').length,
    active: shipments.filter(s => ['confirmed', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)).length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    problems: shipments.filter(s => ['failed', 'cancelled'].includes(s.status)).length,
    total: shipments.length,
  };

  return {
    shipments,
    cases,
    invoices,
    loading,
    error,
    stats,
    refetch: fetchData,
  };
}

export function useShipmentById(id: string) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const { data: sub, error } = await supabase
          .from('customer_submissions')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (sub) {
          // Also fetch trip if converted
          let tripData: any = null;
          if (sub.converted_trip_id) {
            const { data: trip } = await supabase
              .from('trips')
              .select('*')
              .eq('id', sub.converted_trip_id)
              .maybeSingle();
            tripData = trip;
          }

          let status: ShipmentStatus = 'pending';
          if (sub.status === 'approved' || sub.status === 'converted') {
            if (tripData) {
            if (tripData.status === 'afgeleverd' || tripData.status === 'afgerond' || tripData.status === 'gecontroleerd' || tripData.status === 'gefactureerd') {
              status = 'delivered';
            } else if (tripData.status === 'onderweg') {
              status = 'in_transit';
            } else if (tripData.status === 'gepland') {
              status = 'pickup_scheduled';
            } else if (tripData.status === 'geladen') {
              status = 'picked_up';
            } else {
              status = 'confirmed';
            }
          } else {
            status = 'confirmed';
          }
        } else if (sub.status === 'rejected') {
          status = 'cancelled';
        } else if (sub.status === 'pending' && tripData) {
          if (tripData.status === 'aanvraag') {
            status = 'pending';
          } else if (tripData.status === 'geannuleerd') {
            status = 'cancelled';
          }
        }

          setShipment({
            id: sub.id,
            referenceNumber: sub.reference_number || `SUB-${sub.id.slice(0, 8).toUpperCase()}`,
            status,
            fromCity: sub.pickup_city || 'Onbekend',
            toCity: sub.delivery_city || 'Onbekend',
            fromAddress: `${sub.pickup_address || ''}${sub.house_number_pickup ? ' ' + sub.house_number_pickup : ''}`.trim() || 'Geen adres',
            toAddress: `${sub.delivery_address || ''}${sub.house_number_delivery ? ' ' + sub.house_number_delivery : ''}`.trim() || 'Geen adres',
            createdAt: sub.created_at,
            estimatedDelivery: sub.delivery_date ?? undefined,
            parcels: sub.quantity || 1,
            weight: sub.weight_kg ? Number(sub.weight_kg) : undefined,
            price: sub.estimated_price ? Number(sub.estimated_price) : undefined,
            trackingCode: (tripData as any)?.tracking_token ?? undefined,
            tripId: sub.converted_trip_id || undefined,
            carrier: 'PostNL',
          });
        }
      } catch (err) {
        console.error('Error fetching shipment:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchShipment();
  }, [id]);

  // Realtime subscription for the linked trip
  useEffect(() => {
    if (!shipment?.tripId) return;

    const channel = supabase
      .channel(`portal-shipment-trip-${shipment.tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${shipment.tripId}`,
        },
        () => {
          // Re-run the fetch to get updated status
          setLoading(true);
          supabase
            .from('customer_submissions')
            .select('*')
            .eq('id', id)
            .maybeSingle()
            .then(async ({ data: sub }) => {
              if (!sub) return;
              let tripData: any = null;
              if (sub.converted_trip_id) {
                const { data: trip } = await supabase
                  .from('trips')
                  .select('*')
                  .eq('id', sub.converted_trip_id)
                  .maybeSingle();
                tripData = trip;
              }

              let status: ShipmentStatus = 'pending';
              if (sub.status === 'approved' || sub.status === 'converted') {
                if (tripData) {
                  if (['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(tripData.status)) {
                    status = 'delivered';
                  } else if (tripData.status === 'onderweg') {
                    status = 'in_transit';
                  } else if (tripData.status === 'gepland') {
                    status = 'pickup_scheduled';
                  } else if (tripData.status === 'geladen') {
                    status = 'picked_up';
                  } else {
                    status = 'confirmed';
                  }
                } else {
                  status = 'confirmed';
                }
              } else if (sub.status === 'rejected') {
                status = 'cancelled';
              } else if (sub.status === 'pending' && tripData) {
                if (tripData.status === 'aanvraag') status = 'pending';
                else if (tripData.status === 'geannuleerd') status = 'cancelled';
              }

              setShipment({
                id: sub.id,
                referenceNumber: sub.reference_number || `SUB-${sub.id.slice(0, 8).toUpperCase()}`,
                status,
                fromCity: sub.pickup_city || 'Onbekend',
                toCity: sub.delivery_city || 'Onbekend',
                fromAddress: `${sub.pickup_address || ''}${sub.house_number_pickup ? ' ' + sub.house_number_pickup : ''}`.trim() || 'Geen adres',
                toAddress: `${sub.delivery_address || ''}${sub.house_number_delivery ? ' ' + sub.house_number_delivery : ''}`.trim() || 'Geen adres',
                createdAt: sub.created_at,
                estimatedDelivery: sub.delivery_date ?? undefined,
                parcels: sub.quantity || 1,
                weight: sub.weight_kg ? Number(sub.weight_kg) : undefined,
                price: sub.estimated_price ? Number(sub.estimated_price) : undefined,
                trackingCode: (tripData as any)?.tracking_token ?? undefined,
                tripId: sub.converted_trip_id || undefined,
                carrier: 'PostNL',
              });
              setLoading(false);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipment?.tripId, id]);

  return { shipment, loading };
}

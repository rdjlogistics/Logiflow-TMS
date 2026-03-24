import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';

export type StopEventType =
  | 'arrival'
  | 'departure'
  | 'waiting_start'
  | 'waiting_end'
  | 'pickup_complete'
  | 'delivery_complete'
  | 'photo_added'
  | 'signature_added'
  | 'note_added'
  | 'issue_reported';

export interface StopEvent {
  id: string;
  stop_id: string;
  trip_id: string;
  event_type: StopEventType;
  timestamp: string;
  actor_user_id: string | null;
  actor_company_id: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  payload: Record<string, unknown>;
  notes: string | null;
  synced_to_primary: boolean;
  synced_at: string | null;
  created_at: string;
}

export const useStopEvents = (tripId?: string, stopId?: string) => {
  const { user } = useAuth();
  const { company } = useCompany();
  const { toast } = useToast();
  const [events, setEvents] = useState<StopEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!tripId && !stopId) return;

    try {
      setLoading(true);
      let query = supabase.from('order_stop_events').select('*');

      if (stopId) {
        query = query.eq('stop_id', stopId);
      } else if (tripId) {
        query = query.eq('trip_id', tripId);
      }

      const { data, error } = await query.order('timestamp', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as StopEvent[]);
    } catch (err) {
      console.error('Error fetching stop events:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId, stopId]);

  const recordEvent = async (
    eventStopId: string,
    eventTripId: string,
    eventType: StopEventType,
    options: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      notes?: string;
      payload?: Record<string, unknown>;
    } = {}
  ): Promise<StopEvent | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('order_stop_events')
        .insert([{
          stop_id: eventStopId,
          trip_id: eventTripId,
          event_type: eventType,
          actor_user_id: user.id,
          actor_company_id: company?.id,
          latitude: options.latitude,
          longitude: options.longitude,
          accuracy: options.accuracy,
          notes: options.notes,
          payload: options.payload || {},
        }] as any)
        .select()
        .single();

      if (error) throw error;

      // Update route_stop based on event type
      await handleEventSideEffects(eventStopId, eventTripId, eventType);

      // Sync event to primary order if this is a subcontract order
      await syncEventToPrimaryOrder(eventTripId, data as StopEvent);

      // Log to order timeline
      await logToOrderTimeline(eventTripId, eventType, data as StopEvent);

      return data as StopEvent;
    } catch (err) {
      console.error('Error recording stop event:', err);
      toast({
        title: 'Fout',
        description: 'Kon event niet registreren.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleEventSideEffects = async (
    stopId: string,
    tripId: string,
    eventType: StopEventType
  ) => {
    const now = new Date().toISOString();

    switch (eventType) {
      case 'arrival':
        await supabase
          .from('route_stops')
          .update({ actual_arrival: now })
          .eq('id', stopId);
        break;

      case 'waiting_start':
        await supabase
          .from('route_stops')
          .update({ waiting_started_at: now })
          .eq('id', stopId);
        
        // Post automatic message to chat
        await postWaitingMessage(tripId, 'start');
        break;

      case 'waiting_end':
        await supabase
          .from('route_stops')
          .update({ waiting_ended_at: now })
          .eq('id', stopId);
        
        // Calculate waiting time
        await supabase.rpc('calculate_stop_waiting_time', { p_stop_id: stopId });
        
        await postWaitingMessage(tripId, 'end');
        break;

      case 'pickup_complete':
      case 'delivery_complete':
        await supabase
          .from('route_stops')
          .update({ status: 'completed' })
          .eq('id', stopId);
        
        // Check if this affects trip status
        await updateTripStatusBasedOnStops(tripId, eventType);
        break;
    }
  };

  const postWaitingMessage = async (tripId: string, type: 'start' | 'end') => {
    try {
      // Get or create chat channel for this trip
      const { data: channel } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('trip_id', tripId)
        .limit(1)
        .maybeSingle();

      if (!channel) {
        // Create channel if doesn't exist
        const { data: newChannel } = await supabase
          .from('chat_channels')
          .insert({ trip_id: tripId })
          .select('id')
          .single();
        
        if (!newChannel) return;
        
        await insertWaitingChatMessage(newChannel.id, type);
      } else {
        await insertWaitingChatMessage(channel.id, type);
      }
    } catch (err) {
      console.error('Error posting waiting message:', err);
    }
  };

  const insertWaitingChatMessage = async (channelId: string, type: 'start' | 'end') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    const message = type === 'start'
      ? `🕐 Update: Chauffeur is aangekomen op locatie en is gestart met wachttijd om ${timeStr}. De wachttijd loopt nu.`
      : `✅ Update: Wachttijd is beëindigd om ${timeStr}.`;

    await supabase.from('chat_messages').insert({
      channel_id: channelId,
      sender_id: user?.id || '',
      sender_name: 'Systeem',
      sender_role: 'planner',
      content: message,
    });
  };

  const updateTripStatusBasedOnStops = async (tripId: string, eventType: StopEventType) => {
    try {
      // Get all stops for the trip
      const { data: stops } = await supabase
        .from('route_stops')
        .select('stop_type, status')
        .eq('trip_id', tripId);

      if (!stops) return;

      const pickupsDone = stops
        .filter(s => s.stop_type === 'pickup')
        .every(s => s.status === 'completed');

      const deliveriesDone = stops
        .filter(s => s.stop_type === 'delivery')
        .every(s => s.status === 'completed');

      let newStatus: string | null = null;

      if (pickupsDone && !deliveriesDone) {
        newStatus = 'onderweg';
      } else if (pickupsDone && deliveriesDone) {
        // Look up customer checkout_mode to determine correct terminal status
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
          if (cs?.checkout_mode) {
            checkoutMode = cs.checkout_mode as string;
          }
        }
        newStatus = checkoutMode === 'direct_complete' ? 'afgerond' : 'afgeleverd';
      }

      if (newStatus) {
        const statusUpdates: Record<string, unknown> = { status: newStatus as any };
        if (newStatus === 'onderweg') {
          statusUpdates.actual_departure = new Date().toISOString();
        }
        if (newStatus === 'afgeleverd' || newStatus === 'afgerond') {
          statusUpdates.actual_arrival = new Date().toISOString();
        }
        if (newStatus === 'afgerond') {
          const { data: { user } } = await supabase.auth.getUser();
          statusUpdates.checkout_completed_at = new Date().toISOString();
          statusUpdates.checkout_completed_by = user?.id;
        }
        await supabase
          .from('trips')
          .update(statusUpdates)
          .eq('id', tripId);

        // Notify B2B customer of status change
        const { data: tripForNotif } = await supabase
          .from('trips')
          .select('customer_id, order_number')
          .eq('id', tripId)
          .single();
        notifyCustomerStatusChange(tripForNotif?.customer_id, tripId, newStatus, tripForNotif?.order_number);

        // Auto-send vrachtbrief if tenant setting enabled
        if (newStatus === 'afgerond' || newStatus === 'afgeleverd') {
          try {
            const { data: tenantSettings } = await supabase
              .from('tenant_settings')
              .select('auto_send_pod_email')
              .limit(1)
              .maybeSingle();

            if (tenantSettings?.auto_send_pod_email) {
              supabase.functions.invoke('auto-send-vrachtbrief', {
                body: { tripId },
              }).catch(err => console.error('Auto-send vrachtbrief error:', err));
            }
          } catch (err) {
            console.error('Error checking tenant settings for auto-send:', err);
          }
        }

        // Send delivery confirmation on afgeleverd
        if (newStatus === 'afgeleverd') {
          supabase.functions.invoke('send-delivery-confirmation', {
            body: { tripId },
          }).catch(err => console.error('Delivery confirmation error:', err));
        }
      }
    } catch (err) {
      console.error('Error updating trip status:', err);
    }
  };

  // Sync event to primary order when this is a subcontract execution
  const syncEventToPrimaryOrder = async (tripId: string, event: StopEvent) => {
    try {
      // Check if this trip is a subcontract order
      const { data: trip } = await supabase
        .from('trips')
        .select('is_subcontract_order, primary_dispatch_id')
        .eq('id', tripId)
        .maybeSingle();

      if (!trip?.is_subcontract_order || !trip.primary_dispatch_id) return;

      // Get the dispatch to find primary order
      const { data: dispatch } = await supabase
        .from('intercompany_dispatches')
        .select('primary_order_id')
        .eq('id', trip.primary_dispatch_id)
        .maybeSingle();

      if (!dispatch?.primary_order_id) return;

      // Find matching stop in primary order by address/order
      const { data: subStop } = await supabase
        .from('route_stops')
        .select('stop_order, stop_type, address')
        .eq('id', event.stop_id)
        .maybeSingle();

      if (!subStop) return;

      // Find corresponding stop in primary order
      const { data: primaryStop } = await supabase
        .from('route_stops')
        .select('id')
        .eq('trip_id', dispatch.primary_order_id)
        .eq('stop_order', subStop.stop_order)
        .eq('stop_type', subStop.stop_type)
        .limit(1)
        .maybeSingle();

      if (!primaryStop) return;

      // Create synced event in primary order
      await supabase.from('order_stop_events').insert({
        stop_id: primaryStop.id,
        trip_id: dispatch.primary_order_id,
        event_type: event.event_type,
        actor_user_id: event.actor_user_id,
        actor_company_id: event.actor_company_id,
        latitude: event.latitude,
        longitude: event.longitude,
        accuracy: event.accuracy,
        notes: event.notes,
        payload: { ...event.payload, synced_from_subcontract: tripId },
        synced_to_primary: true,
        synced_at: new Date().toISOString(),
      } as any);

      // Update the original event as synced
      await supabase
        .from('order_stop_events')
        .update({ synced_to_primary: true, synced_at: new Date().toISOString() })
        .eq('id', event.id);

      // Also apply side effects to primary order stop
      await handleEventSideEffects(primaryStop.id, dispatch.primary_order_id, event.event_type);
    } catch (err) {
      console.error('Error syncing event to primary order:', err);
    }
  };

  // Log event to order timeline for audit trail
  const logToOrderTimeline = async (tripId: string, eventType: StopEventType, event: StopEvent) => {
    try {
      const eventLabels: Record<StopEventType, string> = {
        arrival: 'Chauffeur aangekomen',
        departure: 'Chauffeur vertrokken',
        waiting_start: 'Wachttijd gestart',
        waiting_end: 'Wachttijd beëindigd',
        pickup_complete: 'Ophalen voltooid',
        delivery_complete: 'Aflevering voltooid',
        photo_added: 'Foto toegevoegd',
        signature_added: 'Handtekening toegevoegd',
        note_added: 'Notitie toegevoegd',
        issue_reported: 'Probleem gemeld',
      };

      await supabase.from('order_events').insert({
        order_id: tripId,
        event_type: `stop_${eventType}`,
        actor_user_id: user?.id,
        payload: {
          stop_id: event.stop_id,
          label: eventLabels[eventType],
          latitude: event.latitude,
          longitude: event.longitude,
          notes: event.notes,
        },
      });
    } catch (err) {
      console.error('Error logging to order timeline:', err);
    }
  };

  // Arrival button
  const markArrival = async (stopId: string, tripId: string, position?: GeolocationPosition) => {
    return recordEvent(stopId, tripId, 'arrival', {
      latitude: position?.coords.latitude,
      longitude: position?.coords.longitude,
      accuracy: position?.coords.accuracy,
    });
  };

  // Waiting time start
  const startWaiting = async (stopId: string, tripId: string, position?: GeolocationPosition) => {
    const event = await recordEvent(stopId, tripId, 'waiting_start', {
      latitude: position?.coords.latitude,
      longitude: position?.coords.longitude,
      accuracy: position?.coords.accuracy,
    });

    if (event) {
      toast({
        title: 'Wachttijd gestart',
        description: 'De wachttijd timer loopt nu.',
      });
    }

    return event;
  };

  // Waiting time end
  const stopWaiting = async (stopId: string, tripId: string, position?: GeolocationPosition) => {
    const event = await recordEvent(stopId, tripId, 'waiting_end', {
      latitude: position?.coords.latitude,
      longitude: position?.coords.longitude,
      accuracy: position?.coords.accuracy,
    });

    if (event) {
      toast({
        title: 'Wachttijd gestopt',
        description: 'De wachttijd is geregistreerd.',
      });
    }

    return event;
  };

  // Complete pickup
  const completePickup = async (stopId: string, tripId: string, position?: GeolocationPosition) => {
    return recordEvent(stopId, tripId, 'pickup_complete', {
      latitude: position?.coords.latitude,
      longitude: position?.coords.longitude,
      accuracy: position?.coords.accuracy,
    });
  };

  // Complete delivery
  const completeDelivery = async (stopId: string, tripId: string, position?: GeolocationPosition) => {
    return recordEvent(stopId, tripId, 'delivery_complete', {
      latitude: position?.coords.latitude,
      longitude: position?.coords.longitude,
      accuracy: position?.coords.accuracy,
    });
  };

  return {
    events,
    loading,
    fetchEvents,
    recordEvent,
    markArrival,
    startWaiting,
    stopWaiting,
    completePickup,
    completeDelivery,
  };
};

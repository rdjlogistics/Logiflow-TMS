import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

// Fetch VAPID public key from server (single source of truth)
const VAPID_KEY_CACHE_KEY = 'vapid_public_key';

async function getVapidPublicKey(): Promise<string> {
  // Check localStorage cache first
  const cached = localStorage.getItem(VAPID_KEY_CACHE_KEY);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('get-vapid-key');
  if (error || !data?.vapidPublicKey) {
    throw new Error('Could not fetch VAPID public key from server');
  }

  localStorage.setItem(VAPID_KEY_CACHE_KEY, data.vapidPublicKey);
  return data.vapidPublicKey;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer as ArrayBuffer;
}

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if push notifications are supported and subscription status
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Register push service worker
        try {
          await navigator.serviceWorker.register('/sw-push.js');
          
          // Check existing subscription
          const registration = await navigator.serviceWorker.ready;
          const existingSub = await (registration as any).pushManager.getSubscription();
          setIsSubscribed(!!existingSub);
          
          if (existingSub) {
            const subJson = existingSub.toJSON();
            setSubscription({
              endpoint: existingSub.endpoint,
              keys: {
                p256dh: subJson.keys?.p256dh || '',
                auth: subJson.keys?.auth || '',
              },
            });
          }
        } catch (error) {
          logger.error('Error checking push subscription:', error);
        }
      }
      
      setLoading(false);
    };
    
    checkSupport();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      toast({
        title: 'Niet ondersteund',
        description: 'Push notificaties worden niet ondersteund of je bent niet ingelogd',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result !== 'granted') {
        toast({
          title: 'Notificaties geweigerd',
          description: 'Je kunt dit later wijzigen in je browserinstellingen',
          variant: 'destructive',
        });
        setLoading(false);
        return false;
      }

      // Fetch VAPID key from server (single source of truth)
      const vapidKey = await getVapidPublicKey();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications with server's VAPID key
      const pushSubscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = pushSubscription.toJSON();
      const keys = subJson.keys;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Subscription keys not available');
      }

      // Save to database
      let deviceInfo: Record<string, string> | undefined;
      try {
        deviceInfo = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        };
      } catch {
        // ignore if we can't get device info
      }

      const upsertData: Record<string, unknown> = {
        user_id: user.id,
        endpoint: pushSubscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      };
      if (deviceInfo) {
        upsertData.device_info = deviceInfo;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(upsertData as any, {
          onConflict: 'user_id,endpoint',
        });

      if (error) throw error;

      setIsSubscribed(true);
      setSubscription({
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });

      toast({
        title: 'Notificaties ingeschakeld',
        description: 'Je ontvangt nu meldingen voor nieuwe ritten',
      });
      
      setLoading(false);
      return true;
    } catch (error) {
      logger.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Fout',
        description: 'Kon push notificaties niet inschakelen',
        variant: 'destructive',
      });
      setLoading(false);
      return false;
    }
  }, [isSupported, user, toast]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await (registration as any).pushManager.getSubscription();

      if (existingSub) {
        await existingSub.unsubscribe();

        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', existingSub.endpoint);
      }

      setIsSubscribed(false);
      setSubscription(null);

      toast({
        title: 'Notificaties uitgeschakeld',
        description: 'Je ontvangt geen push notificaties meer',
      });

      setLoading(false);
      return true;
    } catch (error) {
      logger.error('Error unsubscribing:', error);
      setLoading(false);
      return false;
    }
  }, [user, toast]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return subscribe();
  }, [subscribe]);

  const sendLocalNotification = useCallback((payload: NotificationPayload) => {
    if (permission !== 'granted') return;

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag,
      data: payload.data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Navigate based on notification type
      if (payload.data?.tripId) {
        window.location.href = `/driver?trip=${payload.data.tripId}`;
      }
    };

    return notification;
  }, [permission]);

  // Subscribe to realtime trip updates for drivers
  // CRITICAL: We listen to ALL trip updates and filter in code because Supabase
  // realtime filters check the OLD value, not the NEW value for UPDATE events.
  // This means filter: `driver_id=eq.${driverId}` misses assignment updates.
  const subscribeToTripUpdates = useCallback((driverId: string) => {
    logger.log('[Push] Subscribing to trip updates for driver:', driverId);
    
    const channel = supabase
      .channel(`driver-trips-realtime-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trips',
        },
        (payload) => {
          const trip = payload.new as { id: string; pickup_city: string; delivery_city: string; order_number: string; driver_id: string | null };
          
          // Only notify if this trip is assigned to our driver
          if (trip.driver_id === driverId) {
            logger.log('[Push] New trip assigned via INSERT:', trip.id);
            sendLocalNotification({
              title: '🚚 Nieuwe rit toegewezen!',
              body: `${trip.pickup_city || 'Onbekend'} → ${trip.delivery_city || 'Onbekend'}`,
              tag: `trip-${trip.id}`,
              data: { tripId: trip.id, type: 'new_trip' },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
        },
        (payload) => {
          const trip = payload.new as { id: string; pickup_city: string; delivery_city: string; status: string; driver_id: string | null };
          const oldTrip = payload.old as { status: string; driver_id: string | null };
          
          // Check if trip was just assigned to our driver (driver_id changed from null/other to ours)
          if (trip.driver_id === driverId && oldTrip.driver_id !== driverId) {
            logger.log('[Push] Trip assigned via UPDATE:', trip.id);
            sendLocalNotification({
              title: '🚚 Nieuwe rit toegewezen!',
              body: `${trip.pickup_city || 'Onbekend'} → ${trip.delivery_city || 'Onbekend'}`,
              tag: `trip-${trip.id}`,
              data: { tripId: trip.id, type: 'new_trip' },
            });
          }
          // Also notify on status changes for trips already assigned to us
          else if (trip.driver_id === driverId && trip.status !== oldTrip.status) {
            logger.log('[Push] Trip status changed:', trip.id, trip.status);
            sendLocalNotification({
              title: '📋 Rit update',
              body: `Status gewijzigd naar: ${trip.status}`,
              tag: `trip-update-${trip.id}`,
              data: { tripId: trip.id, type: 'trip_update' },
            });
          }
        }
      )
      .subscribe((status) => {
        logger.log('[Push] Subscription status:', status);
      });

    return () => {
      logger.log('[Push] Unsubscribing from trip updates');
      supabase.removeChannel(channel);
    };
  }, [sendLocalNotification]);

  // Subscribe to messenger updates
  const subscribeToMessages = useCallback((userId: string) => {
    const channel = supabase
      .channel(`messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const message = payload.new as { sender_id: string; sender_name: string; content: string; channel_id: string };
          
          // Don't notify for own messages
          if (message.sender_id !== userId) {
            sendLocalNotification({
              title: `💬 ${message.sender_name}`,
              body: message.content.substring(0, 100),
              tag: `message-${message.channel_id}`,
              data: { channelId: message.channel_id, type: 'message' },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sendLocalNotification]);

  return {
    permission,
    isSupported,
    isSubscribed,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
    sendLocalNotification,
    subscribeToTripUpdates,
    subscribeToMessages,
  };
};

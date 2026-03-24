import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeSubscriptionOptions {
  table: string;
  schema?: string;
  filter?: string;
  queryKey: string[];
  enabled?: boolean;
}

export function useRealtimeSubscription<TData extends { id: string }>({
  table,
  schema = 'public',
  filter,
  queryKey,
  enabled = true,
}: RealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; timestamp: Date } | null>(null);
  const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
    };
  }, []);

  const markRecentlyUpdated = useCallback((id: string) => {
    // Clear existing timeout for this id
    const existing = timeoutsRef.current.get(id);
    if (existing) clearTimeout(existing);

    setRecentlyUpdatedIds((prev) => new Set(prev).add(id));

    const timeout = setTimeout(() => {
      setRecentlyUpdatedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timeoutsRef.current.delete(id);
    }, 2500);

    timeoutsRef.current.set(id, timeout);
  }, []);

  const handleChange = useCallback(
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const eventType = payload.eventType;
      setLastEvent({ type: eventType, timestamp: new Date() });

      const currentData = queryClient.getQueryData<TData[]>(queryKey);
      if (!currentData) return;

      let updatedData: TData[];

      switch (eventType) {
        case 'INSERT': {
          const newItem = payload.new as TData;
          if (newItem?.id) {
            const exists = currentData.some((item) => item.id === newItem.id);
            updatedData = exists ? currentData : [...currentData, newItem];
            markRecentlyUpdated(newItem.id);
          } else {
            updatedData = currentData;
          }
          break;
        }
        case 'UPDATE': {
          const updatedItem = payload.new as TData;
          if (updatedItem?.id) {
            updatedData = currentData.map((item) =>
              item.id === updatedItem.id ? updatedItem : item
            );
            markRecentlyUpdated(updatedItem.id);
          } else {
            updatedData = currentData;
          }
          break;
        }
        case 'DELETE': {
          const deletedId = (payload.old as TData)?.id;
          updatedData = deletedId
            ? currentData.filter((item) => item.id !== deletedId)
            : currentData;
          break;
        }
        default:
          updatedData = currentData;
      }

      queryClient.setQueryData(queryKey, updatedData);
    },
    [queryClient, queryKey, markRecentlyUpdated]
  );

  // Stabilize queryKey reference
  const queryKeyStr = JSON.stringify(queryKey);
  
  useEffect(() => {
    if (!enabled) return;

    const stableQueryKey = JSON.parse(queryKeyStr) as string[];
    const channelName = `realtime-${table}-${stableQueryKey.join('-')}-${Date.now()}`;
    
    const subscriptionConfig = filter
      ? { event: '*' as const, schema, table, filter }
      : { event: '*' as const, schema, table };
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionConfig,
        (payload) => {
          handleChange(payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [table, schema, filter, enabled, handleChange, queryKeyStr]);

  return {
    isConnected,
    lastEvent,
    recentlyUpdatedIds,
  };
}

// Preset for common tables
export function useRealtimeTrips(queryKey: string[], enabled = true) {
  return useRealtimeSubscription({
    table: 'trips',
    queryKey,
    enabled,
  });
}

export function useRealtimeOrders(queryKey: string[], enabled = true) {
  return useRealtimeSubscription({
    table: 'trips',
    filter: 'trip_type=eq.order',
    queryKey,
    enabled,
  });
}

export function useRealtimeMessages(channelId: string, queryKey: string[], enabled = true) {
  return useRealtimeSubscription({
    table: 'chat_messages',
    filter: `channel_id=eq.${channelId}`,
    queryKey,
    enabled,
  });
}

export function useRealtimeInvoices(queryKey: string[], enabled = true) {
  return useRealtimeSubscription({
    table: 'invoices',
    queryKey,
    enabled,
  });
}

export function useRealtimePurchaseInvoices(queryKey: string[], enabled = true) {
  return useRealtimeSubscription({
    table: 'purchase_invoices',
    queryKey,
    enabled,
  });
}

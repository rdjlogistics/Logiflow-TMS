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

const DEBOUNCE_MS = 500;

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

  // Debounce buffer: accumulate changes, flush once after DEBOUNCE_MS
  const pendingChangesRef = useRef<Map<string, { type: string; item: TData }>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current.clear();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const markRecentlyUpdated = useCallback((id: string) => {
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

  // Flush all pending changes in one batch update
  const flushChanges = useCallback(() => {
    const changes = new Map(pendingChangesRef.current);
    pendingChangesRef.current.clear();
    debounceTimerRef.current = null;

    if (changes.size === 0) return;

    const currentData = queryClient.getQueryData<TData[]>(queryKey);
    if (!currentData) return;

    let updatedData = [...currentData];
    const deletedIds = new Set<string>();

    changes.forEach(({ type, item }, id) => {
      if (type === 'DELETE') {
        deletedIds.add(id);
        return;
      }
      if (type === 'INSERT') {
        if (!updatedData.some((d) => d.id === id)) {
          updatedData.push(item);
        }
        markRecentlyUpdated(id);
      } else if (type === 'UPDATE') {
        updatedData = updatedData.map((d) => (d.id === id ? item : d));
        markRecentlyUpdated(id);
      }
    });

    if (deletedIds.size > 0) {
      updatedData = updatedData.filter((d) => !deletedIds.has(d.id));
    }

    queryClient.setQueryData(queryKey, updatedData);
    const lastType = Array.from(changes.values()).pop()?.type ?? 'UPDATE';
    setLastEvent({ type: lastType, timestamp: new Date() });
  }, [queryClient, queryKey, markRecentlyUpdated]);

  const handleChange = useCallback(
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const eventType = payload.eventType;
      const item = (eventType === 'DELETE' ? payload.old : payload.new) as TData;
      if (!item?.id) return;

      pendingChangesRef.current.set(item.id, { type: eventType, item });

      // Reset debounce timer
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(flushChanges, DEBOUNCE_MS);
    },
    [flushChanges]
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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
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
  return useRealtimeSubscription({ table: 'trips', queryKey, enabled });
}

export function useRealtimeOrders(queryKey: string[], enabled = true) {
  return useRealtimeSubscription({ table: 'trips', filter: 'trip_type=eq.order', queryKey, enabled });
}

export function useRealtimeMessages(channelId: string, queryKey: string[], enabled = true) {
  return useRealtimeSubscription({ table: 'chat_messages', filter: `channel_id=eq.${channelId}`, queryKey, enabled });
}

export function useRealtimeInvoices(queryKey: string[], enabled = true) {
  return useRealtimeSubscription({ table: 'invoices', queryKey, enabled });
}

export function useRealtimePurchaseInvoices(queryKey: string[], enabled = true) {
  return useRealtimeSubscription({ table: 'purchase_invoices', queryKey, enabled });
}

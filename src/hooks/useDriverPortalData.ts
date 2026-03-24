import { useQuery } from '@tanstack/react-query';
import type { TripStatus } from "@/types/supabase-helpers";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo, useCallback } from 'react';

interface DriverAlert {
  id: string;
  type: 'route_update' | 'document_expiring' | 'new_shift' | 'message' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  entityId?: string;
  entityType?: string;
  createdAt: string;
  isRead: boolean;
}

interface DriverStats {
  todayRoutes: number;
  pendingStops: number;
  completedStops: number;
  upcomingShifts: number;
  unreadMessages: number;
  expiringDocuments: number;
  onTimePercent: number | null;
  nextShift: {
    trip_date: string;
    start_time: string;
    end_time: string | null;
    vehicle_type: string | null;
  } | null;
}

// Optimized data fetcher with parallel queries
async function fetchDriverPortalData(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // First resolve the driver record ID from the drivers table
  const { data: driverRecord } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const driverId = driverRecord?.id;

  // If no driver record found, return empty stats
  if (!driverId) {
    return {
      stats: {
        todayRoutes: 0,
        pendingStops: 0,
        completedStops: 0,
        upcomingShifts: 0,
        unreadMessages: 0,
        expiringDocuments: 0,
        onTimePercent: null,
        nextShift: null,
      },
      alerts: [],
    };
  }

  // Execute all queries in parallel for maximum speed
  const [tripsResult, shiftsResult, messagesResult, documentsResult] = await Promise.all([
    // Today's trips with stops
    supabase
      .from('trips')
      .select('id, status, route_stops(id, status, actual_arrival, time_window_end)')
      .eq('driver_id', driverId)
      .in('status', ['gepland', 'geladen', 'onderweg', 'afgeleverd', 'afgerond'] as TripStatus[])
      .gte('trip_date', today)
      .lte('trip_date', today),
    
    // Upcoming shifts (with details for the next one)
    // NOTE: assigned_driver_id stores auth.uid() (not drivers.id)
    // This is set in useShiftApplications.useApproveApplication
    supabase
      .from('program_shifts')
      .select('id, trip_date, start_time, end_time, vehicle_type')
      .eq('assigned_driver_id', userId)
      .in('status', ['filled', 'published'])
      .gte('trip_date', today)
      .order('trip_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(10),
    
    // Unread messages (limit for performance)
    supabase
      .from('chat_messages')
      .select('id')
      .eq('is_read', false)
      .neq('sender_id', userId)
      .limit(50),
    
    // Expiring documents (within 30 days)
    supabase
      .from('compliance_documents')
      .select('id, doc_name, expiry_date')
      .eq('entity_id', userId)
      .eq('entity_type', 'driver')
      .lte('expiry_date', thirtyDaysFromNow.toISOString())
      .gte('expiry_date', today)
      .limit(10),
  ]);

  const trips = tripsResult.data || [];
  const allStops = trips.flatMap(t => (t as any).route_stops || []);
  const pendingStops = allStops.filter(s => s.status !== 'completed').length;
  const completedStops = allStops.filter(s => s.status === 'completed').length;

  // Calculate on-time percentage from completed stops with time windows
  const stopsWithTimeWindow = allStops.filter(s => s.status === 'completed' && s.time_window_end && s.actual_arrival);
  let onTimePercent: number | null = null;
  if (stopsWithTimeWindow.length > 0) {
    const onTimeCount = stopsWithTimeWindow.filter(s => new Date(s.actual_arrival) <= new Date(s.time_window_end)).length;
    onTimePercent = Math.round((onTimeCount / stopsWithTimeWindow.length) * 100);
  }

  const shifts = shiftsResult.data || [];
  const nextShift = shifts.length > 0 ? {
    trip_date: shifts[0].trip_date,
    start_time: shifts[0].start_time,
    end_time: shifts[0].end_time,
    vehicle_type: shifts[0].vehicle_type,
  } : null;

  const documents = documentsResult.data || [];

  // Build alerts from expiring documents
  const alerts: DriverAlert[] = documents.map(doc => {
    const daysUntil = Math.ceil((new Date(doc.expiry_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return {
      id: `doc-${doc.id}`,
      type: 'document_expiring' as const,
      title: 'Document verloopt',
      message: `${doc.doc_name} verloopt over ${daysUntil} dagen`,
      priority: daysUntil <= 7 ? 'high' as const : daysUntil <= 14 ? 'medium' as const : 'low' as const,
      entityId: doc.id,
      entityType: 'document',
      createdAt: new Date().toISOString(),
      isRead: false,
    };
  }).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return {
    stats: {
      todayRoutes: trips.length,
      pendingStops,
      completedStops,
      upcomingShifts: shifts.length,
      unreadMessages: messagesResult.data?.length || 0,
      expiringDocuments: documents.length,
      onTimePercent,
      nextShift,
    },
    alerts,
  };
}

export function useDriverPortalData() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver-portal-data', user?.id],
    queryFn: () => fetchDriverPortalData(user!.id),
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds - data stays fresh
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  // Memoized defaults to prevent unnecessary re-renders
  const stats = useMemo<DriverStats>(() => data?.stats || {
    todayRoutes: 0,
    pendingStops: 0,
    completedStops: 0,
    upcomingShifts: 0,
    unreadMessages: 0,
    expiringDocuments: 0,
    onTimePercent: null,
    nextShift: null,
  }, [data?.stats]);

  const alerts = useMemo(() => data?.alerts || [], [data?.alerts]);

  // Local state management for alerts (client-side only)
  const markAlertRead = useCallback((alertId: string) => {
    // This is client-side only, would need server persistence for real app
    console.log('Mark alert read:', alertId);
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    // This is client-side only, would need server persistence for real app  
    console.log('Dismiss alert:', alertId);
  }, []);

  return {
    alerts,
    stats,
    loading: isLoading,
    refresh: refetch,
    markAlertRead,
    dismissAlert,
  };
}

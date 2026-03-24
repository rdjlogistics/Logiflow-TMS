import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, startOfWeek, differenceInMinutes } from 'date-fns';

interface DrivingLog {
  id: string;
  log_type: 'driving' | 'break' | 'rest' | 'available';
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  trip_id: string | null;
  auto_detected: boolean;
}

interface DrivingWarning {
  type: 'continuous_limit' | 'daily_limit' | 'break_required' | 'rest_required';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  minutesRemaining?: number;
}

interface DrivingTimeState {
  activeLog: DrivingLog | null;
  dailyDrivingMinutes: number;
  weeklyDrivingMinutes: number;
  continuousDrivingMinutes: number;
  dailyBreakMinutes: number;
  warnings: DrivingWarning[];
  loading: boolean;
  startDriving: (tripId?: string) => Promise<void>;
  stopDriving: () => Promise<void>;
  startBreak: () => Promise<void>;
  stopBreak: () => Promise<void>;
  refetch: () => Promise<void>;
}

// EU 561/2006 constants
const MAX_CONTINUOUS_DRIVING = 270; // 4h30
const MAX_DAILY_DRIVING = 540; // 9h (can be 10h 2x/week)
const MAX_WEEKLY_DRIVING = 3360; // 56h
const REQUIRED_BREAK = 45; // min
const MIN_DAILY_REST = 660; // 11h
const WARNING_THRESHOLD_CONTINUOUS = 240; // 4h
const CRITICAL_THRESHOLD_CONTINUOUS = 255; // 4h15

export function useDrivingTime(): DrivingTimeState {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<DrivingLog | null>(null);
  const [todayLogs, setTodayLogs] = useState<DrivingLog[]>([]);
  const [weekLogs, setWeekLogs] = useState<DrivingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Resolve driver_id from user
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

  const fetchLogs = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);

    const todayStart = startOfDay(new Date()).toISOString();
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

    const [todayRes, weekRes, activeRes] = await Promise.all([
      supabase
        .from('driving_time_logs')
        .select('*')
        .eq('driver_id', driverId)
        .gte('started_at', todayStart)
        .order('started_at', { ascending: true }),
      supabase
        .from('driving_time_logs')
        .select('*')
        .eq('driver_id', driverId)
        .gte('started_at', weekStart)
        .order('started_at', { ascending: true }),
      supabase
        .from('driving_time_logs')
        .select('*')
        .eq('driver_id', driverId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setTodayLogs((todayRes.data as DrivingLog[]) || []);
    setWeekLogs((weekRes.data as DrivingLog[]) || []);
    setActiveLog((activeRes.data as DrivingLog) || null);
    setLoading(false);
  }, [driverId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Tick every 30s for live calculations
  useEffect(() => {
    if (!activeLog) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [activeLog]);

  const calcMinutes = (log: DrivingLog): number => {
    if (log.duration_minutes != null) return log.duration_minutes;
    const end = log.ended_at ? new Date(log.ended_at) : new Date();
    return differenceInMinutes(end, new Date(log.started_at));
  };

  const dailyDrivingMinutes = useMemo(() => {
    return todayLogs
      .filter(l => l.log_type === 'driving')
      .reduce((sum, l) => sum + calcMinutes(l), 0);
  }, [todayLogs, tick]);

  const weeklyDrivingMinutes = useMemo(() => {
    return weekLogs
      .filter(l => l.log_type === 'driving')
      .reduce((sum, l) => sum + calcMinutes(l), 0);
  }, [weekLogs, tick]);

  const dailyBreakMinutes = useMemo(() => {
    return todayLogs
      .filter(l => l.log_type === 'break')
      .reduce((sum, l) => sum + calcMinutes(l), 0);
  }, [todayLogs, tick]);

  // Continuous driving = time since last break ≥ 45 min
  const continuousDrivingMinutes = useMemo(() => {
    const drivingLogs = todayLogs.filter(l => l.log_type === 'driving');
    if (drivingLogs.length === 0) return 0;

    // Find last qualifying break (≥ 45 min)
    const breakLogs = todayLogs
      .filter(l => l.log_type === 'break' && calcMinutes(l) >= REQUIRED_BREAK)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    const lastQualifyingBreak = breakLogs[0];
    const cutoff = lastQualifyingBreak ? new Date(lastQualifyingBreak.ended_at || lastQualifyingBreak.started_at) : null;

    return drivingLogs
      .filter(l => !cutoff || new Date(l.started_at) >= cutoff)
      .reduce((sum, l) => sum + calcMinutes(l), 0);
  }, [todayLogs, tick]);

  const warnings = useMemo<DrivingWarning[]>(() => {
    const w: DrivingWarning[] = [];

    // Continuous driving warnings
    if (continuousDrivingMinutes >= CRITICAL_THRESHOLD_CONTINUOUS) {
      w.push({
        type: 'continuous_limit',
        severity: 'critical',
        message: `Verplichte pauze! ${MAX_CONTINUOUS_DRIVING - continuousDrivingMinutes} min tot limiet.`,
        minutesRemaining: MAX_CONTINUOUS_DRIVING - continuousDrivingMinutes,
      });
    } else if (continuousDrivingMinutes >= WARNING_THRESHOLD_CONTINUOUS) {
      w.push({
        type: 'continuous_limit',
        severity: 'warning',
        message: `Nog ${MAX_CONTINUOUS_DRIVING - continuousDrivingMinutes} min tot verplichte pauze.`,
        minutesRemaining: MAX_CONTINUOUS_DRIVING - continuousDrivingMinutes,
      });
    }

    // Daily limit
    if (dailyDrivingMinutes >= MAX_DAILY_DRIVING - 30) {
      w.push({
        type: 'daily_limit',
        severity: dailyDrivingMinutes >= MAX_DAILY_DRIVING ? 'critical' : 'warning',
        message: dailyDrivingMinutes >= MAX_DAILY_DRIVING
          ? 'Dagelijkse rijtijdlimiet bereikt!'
          : `Nog ${MAX_DAILY_DRIVING - dailyDrivingMinutes} min dagelijks rijden.`,
        minutesRemaining: MAX_DAILY_DRIVING - dailyDrivingMinutes,
      });
    }

    // Break required
    if (dailyBreakMinutes < REQUIRED_BREAK && dailyDrivingMinutes > 0) {
      w.push({
        type: 'break_required',
        severity: 'info',
        message: `Nog ${REQUIRED_BREAK - dailyBreakMinutes} min pauze vereist vandaag.`,
        minutesRemaining: REQUIRED_BREAK - dailyBreakMinutes,
      });
    }

    return w;
  }, [continuousDrivingMinutes, dailyDrivingMinutes, dailyBreakMinutes]);

  const startDriving = useCallback(async (tripId?: string) => {
    if (!driverId || !tenantId) return;
    const { data, error } = await supabase
      .from('driving_time_logs')
      .insert({
        driver_id: driverId,
        tenant_id: tenantId,
        trip_id: tripId || null,
        log_type: 'driving' as any,
        auto_detected: false,
      })
      .select()
      .single();
    if (!error && data) {
      setActiveLog(data as any);
      await fetchLogs();
    }
  }, [driverId, tenantId, fetchLogs]);

  const stopDriving = useCallback(async () => {
    if (!activeLog) return;
    const duration = differenceInMinutes(new Date(), new Date(activeLog.started_at));
    await supabase
      .from('driving_time_logs')
      .update({ ended_at: new Date().toISOString(), duration_minutes: duration })
      .eq('id', activeLog.id);
    setActiveLog(null);
    await fetchLogs();
  }, [activeLog, fetchLogs]);

  const startBreak = useCallback(async () => {
    if (!driverId || !tenantId) return;
    // Stop driving first if active
    if (activeLog?.log_type === 'driving') {
      await stopDriving();
    }
    const { data } = await supabase
      .from('driving_time_logs')
      .insert({
        driver_id: driverId,
        tenant_id: tenantId,
        log_type: 'break' as any,
        auto_detected: false,
      })
      .select()
      .single();
    if (data) {
      setActiveLog(data as any);
      await fetchLogs();
    }
  }, [driverId, tenantId, activeLog, stopDriving, fetchLogs]);

  const stopBreak = useCallback(async () => {
    if (!activeLog || activeLog.log_type !== 'break') return;
    const duration = differenceInMinutes(new Date(), new Date(activeLog.started_at));
    await supabase
      .from('driving_time_logs')
      .update({ ended_at: new Date().toISOString(), duration_minutes: duration })
      .eq('id', activeLog.id);
    setActiveLog(null);
    await fetchLogs();
  }, [activeLog, fetchLogs]);

  return {
    activeLog,
    dailyDrivingMinutes,
    weeklyDrivingMinutes,
    continuousDrivingMinutes,
    dailyBreakMinutes,
    warnings,
    loading,
    startDriving,
    stopDriving,
    startBreak,
    stopBreak,
    refetch: fetchLogs,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WaitingTimeConfig {
  gracePeriodMinutes: number;
  ratePerMinute: number;
  maxChargeMinutes?: number;
}

export const useWaitingTimer = (stopId?: string, tripId?: string) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [billableMinutes, setBillableMinutes] = useState(0);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [config] = useState<WaitingTimeConfig>({ gracePeriodMinutes: 30, ratePerMinute: 0.75 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isRunning || !startTime) return;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000);
      setElapsedMinutes(elapsed);
      const billable = Math.max(0, elapsed - config.gracePeriodMinutes);
      setBillableMinutes(billable);
      setCurrentAmount(billable * config.ratePerMinute);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, startTime, config]);

  const startTimer = useCallback(() => {
    setStartTime(new Date());
    setIsRunning(true);
    toast({ title: 'Wachttijd gestart ⏱️', description: `Grace period: ${config.gracePeriodMinutes} min` });
  }, [config.gracePeriodMinutes, toast]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    toast({ title: 'Wachttijd gestopt', description: billableMinutes > 0 ? `€${currentAmount.toFixed(2)} te factureren` : 'Geen kosten' });
    setStartTime(null);
  }, [billableMinutes, currentAmount, toast]);

  const formatElapsedTime = useCallback(() => {
    if (!startTime) return '00:00:00';
    const diff = Date.now() - startTime.getTime();
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, [startTime]);

  return { isRunning, elapsedMinutes, billableMinutes, currentAmount, config, isWithinGrace: elapsedMinutes <= config.gracePeriodMinutes, gracePeriodRemaining: Math.max(0, config.gracePeriodMinutes - elapsedMinutes), startTimer, stopTimer, formatElapsedTime };
};

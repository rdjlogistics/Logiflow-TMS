import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleDetectionOptions {
  timeout?: number;
  events?: string[];
  onIdle?: () => void;
  onActive?: () => void;
  enabled?: boolean;
}

export function useIdleDetection({
  timeout = 15 * 60 * 1000,
  events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'],
  onIdle,
  onActive,
  enabled = true,
}: UseIdleDetectionOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleTime(0);

    if (isIdle) {
      setIsIdle(false);
      onActive?.();
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle?.();
    }, timeout);
  }, [isIdle, timeout, onIdle, onActive]);

  useEffect(() => {
    if (!enabled) return;

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      setIdleTime(elapsed);
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, events, resetTimer]);

  return {
    isIdle,
    idleTime,
    resetTimer,
  };
}

interface UseSessionTimeoutOptions {
  sessionTimeout?: number;
  warningBefore?: number;
  onExpire?: () => void;
  onExtend?: () => Promise<void>;
  enabled?: boolean;
}

export function useSessionTimeout({
  sessionTimeout = 30 * 60 * 1000,
  warningBefore = 5 * 60 * 1000,
  onExpire,
  onExtend,
  enabled = true,
}: UseSessionTimeoutOptions = {}) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(sessionTimeout);
  const [isExtending, setIsExtending] = useState(false);

  const warningThreshold = sessionTimeout - warningBefore;

  const { isIdle, idleTime, resetTimer } = useIdleDetection({
    timeout: warningThreshold,
    enabled,
    onIdle: () => setShowWarning(true),
    onActive: () => setShowWarning(false),
  });

  useEffect(() => {
    if (!enabled) return;

    const remaining = Math.max(0, sessionTimeout - idleTime);
    setTimeRemaining(remaining);

    if (remaining === 0) {
      onExpire?.();
    }
  }, [idleTime, sessionTimeout, enabled, onExpire]);

  const extendSession = useCallback(async () => {
    setIsExtending(true);
    try {
      await onExtend?.();
      resetTimer();
      setShowWarning(false);
    } finally {
      setIsExtending(false);
    }
  }, [onExtend, resetTimer]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes + ':' + seconds.toString().padStart(2, '0');
  };

  return {
    isIdle,
    showWarning,
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    extendSession,
    isExtending,
  };
}

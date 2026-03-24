import { useState, useEffect } from 'react';

interface NetworkStatus {
  online: boolean;
  /** undefined until first check */
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
}

/**
 * Track browser online/offline status and (where supported) connection quality.
 * Re-renders on change. Safe to use in SSR — defaults to online.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  useEffect(() => {
    function getStatus(): NetworkStatus {
      const connection =
        (navigator as Navigator & {
          connection?: { effectiveType: string; downlink: number; rtt: number };
          mozConnection?: unknown;
          webkitConnection?: unknown;
        }).connection;

      return {
        online: navigator.onLine,
        effectiveType: connection?.effectiveType as NetworkStatus['effectiveType'],
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      };
    }

    const handleChange = () => setStatus(getStatus());

    window.addEventListener('online', handleChange);
    window.addEventListener('offline', handleChange);

    const connection = (navigator as Navigator & { connection?: EventTarget }).connection;
    connection?.addEventListener?.('change', handleChange);

    setStatus(getStatus());

    return () => {
      window.removeEventListener('online', handleChange);
      window.removeEventListener('offline', handleChange);
      connection?.removeEventListener?.('change', handleChange);
    };
  }, []);

  return status;
}

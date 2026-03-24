import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { haptic } from '@/lib/haptics';

export function useSessionRefreshIndicator() {
  const [show, setShow] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        // Skip the very first token refresh on page load
        if (initialRef.current) {
          initialRef.current = false;
          return;
        }

        haptic('success');
        setLastRefreshedAt(new Date());
        setShow(true);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setShow(false), 2500);
      }
    });

    // Mark initial phase done after 5s
    const initTimeout = setTimeout(() => { initialRef.current = false; }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(initTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { show, lastRefreshedAt };
}

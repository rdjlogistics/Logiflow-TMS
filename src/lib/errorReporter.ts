/**
 * Error Reporter — Sends frontend errors to the log-client-error edge function.
 * 
 * Features:
 * - Batching: collects errors and flushes every 5 seconds
 * - Deduplication: same message+component is only sent once per session
 * - Graceful degradation: silently fails if edge function is unreachable
 */

import { supabase } from '@/integrations/supabase/client';

interface ErrorReport {
  error_message: string;
  error_stack?: string;
  component_name?: string;
  url: string;
  user_agent: string;
  metadata?: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 20;

const sentKeys = new Set<string>();
let buffer: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

function deduplicationKey(report: ErrorReport): string {
  return `${report.error_message}::${report.component_name ?? ''}`;
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0, MAX_BATCH_SIZE);

  try {
    await supabase.functions.invoke('log-client-error', {
      body: { errors: batch },
    });
  } catch {
    // Silently fail — error reporting should never break the app
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Report a frontend error. Deduplicates by message+component per session.
 */
export function reportError(
  error: Error | string,
  context?: {
    componentName?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;
  const componentName = context?.componentName;

  const key = deduplicationKey({ error_message: message, component_name: componentName, url: '', user_agent: '' });
  if (sentKeys.has(key)) return;
  sentKeys.add(key);

  buffer.push({
    error_message: message,
    error_stack: stack?.slice(0, 4000), // Limit stack size
    component_name: componentName,
    url: window.location.href,
    user_agent: navigator.userAgent,
    metadata: context?.metadata,
  });

  scheduleFlush();
}

/**
 * Initialize the reporter. Call once at app startup.
 * Sets up a beforeunload flush to catch any remaining errors.
 */
export function initErrorReporter(): void {
  if (isInitialized) return;
  isInitialized = true;

  window.addEventListener('beforeunload', () => {
    if (buffer.length > 0) {
      // Use sendBeacon for reliability on page unload
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-client-error`;
      const body = JSON.stringify({ errors: buffer });
      try {
        navigator.sendBeacon(url, body);
      } catch {
        // Last resort, ignore
      }
    }
  });
}

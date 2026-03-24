/**
 * Error Recovery System — Slim Edition
 * 
 * Core responsibilities:
 * 1. Suppress known cosmetic warnings (Radix UI, React, etc.)
 * 2. Global error handlers (unhandled rejections, chunk errors)
 * 3. Retry with exponential backoff
 * 4. Safe async wrappers
 */

import { logger } from './logger';
import { clearServiceWorkerAndCaches } from './authStorage';
import { reportError } from './errorReporter';

const SUPPRESSED_WARNINGS = [
  'Warning: Function components cannot be given refs',
  'Warning: forwardRef render functions accept exactly two parameters',
  'Cannot update a component while rendering a different component',
  'Each child in a list should have a unique "key" prop',
  'Warning: React does not recognize the',
  'Warning: Received `true` for a non-boolean attribute',
  'Warning: validateDOMNesting',
  'Hydration failed',
  'There was an error while hydrating',
  'Minified React error',
  'act(...) is not supported in production',
  'ReactDOM.render is no longer supported',
  'flushSync was called from inside a lifecycle method',
  'Warning: Cannot update a component',
  'Warning: An update to',
  'Warning: Maximum update depth exceeded',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'ResizeObserver is not defined',
  'Non-Error promise rejection captured',
  'The operation was aborted',
  'AbortError',
  'Abort fetching component',
  'Unable to preload CSS',
  'Unexpected token',
  'Radix', 'Popover', 'Dialog', 'Dropdown', 'mapboxgl', 'ResizeObserver',
  'NotAllowedError', 'Permission denied', 'QuotaExceededError', 'SecurityError', 'NotSupportedError',
  'ServiceWorker', 'sw.js', 'workbox',
];

const RETRYABLE_ERRORS = [
  'Failed to fetch', 'Network request failed', 'NetworkError', 'ERR_NETWORK',
  'ERR_INTERNET_DISCONNECTED', 'ERR_CONNECTION_REFUSED', 'ECONNRESET', 'ETIMEDOUT',
  '503 Service Unavailable', '502 Bad Gateway', '504 Gateway Timeout',
];

interface RecoveryState {
  suppressedCount: number;
  autoRecoveredCount: number;
  isInitialized: boolean;
}

const recoveryState: RecoveryState = { suppressedCount: 0, autoRecoveredCount: 0, isInitialized: false };

function shouldSuppressWarning(message: string): boolean {
  return SUPPRESSED_WARNINGS.some(w => message.includes(w));
}

function isRetryableError(error: Error | string): boolean {
  const message = typeof error === 'string' ? error : error.message;
  return RETRYABLE_ERRORS.some(p => message.includes(p));
}

function installWarningSupression(): void {
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: unknown[]) => {
    const message = args.join(' ');
    if (shouldSuppressWarning(message)) { recoveryState.suppressedCount++; return; }
    originalWarn.apply(console, args);
  };

  console.error = (...args: unknown[]) => {
    const message = args.join(' ');
    if (shouldSuppressWarning(message)) { recoveryState.suppressedCount++; return; }
    originalError.apply(console, args);
  };
}

function installGlobalErrorHandlers(): void {
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    if (shouldSuppressWarning(message)) { event.preventDefault(); recoveryState.suppressedCount++; return; }
    // Report non-suppressed unhandled rejections
    const error = event.reason instanceof Error ? event.reason : new Error(message);
    reportError(error, { componentName: 'UnhandledRejection' });
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (shouldSuppressWarning(message)) { event.preventDefault(); recoveryState.suppressedCount++; return; }
    // Report non-suppressed global errors
    reportError(event.error || new Error(message), { componentName: 'GlobalError' });
  });
}

function installChunkErrorHandler(): void {
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = String(message);
    if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk') || msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
      setTimeout(() => {
        const alreadyTried = sessionStorage.getItem('chunkRecoveryAttempt') === 'true';
        sessionStorage.setItem('chunkRecoveryAttempt', 'true');
        if (!alreadyTried) {
          void clearServiceWorkerAndCaches().finally(() => window.location.reload());
          return;
        }
        window.location.reload();
      }, 250);
      return true;
    }
    if (originalOnError) return originalOnError(message, source, lineno, colno, error);
    return false;
  };
  if (sessionStorage.getItem('chunkRecoveryAttempt')) {
    sessionStorage.removeItem('chunkRecoveryAttempt');
  }
}

export function initErrorRecoverySystem(): void {
  if (recoveryState.isInitialized) return;
  installWarningSupression();
  installGlobalErrorHandlers();
  installChunkErrorHandler();
  recoveryState.isInitialized = true;
  logger.info('Error recovery system initialized', 'ErrorRecovery');
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; maxDelay?: number; onRetry?: (attempt: number, error: Error) => void } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, onRetry } = options;
  let lastError: Error;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn(); } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries || !isRetryableError(lastError)) throw lastError;
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      if (onRetry) onRetry(attempt + 1, lastError);
      recoveryState.autoRecoveredCount++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError!;
}

export function safeAsync<T>(promise: Promise<T>, context?: string): Promise<T | undefined> {
  return promise.catch((error) => { logger.error(`Async error${context ? ` in ${context}` : ''}`, 'ErrorRecovery', error); return undefined; });
}

export function getRecoveryStats() {
  return { suppressedCount: recoveryState.suppressedCount, autoRecoveredCount: recoveryState.autoRecoveredCount, trackedPatterns: 0, isInitialized: recoveryState.isInitialized };
}

export function createCircuitBreaker<T>(fn: () => Promise<T>, options: { maxFailures?: number; resetTimeout?: number; fallback?: T } = {}) {
  const { maxFailures = 5, resetTimeout = 30000, fallback } = options;
  let failures = 0, lastFailure = 0, isOpen = false;
  return async (): Promise<T | undefined> => {
    if (isOpen && Date.now() - lastFailure > resetTimeout) { isOpen = false; failures = 0; }
    if (isOpen) return fallback;
    try { const result = await fn(); failures = 0; return result; } catch {
      failures++; lastFailure = Date.now();
      if (failures >= maxFailures) isOpen = true;
      return fallback;
    }
  };
}

export default { init: initErrorRecoverySystem, withRetry, safeAsync, createCircuitBreaker, getStats: getRecoveryStats };

import { lazy } from 'react';

/**
 * lazyWithRetry - Handles Vite chunk loading errors after deploys/hot-reload.
 * If a chunk fails to load, it forces a single page reload to fetch fresh assets.
 */
export function lazyWithRetry(factory: () => Promise<any>) {
  return lazy(() =>
    factory().catch(() => {
      const key = 'chunk-reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      sessionStorage.removeItem('chunk-reload');
      return factory();
    })
  );
}

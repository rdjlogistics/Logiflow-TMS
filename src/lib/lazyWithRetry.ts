import { lazy } from 'react';

/**
 * lazyWithRetry - Handles Vite chunk loading errors after deploys/hot-reload.
 * If a chunk fails to load, it forces a single page reload to fetch fresh assets.
 */
export function lazyWithRetry(factory: () => Promise<any>) {
  return lazy(async () => {
    const key = 'chunk-reload';

    try {
      const module = await factory();
      sessionStorage.removeItem(key);
      return module;
    } catch (error) {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => undefined);
      }

      sessionStorage.removeItem(key);
      throw error;
    }
  });
}

import { useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * In-memory cache for API responses
 */
class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private subscribers = new Map<string, Set<() => void>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
    this.notify(key);
  }

  invalidate(keyPattern?: string | RegExp): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    const regex = typeof keyPattern === 'string' 
      ? new RegExp(keyPattern) 
      : keyPattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.notify(key);
      }
    }
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);
    
    return () => {
      this.subscribers.get(key)?.delete(callback);
    };
  }

  private notify(key: string): void {
    this.subscribers.get(key)?.forEach(cb => cb());
  }

  getAge(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }

  isStale(key: string, maxAge: number): boolean {
    const age = this.getAge(key);
    return age === null || age > maxAge;
  }
}

// Singleton cache instance
export const queryCache = new QueryCache();

/**
 * Hook for cached queries with automatic revalidation
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = DEFAULT_TTL, staleWhileRevalidate = true } = options;
  
  const [data, setData] = useState<T | null>(() => queryCache.get<T>(key));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (isRevalidation = false) => {
    if (isRevalidation) {
      setIsRevalidating(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetcher();
      if (mountedRef.current) {
        queryCache.set(key, result, ttl);
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setIsRevalidating(false);
      }
    }
  }, [key, fetcher, ttl]);

  // Initial fetch or revalidation
  useEffect(() => {
    const cached = queryCache.get<T>(key);
    
    if (cached) {
      setData(cached);
      setLoading(false);
      
      // Revalidate in background if stale
      if (staleWhileRevalidate && queryCache.isStale(key, ttl / 2)) {
        fetchData(true);
      }
    } else {
      fetchData();
    }
  }, [key]);

  // Subscribe to cache updates
  useEffect(() => {
    return queryCache.subscribe(key, () => {
      const cached = queryCache.get<T>(key);
      if (cached) setData(cached);
    });
  }, [key]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => fetchData(false), [fetchData]);
  const revalidate = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    isRevalidating,
    refetch,
    revalidate,
    invalidate: () => queryCache.invalidate(key),
  };
}

/**
 * Debounced function hook
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

/**
 * Throttled function hook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): T {
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = limit - (now - lastRunRef.current);

      if (remaining <= 0) {
        lastRunRef.current = now;
        fnRef.current(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          timeoutRef.current = undefined;
          fnRef.current(...args);
        }, remaining);
      }
    }) as T,
    [limit]
  );
}

/**
 * Dedupe concurrent requests hook
 */
export function useDedupeRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): () => Promise<T> {
  const inflightRef = useRef<Promise<T> | null>(null);

  return useCallback(async () => {
    if (inflightRef.current) {
      return inflightRef.current;
    }

    inflightRef.current = fetcher().finally(() => {
      inflightRef.current = null;
    });

    return inflightRef.current;
  }, [key, fetcher]);
}
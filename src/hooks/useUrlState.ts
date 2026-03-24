import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';

type ParamValue = string | number | boolean | null | undefined;
type ParamConfig = Record<string, ParamValue>;

interface UseUrlStateOptions<T extends ParamConfig> {
  // Default values
  defaults: T;
  // Param names to sync (if not all)
  include?: (keyof T)[];
  // Param names to exclude
  exclude?: (keyof T)[];
  // Custom serializers
  serialize?: Partial<Record<keyof T, (value: any) => string>>;
  // Custom deserializers
  deserialize?: Partial<Record<keyof T, (value: string) => any>>;
  // Replace vs push history
  replace?: boolean;
}

export function useUrlState<T extends ParamConfig>({
  defaults,
  include,
  exclude = [],
  serialize = {},
  deserialize = {},
  replace = true,
}: UseUrlStateOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Determine which keys to sync
  const syncKeys = useMemo(() => {
    let keys = Object.keys(defaults) as (keyof T)[];
    if (include) {
      keys = keys.filter((k) => include.includes(k));
    }
    return keys.filter((k) => !exclude.includes(k));
  }, [defaults, include, exclude]);

  // Parse value from URL
  const parseValue = useCallback((key: keyof T, value: string | null): T[keyof T] => {
    if (value === null) return defaults[key];

    const customDeserialize = deserialize[key];
    if (customDeserialize) {
      return customDeserialize(value);
    }

    const defaultValue = defaults[key];
    
    // Type inference based on default value type
    if (typeof defaultValue === 'number') {
      const num = Number(value);
      return (isNaN(num) ? defaultValue : num) as T[keyof T];
    }
    if (typeof defaultValue === 'boolean') {
      return (value === 'true') as T[keyof T];
    }
    
    return value as T[keyof T];
  }, [defaults, deserialize]);

  // Serialize value to URL
  const serializeValue = useCallback((key: keyof T, value: T[keyof T]): string | null => {
    if (value === null || value === undefined) return null;
    if (value === defaults[key]) return null; // Don't store defaults

    const customSerialize = serialize[key];
    if (customSerialize) {
      return customSerialize(value);
    }

    return String(value);
  }, [defaults, serialize]);

  // Get current state from URL
  const state = useMemo(() => {
    const result = { ...defaults };
    
    for (const key of syncKeys) {
      const urlValue = searchParams.get(String(key));
      result[key] = parseValue(key, urlValue);
    }
    
    return result;
  }, [searchParams, syncKeys, parseValue, defaults]);

  // Update state and URL
  const setState = useCallback((updates: Partial<T>) => {
    const newParams = new URLSearchParams(searchParams);
    
    for (const [key, value] of Object.entries(updates)) {
      if (!syncKeys.includes(key as keyof T)) continue;
      
      const serialized = serializeValue(key as keyof T, value as T[keyof T]);
      
      if (serialized === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, serialized);
      }
    }
    
    setSearchParams(newParams, { replace });
  }, [searchParams, syncKeys, serializeValue, setSearchParams, replace]);

  // Reset to defaults
  const reset = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    
    for (const key of syncKeys) {
      newParams.delete(String(key));
    }
    
    setSearchParams(newParams, { replace });
  }, [searchParams, syncKeys, setSearchParams, replace]);

  return {
    state,
    setState,
    reset,
    // Get URL string for current state
    getUrl: () => `${location.pathname}?${searchParams.toString()}`,
  };
}

// Hook for deep linking with hash fragments
export function useDeepLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Parse hash on mount and changes
  useEffect(() => {
    const hash = location.hash.slice(1); // Remove #
    if (hash) {
      setActiveSection(hash);
      
      // Scroll to element
      requestAnimationFrame(() => {
        const element = document.getElementById(hash);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  // Navigate to section
  const goToSection = useCallback((sectionId: string) => {
    navigate(`${location.pathname}${location.search}#${sectionId}`, { replace: true });
  }, [navigate, location.pathname, location.search]);

  // Clear section
  const clearSection = useCallback(() => {
    navigate(`${location.pathname}${location.search}`, { replace: true });
    setActiveSection(null);
  }, [navigate, location.pathname, location.search]);

  return {
    activeSection,
    goToSection,
    clearSection,
    isActive: (sectionId: string) => activeSection === sectionId,
  };
}

// Hook for preserving scroll position
export function useScrollRestoration(key: string) {
  const location = useLocation();
  
  useEffect(() => {
    const storageKey = `scroll-${key}-${location.pathname}`;
    
    // Restore scroll position
    const savedPosition = sessionStorage.getItem(storageKey);
    if (savedPosition) {
      window.scrollTo(0, Number(savedPosition));
    }
    
    // Save scroll position on unmount
    return () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
  }, [key, location.pathname]);
}

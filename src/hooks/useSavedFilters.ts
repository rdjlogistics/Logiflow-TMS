import { useState, useCallback, useEffect } from 'react';

interface Filter {
  id: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: unknown;
  label?: string;
}

interface SavedView {
  id: string;
  name: string;
  filters: Filter[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  createdAt: string;
}

interface UseSavedFiltersOptions {
  namespace: string;
  maxViews?: number;
}

const SAVED_VIEWS_KEY = 'tms-saved-views';

export function useSavedFilters({ namespace, maxViews = 10 }: UseSavedFiltersOptions) {
  const storageKey = `${SAVED_VIEWS_KEY}-${namespace}`;

  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<Filter[]>([]);

  // Save views to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(savedViews));
  }, [savedViews, storageKey]);

  const saveView = useCallback((name: string, filters: Filter[], sortField?: string, sortDirection?: 'asc' | 'desc') => {
    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name,
      filters,
      sortField,
      sortDirection,
      createdAt: new Date().toISOString(),
    };

    setSavedViews((prev) => {
      const updated = [newView, ...prev].slice(0, maxViews);
      return updated;
    });

    return newView;
  }, [maxViews]);

  const deleteView = useCallback((viewId: string) => {
    setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
  }, [activeViewId]);

  const loadView = useCallback((viewId: string) => {
    const view = savedViews.find((v) => v.id === viewId);
    if (view) {
      setCurrentFilters(view.filters);
      setActiveViewId(viewId);
    }
  }, [savedViews]);

  const renameView = useCallback((viewId: string, newName: string) => {
    setSavedViews((prev) =>
      prev.map((v) => (v.id === viewId ? { ...v, name: newName } : v))
    );
  }, []);

  const addFilter = useCallback((filter: Omit<Filter, 'id'>) => {
    const newFilter: Filter = {
      ...filter,
      id: `filter-${Date.now()}`,
    };
    setCurrentFilters((prev) => [...prev, newFilter]);
    setActiveViewId(null); // Unsaved changes
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setCurrentFilters((prev) => prev.filter((f) => f.id !== filterId));
    setActiveViewId(null);
  }, []);

  const updateFilter = useCallback((filterId: string, updates: Partial<Filter>) => {
    setCurrentFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, ...updates } : f))
    );
    setActiveViewId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setCurrentFilters([]);
    setActiveViewId(null);
  }, []);

  // Apply filters to data
  const applyFilters = useCallback(<T extends Record<string, unknown>>(data: T[]): T[] => {
    if (currentFilters.length === 0) return data;

    return data.filter((item) => {
      return currentFilters.every((filter) => {
        const value = item[filter.field];

        switch (filter.operator) {
          case 'eq':
            return value === filter.value;
          case 'neq':
            return value !== filter.value;
          case 'gt':
            return typeof value === 'number' && value > (filter.value as number);
          case 'lt':
            return typeof value === 'number' && value < (filter.value as number);
          case 'gte':
            return typeof value === 'number' && value >= (filter.value as number);
          case 'lte':
            return typeof value === 'number' && value <= (filter.value as number);
          case 'contains':
            return typeof value === 'string' && value.toLowerCase().includes((filter.value as string).toLowerCase());
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          default:
            return true;
        }
      });
    });
  }, [currentFilters]);

  return {
    // Saved views
    savedViews,
    activeViewId,
    saveView,
    deleteView,
    loadView,
    renameView,
    
    // Current filters
    currentFilters,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    applyFilters,
    
    // State
    hasFilters: currentFilters.length > 0,
    hasUnsavedChanges: activeViewId === null && currentFilters.length > 0,
  };
}

export type { Filter, SavedView };

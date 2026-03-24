import * as React from "react";
import { toast } from "sonner";

// ============================================
// Optimistic Update Hook (Performance)
// ============================================

interface UseOptimisticActionOptions<T, R> {
  action: (data: T) => Promise<R>;
  onOptimisticUpdate?: (data: T) => void;
  onSuccess?: (result: R, data: T) => void;
  onError?: (error: Error, data: T) => void;
  onRollback?: (data: T) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticAction<T, R = void>({
  action,
  onOptimisticUpdate,
  onSuccess,
  onError,
  onRollback,
  successMessage,
  errorMessage = "Er is een fout opgetreden",
}: UseOptimisticActionOptions<T, R>) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const execute = React.useCallback(
    async (data: T) => {
      setIsPending(true);
      setError(null);

      // Apply optimistic update immediately
      onOptimisticUpdate?.(data);

      try {
        const result = await action(data);
        
        if (successMessage) {
          toast.success(successMessage);
        }
        
        onSuccess?.(result, data);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        // Rollback on error
        onRollback?.(data);
        
        toast.error(errorMessage, {
          description: error.message,
        });
        
        onError?.(error, data);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [action, onOptimisticUpdate, onSuccess, onError, onRollback, successMessage, errorMessage]
  );

  return {
    execute,
    isPending,
    error,
    reset: () => setError(null),
  };
}

// ============================================
// Optimistic List Hook
// ============================================

interface UseOptimisticListOptions<T> {
  initialItems: T[];
  getItemId: (item: T) => string;
}

export function useOptimisticList<T>({ initialItems, getItemId }: UseOptimisticListOptions<T>) {
  const [items, setItems] = React.useState<T[]>(initialItems);
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());
  const previousItemsRef = React.useRef<T[]>([]);

  // Sync with initial items when they change
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const addItem = React.useCallback((item: T) => {
    previousItemsRef.current = items;
    setItems((prev) => [...prev, item]);
    setPendingIds((prev) => new Set(prev).add(getItemId(item)));
  }, [items, getItemId]);

  const updateItem = React.useCallback((id: string, updates: Partial<T>) => {
    previousItemsRef.current = items;
    setItems((prev) =>
      prev.map((item) =>
        getItemId(item) === id ? { ...item, ...updates } : item
      )
    );
    setPendingIds((prev) => new Set(prev).add(id));
  }, [items, getItemId]);

  const removeItem = React.useCallback((id: string) => {
    previousItemsRef.current = items;
    setItems((prev) => prev.filter((item) => getItemId(item) !== id));
    setPendingIds((prev) => new Set(prev).add(id));
  }, [items, getItemId]);

  const confirmItem = React.useCallback((id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const rollback = React.useCallback(() => {
    setItems(previousItemsRef.current);
    setPendingIds(new Set());
  }, []);

  const isItemPending = React.useCallback(
    (id: string) => pendingIds.has(id),
    [pendingIds]
  );

  return {
    items,
    setItems,
    addItem,
    updateItem,
    removeItem,
    confirmItem,
    rollback,
    isItemPending,
    hasPendingChanges: pendingIds.size > 0,
  };
}

// ============================================
// Undo/Redo Stack
// ============================================

interface UseUndoRedoOptions<T> {
  initialState: T;
  maxHistory?: number;
}

export function useUndoRedo<T>({ initialState, maxHistory = 50 }: UseUndoRedoOptions<T>) {
  const [state, setState] = React.useState<T>(initialState);
  const [past, setPast] = React.useState<T[]>([]);
  const [future, setFuture] = React.useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const set = React.useCallback((newState: T | ((prev: T) => T)) => {
    setState((currentState) => {
      const nextState = typeof newState === "function" 
        ? (newState as (prev: T) => T)(currentState) 
        : newState;
      
      setPast((prev) => {
        const newPast = [...prev, currentState];
        return newPast.slice(-maxHistory);
      });
      setFuture([]);
      
      return nextState;
    });
  }, [maxHistory]);

  const undo = React.useCallback(() => {
    if (!canUndo) return;

    setPast((prev) => {
      const newPast = [...prev];
      const previous = newPast.pop();
      
      if (previous !== undefined) {
        setFuture((f) => [state, ...f]);
        setState(previous);
      }
      
      return newPast;
    });
  }, [canUndo, state]);

  const redo = React.useCallback(() => {
    if (!canRedo) return;

    setFuture((prev) => {
      const newFuture = [...prev];
      const next = newFuture.shift();
      
      if (next !== undefined) {
        setPast((p) => [...p, state]);
        setState(next);
      }
      
      return newFuture;
    });
  }, [canRedo, state]);

  const reset = React.useCallback((newInitialState?: T) => {
    setState(newInitialState ?? initialState);
    setPast([]);
    setFuture([]);
  }, [initialState]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return {
    state,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyLength: past.length,
    futureLength: future.length,
  };
}

// ============================================
// Debounced State Hook
// ============================================

export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = React.useState<T>(initialValue);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return [value, debouncedValue, setValue];
}

// ============================================
// Throttled Callback Hook
// ============================================

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastRan = React.useRef<number>(0);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  return React.useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRan = now - lastRan.current;

      if (timeSinceLastRan >= delay) {
        callback(...args);
        lastRan.current = now;
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, delay - timeSinceLastRan);
      }
    }) as T,
    [callback, delay]
  );
}

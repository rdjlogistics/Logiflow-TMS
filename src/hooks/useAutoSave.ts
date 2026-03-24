import { useState, useEffect, useCallback, useRef } from 'react';
import { useToastFeedback } from './useToastFeedback';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  // Debounce delay in ms
  delay?: number;
  // Enable/disable auto-save
  enabled?: boolean;
  // Compare function to detect changes
  isEqual?: (a: T, b: T) => boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b),
}: UseAutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const feedback = useToastFeedback();
  const lastSavedData = useRef<T>(data);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Detect changes and schedule save
  useEffect(() => {
    if (!enabled) return;

    const hasChanges = !isEqual(data, lastSavedData.current);
    setHasUnsavedChanges(hasChanges);

    if (!hasChanges) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setError(null);

      try {
        await onSave(data);
        lastSavedData.current = data;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Auto-save failed');
        setError(errorObj);
        feedback.error('Auto-save mislukt');
      } finally {
        setIsSaving(false);
      }
    }, delay);
  }, [data, delay, enabled, isEqual, onSave, feedback]);

  // Manual save function
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(data);
      lastSavedData.current = data;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      feedback.saved();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Save failed');
      setError(errorObj);
      feedback.saveFailed();
      throw errorObj;
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, feedback]);

  // Reset saved state
  const resetSavedState = useCallback((newData: T) => {
    lastSavedData.current = newData;
    setHasUnsavedChanges(false);
    setError(null);
  }, []);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    error,
    saveNow,
    resetSavedState,
  };
}

// Hook for detecting unsaved changes and warning on navigation
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  // Intercept back/forward navigation via popstate
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handlePopState = (e: PopStateEvent) => {
      const proceed = window.confirm(
        'Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt verlaten?'
      );
      if (!proceed) {
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  // Intercept tab close / browser refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt verlaten?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}

import { useCallback } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Pre-defined toast messages for common actions
const TOAST_MESSAGES = {
  // CRUD Operations
  created: (entity: string) => ({ title: `${entity} aangemaakt`, type: 'success' as ToastType }),
  updated: (entity: string) => ({ title: `${entity} bijgewerkt`, type: 'success' as ToastType }),
  deleted: (entity: string) => ({ title: `${entity} verwijderd`, type: 'success' as ToastType }),
  saved: () => ({ title: 'Opgeslagen', type: 'success' as ToastType }),
  
  // Status Changes
  statusChanged: (newStatus: string) => ({ title: `Status gewijzigd naar ${newStatus}`, type: 'success' as ToastType }),
  assigned: (entity: string) => ({ title: `${entity} toegewezen`, type: 'success' as ToastType }),
  
  // Errors
  saveFailed: () => ({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw', type: 'error' as ToastType }),
  loadFailed: () => ({ title: 'Laden mislukt', description: 'Probeer het opnieuw', type: 'error' as ToastType }),
  networkError: () => ({ title: 'Netwerkfout', description: 'Controleer je verbinding', type: 'error' as ToastType }),
  validationError: (message?: string) => ({ title: 'Validatiefout', description: message, type: 'warning' as ToastType }),
  
  // Loading States
  loading: (message: string) => ({ title: message, type: 'loading' as ToastType }),
  
  // Actions
  copied: () => ({ title: 'Gekopieerd naar klembord', type: 'success' as ToastType }),
  sent: (entity: string) => ({ title: `${entity} verzonden`, type: 'success' as ToastType }),
  refreshed: () => ({ title: 'Vernieuwd', type: 'success' as ToastType }),
} as const;

export function useToastFeedback() {
  const showToast = useCallback((
    type: ToastType,
    title: string,
    options?: ToastOptions
  ) => {
    const toastFn = {
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      loading: toast.loading,
    }[type];

    return toastFn(title, {
      description: options?.description,
      duration: options?.duration ?? (type === 'loading' ? Infinity : 3000),
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  }, []);

  // Pre-built toast functions for common actions
  const feedback = {
    // Entity CRUD
    created: (entity: string) => showToast('success', `${entity} aangemaakt`),
    updated: (entity: string) => showToast('success', `${entity} bijgewerkt`),
    deleted: (entity: string) => showToast('success', `${entity} verwijderd`),
    saved: () => showToast('success', 'Opgeslagen'),
    
    // Status
    statusChanged: (status: string) => showToast('success', `Status: ${status}`),
    assigned: (to: string) => showToast('success', `Toegewezen aan ${to}`),
    
    // Errors
    error: (message: string, description?: string) => showToast('error', message, { description }),
    saveFailed: () => showToast('error', 'Opslaan mislukt', { description: 'Probeer het opnieuw' }),
    loadFailed: () => showToast('error', 'Laden mislukt', { description: 'Probeer het opnieuw' }),
    networkError: () => showToast('error', 'Netwerkfout', { description: 'Controleer je verbinding' }),
    
    // Warnings
    warning: (message: string, description?: string) => showToast('warning', message, { description }),
    validationError: (message: string) => showToast('warning', 'Validatiefout', { description: message }),
    
    // Info
    info: (message: string, description?: string) => showToast('info', message, { description }),
    
    // Loading with promise
    promise: <T,>(
      promise: Promise<T>,
      messages: { loading: string; success: string; error: string }
    ) => {
      return toast.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      });
    },
    
    // Utilities
    copied: () => showToast('success', 'Gekopieerd'),
    sent: (entity: string) => showToast('success', `${entity} verzonden`),
    refreshed: () => showToast('success', 'Vernieuwd'),
    dismiss: toast.dismiss,
  };

  return feedback;
}

/**
 * Batch T3: useToast hook
 * Thin wrapper around sonner with helper methods: success, error, warning, info.
 * Simple API: toast.success("Opgeslagen!")
 */
import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  id?: string | number;
}

function buildOptions(options?: ToastOptions) {
  if (!options) return {};
  return {
    description: options.description,
    duration: options.duration,
    id: options.id,
    action: options.action
      ? { label: options.action.label, onClick: options.action.onClick }
      : undefined,
  };
}

export const toast = {
  /** Green success toast */
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, buildOptions(options));
  },

  /** Red error toast */
  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, buildOptions(options));
  },

  /** Yellow warning toast */
  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, buildOptions(options));
  },

  /** Blue info toast */
  info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, buildOptions(options));
  },

  /** Loading spinner toast — returns id to dismiss/update */
  loading(message: string, options?: ToastOptions) {
    return sonnerToast.loading(message, buildOptions(options));
  },

  /** Promise toast — auto success/error */
  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    return sonnerToast.promise(promise, messages);
  },

  /** Dismiss by id or all */
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },

  // Dutch shorthand helpers
  opgeslagen: () => sonnerToast.success('Opgeslagen'),
  verwijderd: (entity?: string) =>
    sonnerToast.success(entity ? `${entity} verwijderd` : 'Verwijderd'),
  fout: (msg = 'Er is een fout opgetreden') => sonnerToast.error(msg),
  gekopieerd: () => sonnerToast.success('Gekopieerd naar klembord'),
};

/**
 * Hook variant — returns the same `toast` object so it can be used inside components.
 * Provided for API symmetry; the module-level `toast` works just as well.
 */
export function useToast() {
  return toast;
}

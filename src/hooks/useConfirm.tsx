import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Provider — wrap your app root with <ConfirmProvider>.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '' });
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((options) => {
    return new Promise<boolean>((res) => {
      setOpts(options);
      setResolve(() => res);
      setOpen(true);
    });
  }, []);

  function handleResult(confirmed: boolean) {
    setOpen(false);
    resolve?.(confirmed);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={v => { if (!v) handleResult(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts.title}</AlertDialogTitle>
            {opts.description && (
              <AlertDialogDescription>{opts.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleResult(false)}>
              {opts.cancelLabel ?? 'Annuleren'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResult(true)}
              className={opts.destructive ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
            >
              {opts.confirmLabel ?? 'Bevestigen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/**
 * Hook — call `confirm({ title, description })` and await the boolean result.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: 'Verwijderen?', destructive: true });
 *   if (ok) await deleteItem(id);
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

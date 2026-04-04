/**
 * Batch T17: ConfirmDialog
 * Reusable confirmation dialog using Radix AlertDialog.
 * Different from DeleteConfirmDialog: this is a general-purpose confirm,
 * not specifically styled as destructive.
 *
 * Example:
 *   <ConfirmDialog
 *     open={open}
 *     title="Rit bevestigen"
 *     description="Weet je zeker dat je deze rit wilt starten?"
 *     onConfirm={handleConfirm}
 *     onCancel={() => setOpen(false)}
 *   />
 */
import React from 'react';
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
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConfirmVariant = 'default' | 'destructive' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIRM_STYLES: Record<ConfirmVariant, string> = {
  default:     'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  warning:     'bg-amber-500 text-white hover:bg-amber-600',
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Bevestigen',
  cancelText = 'Annuleren',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={onCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(CONFIRM_STYLES[variant])}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

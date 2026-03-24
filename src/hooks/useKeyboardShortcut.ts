import { useEffect, useCallback } from 'react';

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

interface ShortcutOptions {
  key: string;
  modifiers?: ModifierKey[];
  /** Only fire when target element is active (default: everywhere) */
  target?: HTMLElement | null;
  /** Prevent default browser action (default: true) */
  preventDefault?: boolean;
  /** Whether the shortcut is active (default: true) */
  enabled?: boolean;
}

/**
 * Register a keyboard shortcut.
 *
 * Example:
 *   useKeyboardShortcut({ key: 'k', modifiers: ['ctrl'] }, openCommandPalette);
 *   useKeyboardShortcut({ key: 'Escape' }, closeModal);
 */
export function useKeyboardShortcut(
  options: ShortcutOptions,
  handler: (e: KeyboardEvent) => void,
): void {
  const { key, modifiers = [], preventDefault = true, enabled = true, target } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const keyMatch = e.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = modifiers.includes('ctrl') ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
      const altMatch = modifiers.includes('alt') ? e.altKey : !e.altKey;
      const shiftMatch = modifiers.includes('shift') ? e.shiftKey : !e.shiftKey;
      const metaMatch = modifiers.includes('meta') ? e.metaKey : true; // meta handled above

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        if (preventDefault) e.preventDefault();
        handler(e);
      }
    },
    [key, modifiers, preventDefault, enabled, handler],
  );

  useEffect(() => {
    const el = target ?? document;
    el.addEventListener('keydown', handleKeyDown as EventListener);
    return () => el.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [target, handleKeyDown]);
}

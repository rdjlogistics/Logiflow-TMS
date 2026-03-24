import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ShortcutAction {
  keys: string[];
  description: string;
  action: () => void;
  category?: string;
  requiresCtrl?: boolean;
  requiresShift?: boolean;
  requiresAlt?: boolean;
}

// Global undo/redo stack
interface UndoableAction {
  id: string;
  description: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
  timestamp: number;
}

class UndoRedoStack {
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private maxSize = 50;

  push(action: Omit<UndoableAction, 'timestamp' | 'id'>) {
    const fullAction: UndoableAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this.undoStack.push(fullAction);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    // Clear redo stack when new action is performed
    this.redoStack = [];
    return fullAction.id;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  async undo(): Promise<UndoableAction | null> {
    const action = this.undoStack.pop();
    if (action) {
      await action.undo();
      this.redoStack.push(action);
      return action;
    }
    return null;
  }

  async redo(): Promise<UndoableAction | null> {
    const action = this.redoStack.pop();
    if (action) {
      await action.redo();
      this.undoStack.push(action);
      return action;
    }
    return null;
  }

  getLastAction(): UndoableAction | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// Singleton instance
export const undoRedoStack = new UndoRedoStack();

export function useUndoRedo() {
  const undo = useCallback(async () => {
    const action = await undoRedoStack.undo();
    if (action) {
      toast.success(`Ongedaan gemaakt: ${action.description}`);
    } else {
      toast.info('Niets om ongedaan te maken');
    }
    return action;
  }, []);

  const redo = useCallback(async () => {
    const action = await undoRedoStack.redo();
    if (action) {
      toast.success(`Opnieuw uitgevoerd: ${action.description}`);
    } else {
      toast.info('Niets om opnieuw uit te voeren');
    }
    return action;
  }, []);

  const pushAction = useCallback((action: Omit<UndoableAction, 'timestamp' | 'id'>) => {
    return undoRedoStack.push(action);
  }, []);

  return {
    undo,
    redo,
    pushAction,
    canUndo: undoRedoStack.canUndo(),
    canRedo: undoRedoStack.canRedo(),
  };
}

export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { undo, redo } = useUndoRedo();

  const shortcuts: ShortcutAction[] = [
    // Navigation
    {
      keys: ['n'],
      description: 'Nieuwe order aanmaken',
      category: 'Navigatie',
      requiresCtrl: true,
      requiresShift: true,
      action: () => {
        navigate('/orders/edit');
        toast.success('Nieuwe order', { description: 'Order formulier geopend' });
      },
    },
    {
      keys: ['f'],
      description: 'Zoeken / Command Palette',
      category: 'Navigatie',
      requiresCtrl: true,
      action: () => {
        // Dispatch custom event to open command palette
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      },
    },
    {
      keys: ['d'],
      description: 'Ga naar Dashboard',
      category: 'Navigatie',
      requiresCtrl: true,
      requiresShift: true,
      action: () => navigate('/'),
    },
    {
      keys: ['o'],
      description: 'Ga naar Orders',
      category: 'Navigatie',
      requiresCtrl: true,
      requiresShift: true,
      action: () => navigate('/orders'),
    },
    {
      keys: ['t'],
      description: 'Ga naar Tracking',
      category: 'Navigatie',
      requiresCtrl: true,
      requiresShift: true,
      action: () => navigate('/tracking'),
    },
    {
      keys: ['p'],
      description: 'Ga naar Planning',
      category: 'Navigatie',
      requiresCtrl: true,
      requiresShift: true,
      action: () => navigate('/track-chauffeurs'),
    },
    // Actions
    {
      keys: ['z'],
      description: 'Ongedaan maken',
      category: 'Acties',
      requiresCtrl: true,
      action: undo,
    },
    {
      keys: ['z'],
      description: 'Opnieuw',
      category: 'Acties',
      requiresCtrl: true,
      requiresShift: true,
      action: redo,
    },
    {
      keys: ['s'],
      description: 'Opslaan',
      category: 'Acties',
      requiresCtrl: true,
      action: () => {
        // Dispatch save event for forms to listen to
        document.dispatchEvent(new CustomEvent('global-save'));
        toast.info('Opslaan...', { duration: 1000 });
      },
    },
    {
      keys: ['Escape'],
      description: 'Sluiten / Annuleren',
      category: 'Acties',
      action: () => {
        // Dispatch escape event
        document.dispatchEvent(new CustomEvent('global-escape'));
      },
    },
    // Quick access
    {
      keys: ['1'],
      description: 'Vandaag\'s ritten',
      category: 'Sneltoetsen',
      requiresAlt: true,
      action: () => navigate('/trips?filter=today'),
    },
    {
      keys: ['2'],
      description: 'Openstaande facturen',
      category: 'Sneltoetsen',
      requiresAlt: true,
      action: () => navigate('/invoices?filter=open'),
    },
    {
      keys: ['3'],
      description: 'Messenger',
      category: 'Sneltoetsen',
      requiresAlt: true,
      action: () => navigate('/messenger'),
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard against undefined e.key (IME, dead keys, special hardware)
      if (!e.key) return;

      // Don't trigger in input fields
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;

      // Allow Ctrl+Z and Ctrl+Shift+Z in inputs
      const isUndoRedo = e.key.toLowerCase() === 'z' && (e.metaKey || e.ctrlKey);
      
      if (isInput && !isUndoRedo) return;

      const matchingShortcut = shortcuts.find(shortcut => {
        const keyMatch = shortcut.keys.includes(e.key.toLowerCase()) || 
                        shortcut.keys.includes(e.key);
        const ctrlMatch = shortcut.requiresCtrl ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
        const shiftMatch = shortcut.requiresShift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.requiresAlt ? e.altKey : !e.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (matchingShortcut) {
        e.preventDefault();
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return { shortcuts };
}

// Hook for components to register save handlers
export function useSaveHandler(handler: () => void) {
  useEffect(() => {
    const handleSave = () => handler();
    document.addEventListener('global-save', handleSave);
    return () => document.removeEventListener('global-save', handleSave);
  }, [handler]);
}

// Hook for components to register escape handlers
export function useEscapeHandler(handler: () => void) {
  useEffect(() => {
    const handleEscape = () => handler();
    document.addEventListener('global-escape', handleEscape);
    return () => document.removeEventListener('global-escape', handleEscape);
  }, [handler]);
}

export default useGlobalShortcuts;

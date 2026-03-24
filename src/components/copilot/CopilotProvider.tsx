import React, { createContext, useContext, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { useCopilot, AssistantType } from '@/hooks/useCopilot';

const LazyCommandBar = lazy(() => import('./CommandBar').then(m => ({ default: m.CommandBar })));
const LazyCopilotPanel = lazy(() => import('./CopilotPanel').then(m => ({ default: m.CopilotPanel })));

interface CopilotContextValue {
  isCommandBarOpen: boolean;
  isPanelOpen: boolean;
  openCommandBar: () => void;
  closeCommandBar: () => void;
  openPanel: (assistant?: AssistantType) => void;
  closePanel: () => void;
  togglePanel: () => void;
  activeAssistant: AssistantType;
  setActiveAssistant: (assistant: AssistantType) => void;
}

const CopilotContext = createContext<CopilotContextValue | null>(null);

export const useCopilotContext = () => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilotContext must be used within CopilotProvider');
  }
  return context;
};

interface CopilotProviderProps {
  children: React.ReactNode;
}

export const CopilotProvider: React.FC<CopilotProviderProps> = ({ children }) => {
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState<AssistantType>('dispatch_planner');

  const { sendMessage } = useCopilot(activeAssistant);

  const openCommandBar = useCallback(() => {
    setIsCommandBarOpen(true);
  }, []);

  const closeCommandBar = useCallback(() => {
    setIsCommandBarOpen(false);
  }, []);

  const openPanel = useCallback((assistant?: AssistantType) => {
    if (assistant) {
      setActiveAssistant(assistant);
    }
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  // Global keyboard shortcut for command bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandBarOpen(prev => !prev);
      }
      // Escape to close command bar
      if (e.key === 'Escape' && isCommandBarOpen) {
        setIsCommandBarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandBarOpen]);

  const handleCommandSubmit = useCallback((input: string) => {
    setIsCommandBarOpen(false);
    setIsPanelOpen(true);
    // Small delay to ensure panel is open before sending message
    setTimeout(() => {
      sendMessage(input);
    }, 100);
  }, [sendMessage]);

  const value: CopilotContextValue = {
    isCommandBarOpen,
    isPanelOpen,
    openCommandBar,
    closeCommandBar,
    openPanel,
    closePanel,
    togglePanel,
    activeAssistant,
    setActiveAssistant,
  };

  return (
    <CopilotContext.Provider value={value}>
      {children}
      {isCommandBarOpen && (
        <Suspense fallback={null}>
          <LazyCommandBar
            open={isCommandBarOpen}
            onOpenChange={setIsCommandBarOpen}
            onSubmit={handleCommandSubmit}
          />
        </Suspense>
      )}
      {isPanelOpen && (
        <Suspense fallback={null}>
          <LazyCopilotPanel
            open={isPanelOpen}
            onOpenChange={setIsPanelOpen}
            assistantType={activeAssistant}
          />
        </Suspense>
      )}
    </CopilotContext.Provider>
  );
};

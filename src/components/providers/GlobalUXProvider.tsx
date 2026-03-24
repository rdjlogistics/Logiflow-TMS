import { useEffect } from 'react';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { GlobalFocusStyles } from '@/components/accessibility/FocusStyles';

/**
 * Global UX Provider - Initializes all UX enhancements
 * Add this component near the root of your app
 */
export function GlobalUXProvider({ children }: { children: React.ReactNode }) {
  // Initialize global keyboard shortcuts
  useGlobalShortcuts();

  return (
    <>
      <GlobalFocusStyles />
      {children}
    </>
  );
}

export default GlobalUXProvider;

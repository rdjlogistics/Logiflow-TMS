import React, { useEffect, useState } from 'react';

/**
 * Enhanced Focus Management Component
 * 
 * This component manages focus styles throughout the application,
 * enabling better keyboard navigation and accessibility.
 */

// Focus trap hook for modals and dialogs
export function useFocusTrap(isActive: boolean) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, container]);

  return setContainer;
}

// Focus ring visibility hook (keyboard vs mouse)
export function useFocusVisible() {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        hadKeyboardEvent = true;
      }
    };

    const onPointerDown = () => {
      hadKeyboardEvent = false;
    };

    const onFocus = () => {
      if (hadKeyboardEvent) {
        setFocusVisible(true);
      }
    };

    const onBlur = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', onBlur);
    };
  }, []);

  return focusVisible;
}

// Skip to main content link
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[9999]
        px-4 py-2 rounded-lg
        bg-primary text-primary-foreground
        font-medium text-sm
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        transition-opacity
      "
    >
      Ga naar hoofdinhoud
    </a>
  );
}

// Focus indicator component - wraps children with enhanced focus styles
interface FocusIndicatorProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'ring' | 'underline';
}

export function FocusIndicator({ 
  children, 
  className,
  variant = 'default' 
}: FocusIndicatorProps) {
  const focusStyles = {
    default: 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
    subtle: 'focus-within:ring-1 focus-within:ring-ring/50',
    ring: 'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1',
    underline: 'focus-within:border-b-2 focus-within:border-primary',
  };

  return (
    <div className={`rounded-lg transition-shadow ${focusStyles[variant]} ${className || ''}`}>
      {children}
    </div>
  );
}

// Announce component for screen readers
interface AnnounceProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export function Announce({ message, priority = 'polite' }: AnnounceProps) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Small delay to ensure the DOM update triggers the announcement
    const timer = setTimeout(() => setAnnouncement(message), 100);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// Hook to announce messages
export function useAnnounce() {
  const [message, setMessage] = useState('');

  const announce = (text: string) => {
    setMessage('');
    // Clear and re-set to trigger announcement for same message
    requestAnimationFrame(() => setMessage(text));
  };

  return { message, announce, Announcer: () => <Announce message={message} /> };
}

// Global CSS for focus styles (inject once)
export function GlobalFocusStyles() {
  useEffect(() => {
    // Add focus-visible polyfill behavior
    const style = document.createElement('style');
    style.textContent = `
      /* Enhanced focus styles */
      *:focus {
        outline: none;
      }

      /* Keyboard focus only */
      .js-focus-visible :focus:not(.focus-visible) {
        outline: none;
        box-shadow: none;
      }

      .js-focus-visible .focus-visible {
        outline: 2px solid hsl(var(--ring));
        outline-offset: 2px;
      }

      /* Custom focus ring for interactive elements */
      button:focus-visible,
      [role="button"]:focus-visible,
      a:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible {
        outline: 2px solid hsl(var(--ring));
        outline-offset: 2px;
        border-radius: var(--radius);
      }

      /* Focus within for groups */
      .focus-within-ring:focus-within {
        outline: 2px solid hsl(var(--ring));
        outline-offset: 2px;
        border-radius: var(--radius);
      }

      /* High contrast mode support */
      @media (prefers-contrast: high) {
        *:focus-visible {
          outline: 3px solid currentColor;
          outline-offset: 3px;
        }
      }

      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
        }
      }

      /* Selected row/item styles */
      [aria-selected="true"] {
        background-color: hsl(var(--primary) / 0.1);
      }

      /* Current item indicator */
      [aria-current="true"],
      [aria-current="page"] {
        position: relative;
      }

      [aria-current="true"]::before,
      [aria-current="page"]::before {
        content: "";
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 60%;
        background-color: hsl(var(--primary));
        border-radius: 0 2px 2px 0;
      }
    `;

    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
}

export default GlobalFocusStyles;

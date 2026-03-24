import { ReactNode, useEffect, useRef, useState, useCallback } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
  // Allow element to be focusable (for skip links)
  focusable?: boolean;
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 * Use for:
 * - Skip links
 * - Icon-only buttons (provide text labels)
 * - Additional context for screen readers
 */
export function VisuallyHidden({ children, focusable = false }: VisuallyHiddenProps) {
  return (
    <span
      className={focusable ? 'sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-background focus:text-foreground focus:border' : 'sr-only'}
    >
      {children}
    </span>
  );
}

// Skip to main content link - enhanced styling
export function SkipLink({ targetId = 'main-content' }: { targetId?: string }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-5 focus:py-3 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-lg focus:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-primary-glow focus:font-semibold focus:text-sm"
    >
      Ga naar hoofdinhoud
    </a>
  );
}

// Multiple skip links for complex layouts
interface SkipLinksProps {
  links: { id: string; label: string }[];
}

export function SkipLinks({ links }: SkipLinksProps) {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-4 focus-within:left-4 focus-within:z-[9999] focus-within:flex focus-within:flex-col focus-within:gap-2 focus-within:p-2 focus-within:bg-card/95 focus-within:backdrop-blur-xl focus-within:rounded-xl focus-within:border focus-within:border-border/50 focus-within:shadow-lg">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-primary/10 focus:bg-primary focus:text-primary-foreground focus:outline-none transition-colors"
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById(link.id);
            if (target) {
              target.focus();
              target.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// Announce changes to screen readers
export function LiveRegion({
  children,
  assertive = false,
  atomic = true,
}: {
  children: ReactNode;
  assertive?: boolean;
  atomic?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

// Announcement hook for dynamic content
export function useAnnounce() {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback((text: string, delay = 100) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage('');
    timeoutRef.current = setTimeout(() => setMessage(text), delay);
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage('');
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { 
    message, 
    announce, 
    clear,
    AnnouncerRegion: () => <LiveRegion assertive>{message}</LiveRegion> 
  };
}

// Focus indicator component for custom focus rings
export function FocusRing({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={`focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-md ${className}`}>
      {children}
    </div>
  );
}

// Accessible icon button wrapper
export function AccessibleIconButton({
  children,
  label,
  ...props
}: {
  children: ReactNode;
  label: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button aria-label={label} {...props}>
      {children}
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  );
}

// Focus trap hook for modals
export function useFocusTrapSimple(active = true) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return containerRef;
}

// Reduced motion hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// High contrast mode detection
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setIsHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
}

import { useEffect, useRef, useCallback } from 'react';

/**
 * Mouse Parallax Hook — Sets CSS custom properties --mouse-x and --mouse-y
 * on document.documentElement for GPU-accelerated parallax via CSS transforms.
 * Values normalized from -1 to 1.
 * Only active when enabled (e.g., Vision Pro theme).
 */
export function useMouseParallax(enabled: boolean) {
  const rafId = useRef<number>(0);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  const lerp = useCallback(() => {
    const smoothing = 0.08;
    current.current.x += (target.current.x - current.current.x) * smoothing;
    current.current.y += (target.current.y - current.current.y) * smoothing;

    const root = document.documentElement;
    root.style.setProperty('--mouse-x', current.current.x.toFixed(4));
    root.style.setProperty('--mouse-y', current.current.y.toFixed(4));

    rafId.current = requestAnimationFrame(lerp);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Clean up CSS vars when disabled
      const root = document.documentElement;
      root.style.removeProperty('--mouse-x');
      root.style.removeProperty('--mouse-y');
      return;
    }

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId.current = requestAnimationFrame(lerp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId.current);
      const root = document.documentElement;
      root.style.removeProperty('--mouse-x');
      root.style.removeProperty('--mouse-y');
    };
  }, [enabled, lerp]);
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface MousePosition {
  x: number;
  y: number;
  normalizedX: number; // -1 to 1
  normalizedY: number; // -1 to 1
}

interface ScrollPosition {
  scrollY: number;
  scrollProgress: number; // 0 to 1
  direction: 'up' | 'down' | null;
}

interface ParallaxConfig {
  enableMouse?: boolean;
  enableScroll?: boolean;
  smoothing?: number; // 0-1, higher = smoother
}

export const useParallaxEffect = (config: ParallaxConfig = {}) => {
  const { enableMouse = true, enableScroll = true, smoothing = 0.1 } = config;

  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
  });

  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    scrollY: 0,
    scrollProgress: 0,
    direction: null,
  });

  const lastScrollY = useRef(0);
  const animationFrame = useRef<number>();
  const targetMouse = useRef({ x: 0, y: 0 });

  // Smooth mouse tracking
  const updateMousePosition = useCallback(() => {
    setMousePosition((prev) => ({
      ...prev,
      x: prev.x + (targetMouse.current.x - prev.x) * smoothing,
      y: prev.y + (targetMouse.current.y - prev.y) * smoothing,
      normalizedX:
        prev.normalizedX +
        ((targetMouse.current.x / window.innerWidth) * 2 - 1 - prev.normalizedX) * smoothing,
      normalizedY:
        prev.normalizedY +
        ((targetMouse.current.y / window.innerHeight) * 2 - 1 - prev.normalizedY) * smoothing,
    }));
    animationFrame.current = requestAnimationFrame(updateMousePosition);
  }, [smoothing]);

  useEffect(() => {
    if (!enableMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);
    animationFrame.current = requestAnimationFrame(updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [enableMouse, updateMousePosition]);

  useEffect(() => {
    if (!enableScroll) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? scrollY / docHeight : 0;

      setScrollPosition({
        scrollY,
        scrollProgress: Math.min(1, Math.max(0, scrollProgress)),
        direction: scrollY > lastScrollY.current ? 'down' : scrollY < lastScrollY.current ? 'up' : null,
      });

      lastScrollY.current = scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enableScroll]);

  // Helper functions for transformations
  const getParallaxStyle = useCallback(
    (intensity: number = 1, type: 'translate' | 'rotate' | 'scale' = 'translate') => {
      const mx = mousePosition.normalizedX * intensity;
      const my = mousePosition.normalizedY * intensity;
      const sp = scrollPosition.scrollProgress * intensity;

      switch (type) {
        case 'translate':
          return {
            transform: `translate3d(${mx * 20}px, ${my * 20 + sp * -50}px, 0)`,
          };
        case 'rotate':
          return {
            transform: `rotate3d(${my}, ${mx}, 0, ${intensity * 10}deg)`,
          };
        case 'scale':
          return {
            transform: `scale(${1 + sp * intensity * 0.1})`,
          };
        default:
          return {};
      }
    },
    [mousePosition, scrollPosition]
  );

  const getFloatStyle = useCallback(
    (index: number = 0, intensity: number = 1) => {
      const offset = index * 0.5;
      const mx = mousePosition.normalizedX * intensity * 15;
      const my = mousePosition.normalizedY * intensity * 15;
      const floatY = Math.sin((Date.now() / 1000 + offset) * 0.5) * 10 * intensity;

      return {
        transform: `translate3d(${mx}px, ${my + floatY}px, 0)`,
      };
    },
    [mousePosition]
  );

  return {
    mousePosition,
    scrollPosition,
    getParallaxStyle,
    getFloatStyle,
  };
};

// Hook for scroll-triggered animations
export const useScrollReveal = (threshold: number = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return { ref, isVisible };
};

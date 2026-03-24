import React, { useRef, useState, useEffect, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyWidgetProps {
  children: ReactNode;
  minHeight?: number;
}

/**
 * Renders children only after the element enters the viewport.
 * Once rendered, stays rendered (no unmounting on scroll-away).
 */
const LazyWidget = ({ children, minHeight = 120 }: LazyWidgetProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start loading 200px before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (hasIntersected) {
    return <>{children}</>;
  }

  return (
    <div ref={ref} style={{ minHeight }}>
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
};

export default LazyWidget;

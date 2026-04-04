import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { RefreshCw, ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================
// Pull to Refresh Component (Mobile Gestures)
// ============================================

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  className?: string;
  disabled?: boolean;
  refreshingText?: string;
  pullingText?: string;
  releaseText?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  className,
  disabled = false,
  refreshingText = "Vernieuwen...",
  pullingText = "Trek om te vernieuwen",
  releaseText = "Laat los om te vernieuwen",
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const y = useMotionValue(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Transform values for the refresh indicator
  const indicatorOpacity = useTransform(y, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const indicatorScale = useTransform(y, [0, threshold], [0.5, 1]);
  const rotation = useTransform(y, [0, threshold * 2], [0, 360]);
  const progress = useTransform(y, [0, threshold], [0, 1]);

  const handleDrag = (_: any, info: PanInfo) => {
    // Only allow pull down at the top of the scroll container
    if (containerRef.current && containerRef.current.scrollTop > 0) {
      y.set(0);
      return;
    }
    
    // Limit the pull distance
    const pullDistance = Math.min(info.offset.y, maxPull);
    if (pullDistance > 0) {
      y.set(pullDistance);
      setIsPulling(pullDistance > 0);
    }
  };

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const pullDistance = info.offset.y;
    
    if (pullDistance >= threshold && !isRefreshing && !disabled) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    y.set(0);
  };

  const currentPullDistance = y.get();
  const shouldRelease = currentPullDistance >= threshold;

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Refresh indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        style={{
          opacity: indicatorOpacity,
          scale: indicatorScale,
          height: threshold,
          y: useTransform(y, [0, threshold], [-threshold, 0]),
        }}
      >
        <motion.div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "bg-card/95 backdrop-blur-sm border border-border/50",
            "shadow-lg"
          )}
        >
          {isRefreshing ? (
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <motion.div style={{ rotate: rotation }}>
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          )}
        </motion.div>
        
        <motion.span 
          className="mt-2 text-xs text-muted-foreground font-medium"
          style={{ opacity: progress }}
        >
          {isRefreshing 
            ? refreshingText 
            : shouldRelease 
              ? releaseText 
              : pullingText
          }
        </motion.span>
      </motion.div>

      {/* Content container */}
      <motion.div
        ref={containerRef}
        drag={isRefreshing ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y: isRefreshing ? threshold / 2 : y }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============================================
// Hook for pull to refresh logic
// ============================================

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const startY = React.useRef(0);
  const containerRef = React.useRef<HTMLElement | null>(null);

  const handleTouchStart = React.useCallback((e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (startY.current === 0) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
      e.preventDefault();
    }
  }, [threshold]);

  const handleTouchEnd = React.useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const bind = React.useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
    
    if (element) {
      element.addEventListener("touchstart", handleTouchStart, { passive: true });
      element.addEventListener("touchmove", handleTouchMove, { passive: false });
      element.addEventListener("touchend", handleTouchEnd);
    }
    
    return () => {
      if (element) {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchmove", handleTouchMove);
        element.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
    shouldRelease: pullDistance >= threshold,
    bind,
  };
}

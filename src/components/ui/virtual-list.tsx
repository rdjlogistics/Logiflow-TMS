import * as React from "react";

import { cn } from "@/lib/utils";

// ============================================
// Virtual List for Large Datasets (Performance)
// ============================================

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  isLoading?: boolean;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className,
  containerClassName,
  emptyState,
  loadingState,
  isLoading = false,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Handle scroll
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if end reached
    if (onEndReached) {
      const distanceFromEnd = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceFromEnd < endReachedThreshold) {
        onEndReached();
      }
    }
  }, [onEndReached, endReachedThreshold]);

  // Measure container
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle loading state
  if (isLoading && items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", containerClassName)}>
        {loadingState || (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Laden...</span>
          </div>
        )}
      </div>
    );
  }

  // Handle empty state
  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", containerClassName)}>
        {emptyState || (
          <span className="text-sm text-muted-foreground">Geen items gevonden</span>
        )}
      </div>
    );
  }

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("overflow-auto", containerClassName)}
    >
      <div
        className={cn("relative", className)}
        style={{ height: totalHeight }}
      >
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          return (
            <div
              key={actualIndex}
              className="absolute left-0 right-0"
              style={{
                top: actualIndex * itemHeight,
                height: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
        
        {/* Loading indicator at bottom */}
        {isLoading && items.length > 0 && (
          <div
            className="absolute left-0 right-0 flex items-center justify-center py-4"
            style={{ top: totalHeight }}
          >
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Virtualized Grid for Card Layouts
// ============================================

interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  columns: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
}

export function VirtualGrid<T>({
  items,
  itemHeight,
  columns,
  renderItem,
  gap = 16,
  overscan = 2,
  className,
  containerClassName,
  emptyState,
  isLoading = false,
}: VirtualGridProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Calculate row dimensions
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * rowHeight;

  // Calculate visible range
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    totalRows - 1,
    Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
  );

  // Handle scroll
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Measure container
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);
    setContainerWidth(container.clientWidth);

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate item width
  const itemWidth = (containerWidth - gap * (columns - 1)) / columns;

  // Handle empty/loading states
  if (isLoading && items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", containerClassName)}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", containerClassName)}>
        {emptyState || <span className="text-sm text-muted-foreground">Geen items</span>}
      </div>
    );
  }

  // Get visible rows and their items
  const visibleItems: { item: T; index: number; row: number; col: number }[] = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index < items.length) {
        visibleItems.push({ item: items[index], index, row, col });
      }
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("overflow-auto", containerClassName)}
    >
      <div
        className={cn("relative", className)}
        style={{ height: totalHeight }}
      >
        {visibleItems.map(({ item, index, row, col }) => (
          <div
            key={index}
            className="absolute"
            style={{
              top: row * rowHeight,
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Hook for infinite scroll
// ============================================

interface UseInfiniteScrollOptions {
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  threshold = 200,
}: UseInfiniteScrollOptions) {
  const [isLoading, setIsLoading] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadingRef = React.useRef(false);

  const sentinelRef = React.useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !hasMore) return;

      observerRef.current = new IntersectionObserver(
        async (entries) => {
          if (entries[0].isIntersecting && !loadingRef.current && hasMore) {
            loadingRef.current = true;
            setIsLoading(true);
            
            try {
              await onLoadMore();
            } finally {
              loadingRef.current = false;
              setIsLoading(false);
            }
          }
        },
        { rootMargin: `${threshold}px` }
      );

      observerRef.current.observe(node);
    },
    [hasMore, onLoadMore, threshold]
  );

  React.useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { sentinelRef, isLoading };
}

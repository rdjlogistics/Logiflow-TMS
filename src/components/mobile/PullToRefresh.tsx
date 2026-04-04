import { ReactNode, forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh = forwardRef<HTMLDivElement, PullToRefreshProps>(
  ({ onRefresh, children, className, disabled = false }, ref) => {
    const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
      onRefresh,
      disabled,
    });

    return (
      <div 
        ref={containerRef}
        className={cn("relative overflow-auto", className)}
      >
        {/* Pull indicator */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
          style={{
            top: Math.max(pullDistance - 40, -40),
            opacity: progress,
          }}}}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
            <RefreshCw 
              className={cn(
                "h-5 w-5 text-primary transition-transform",
                isRefreshing && "animate-spin"
              )} 
              style={{ 
                transform: `rotate(${progress * 180}deg)`,
              }}
            />
          </div>
        </div>

        {/* Content with pull transform */}
        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
          }}
          className="min-h-full"
        >
          {children}
        </div>
      </div>
    );
  }
);

PullToRefresh.displayName = 'PullToRefresh';

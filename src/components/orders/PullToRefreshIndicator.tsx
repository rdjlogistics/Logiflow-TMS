import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  pullDistance: number;
}

const PullToRefreshIndicator = ({
  pullProgress,
  isRefreshing,
  pullDistance,
}: PullToRefreshIndicatorProps) => {
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none animate-in fade-in duration-150"
      style={{ top: 0, height: pullDistance }}
    >
      <div
        className={cn(
          "flex items-center justify-center h-10 w-10 rounded-full",
          "bg-primary/10 backdrop-blur-sm border border-primary/20",
          pullProgress >= 1 && "bg-primary/20 border-primary/40"
        )}
      >
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : (
          <ArrowDown
            className={cn(
              "h-5 w-5 transition-all duration-200",
              pullProgress >= 1 ? "text-primary rotate-180" : "text-muted-foreground"
            )}
            style={{ transform: `rotate(${pullProgress * 180}deg)` }}
          />
        )}
      </div>
      
      {pullProgress >= 0.5 && !isRefreshing && (
        <span className="absolute bottom-2 text-xs text-muted-foreground animate-in fade-in duration-200">
          {pullProgress >= 1 ? "Loslaten om te verversen" : "Trek naar beneden..."}
        </span>
      )}
    </div>
  );
};

export default PullToRefreshIndicator;

import { Loader2, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
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
    <motion.div
      className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
      style={{
        top: 0,
        height: pullDistance,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
          <motion.div
            animate={{
              rotate: pullProgress * 180,
            }}
            transition={{ type: "spring", damping: 20 }}
          >
            <ArrowDown
              className={cn(
                "h-5 w-5 transition-colors",
                pullProgress >= 1 ? "text-primary" : "text-muted-foreground"
              )}
            />
          </motion.div>
        )}
      </div>
      
      {pullProgress >= 0.5 && !isRefreshing && (
        <motion.span
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 text-xs text-muted-foreground"
        >
          {pullProgress >= 1 ? "Loslaten om te verversen" : "Trek naar beneden..."}
        </motion.span>
      )}
    </motion.div>
  );
};

export default PullToRefreshIndicator;

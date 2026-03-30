import { useState, useEffect } from "react";
import { Loader2, RefreshCcw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LoadingStateProps {
  message?: string;
  className?: string;
  slowTimeout?: number;
  errorTimeout?: number;
  onRetry?: () => void;
}

export function LoadingState({
  message = "Laden...",
  className,
  slowTimeout = 10000,
  errorTimeout = 30000,
  onRetry,
}: LoadingStateProps) {
  const [phase, setPhase] = useState<"loading" | "slow" | "error">("loading");

  useEffect(() => {
    setPhase("loading");
    const slow = setTimeout(() => setPhase("slow"), slowTimeout);
    const err = setTimeout(() => setPhase("error"), errorTimeout);
    return () => {
      clearTimeout(slow);
      clearTimeout(err);
    };
  }, [slowTimeout, errorTimeout]);

  if (phase === "error") {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h3 className="text-base font-semibold mb-1">Laden mislukt</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Er is een probleem opgetreden. Probeer de pagina te vernieuwen.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry ?? (() => window.location.reload())}
          className="gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Opnieuw laden
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {phase === "slow" && (
        <p className="text-xs text-muted-foreground/70 mt-2 max-w-xs text-center">
          Dit duurt langer dan verwacht. Probeer de pagina te vernieuwen als het niet lukt.
        </p>
      )}
    </div>
  );
}

interface SkeletonRowsProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonRows({ rows = 5, columns = 4, className }: SkeletonRowsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className={cn(
                "h-4 bg-muted rounded",
                j === 0 ? "w-32" : "flex-1"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

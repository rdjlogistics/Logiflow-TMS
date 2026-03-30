import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Er ging iets mis",
  message = "Er is een fout opgetreden. Probeer het opnieuw.",
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  useEffect(() => {
    if (error) {
      console.error("[ErrorState]", error);
    }
  }, [error]);

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Opnieuw proberen
        </Button>
      )}
    </div>
  );
}

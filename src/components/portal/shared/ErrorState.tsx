import { AlertTriangle, RefreshCcw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = "Er ging iets mis",
  message = "Er is een fout opgetreden. Probeer het opnieuw.", 
  onRetry,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Opnieuw proberen
        </Button>
      )}
    </div>
  );
}

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Geen internetverbinding</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Controleer je internetverbinding en probeer het opnieuw.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Opnieuw proberen
        </Button>
      )}
    </div>
  );
}

interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorAlert({ 
  title = "Fout", 
  message, 
  onDismiss,
  className 
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={cn("mb-4", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="h-auto p-1 text-destructive-foreground hover:text-destructive-foreground"
          >
            Sluiten
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Wifi, WifiOff, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// Spinner with variants
interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "default" | "gold" | "white";
}

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const spinnerColors = {
  default: "text-primary",
  gold: "text-gold",
  white: "text-white",
};

export function Spinner({ size = "md", className, variant = "default" }: SpinnerProps) {
  return (
    <Loader2 
      className={cn(
        "animate-spin", 
        spinnerSizes[size], 
        spinnerColors[variant],
        className
      )} 
    />
  );
}

// Pulsing dots loader
export function DotsLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Skeleton pulse with shimmer effect
export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-muted/50 rounded-lg", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// Full screen loading overlay
interface LoadingOverlayProps {
  message?: string;
  show?: boolean;
}

export function LoadingOverlay({ message = "Laden...", show = true }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Spinner size="lg" />
        </motion.div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </motion.div>
  );
}

// Inline loading state
interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({ message = "Laden...", className }: InlineLoadingProps) {
  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <Spinner size="sm" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Button loading state (for use inside buttons)
export function ButtonLoading({ className }: { className?: string }) {
  return <Spinner size="sm" className={cn("mr-2", className)} />;
}

// Connection status indicator
interface ConnectionStatusProps {
  connected: boolean;
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ connected, className, showLabel = true }: ConnectionStatusProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        connected ? "bg-success" : "bg-destructive animate-pulse"
      )} />
      {showLabel && (
        <span className={cn(
          "text-xs font-medium",
          connected ? "text-success" : "text-destructive"
        )}>
          {connected ? "Verbonden" : "Geen verbinding"}
        </span>
      )}
    </div>
  );
}

// Sync status indicator
interface SyncStatusProps {
  status: "synced" | "syncing" | "offline" | "error";
  className?: string;
}

export function SyncStatus({ status, className }: SyncStatusProps) {
  const config = {
    synced: { icon: Cloud, label: "Gesynchroniseerd", color: "text-success" },
    syncing: { icon: RefreshCw, label: "Synchroniseren...", color: "text-primary" },
    offline: { icon: CloudOff, label: "Offline", color: "text-muted-foreground" },
    error: { icon: WifiOff, label: "Sync mislukt", color: "text-destructive" },
  };

  const { icon: Icon, label, color } = config[status];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Icon className={cn("h-4 w-4", color, status === "syncing" && "animate-spin")} />
      <span className={cn("text-xs font-medium", color)}>{label}</span>
    </div>
  );
}

// Retry loading state
interface RetryLoadingProps {
  error?: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}

export function RetryLoading({ error, onRetry, retrying = false, className }: RetryLoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center", className)}>
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <WifiOff className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm font-medium mb-1">Laden mislukt</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">
        {error || "Er is een fout opgetreden bij het laden van de gegevens."}
      </p>
      <Button onClick={onRetry} disabled={retrying} size="sm" className="gap-2">
        {retrying ? (
          <>
            <Spinner size="sm" variant="white" />
            Opnieuw proberen...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Opnieuw proberen
          </>
        )}
      </Button>
    </div>
  );
}

// Progress loading bar
interface ProgressLoadingProps {
  progress: number; // 0-100
  label?: string;
  className?: string;
}

export function ProgressLoading({ progress, label, className }: ProgressLoadingProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium tabular-nums">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// Skeleton with pulse animation
export function PulseSkeleton({ 
  className,
  children,
}: { 
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-muted/50", className)}>
      {children}
    </div>
  );
}

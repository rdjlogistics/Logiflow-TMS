import { ReactNode } from "react";
import { cn } from "@/lib/utils";
interface WMSGlassCardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  actions?: ReactNode;
  variant?: "default" | "elevated" | "bordered";
  noPadding?: boolean;
}

export function WMSGlassCard({
  children,
  className,
  header,
  actions,
  variant = "default",
  noPadding = false,
}: WMSGlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm",
        variant === "elevated" && "shadow-lg shadow-black/5",
        variant === "bordered" && "border-2",
        className
      )}
    >
      {/* Premium top highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      
      {/* Subtle corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/5 to-transparent opacity-50 pointer-events-none" />

      {/* Header */}
      {(header || actions) && (
        <div className="relative flex items-center justify-between gap-4 px-5 py-4 border-b border-border/40">
          <div className="flex-1 min-w-0">{header}</div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className={cn("relative", !noPadding && "p-5")}>{children}</div>
    </div>
  );
}

export function WMSCardTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold tracking-tight">{children}</h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

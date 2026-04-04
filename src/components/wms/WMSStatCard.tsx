import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WMSStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  variant?: "default" | "primary" | "gold" | "success" | "warning" | "danger";
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    accent: "from-muted/20 to-transparent",
    glow: "",
  },
  primary: {
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    accent: "from-primary/10 to-transparent",
    glow: "shadow-[0_0_40px_-12px_hsl(var(--primary)/0.3)]",
  },
  gold: {
    iconBg: "bg-[hsl(var(--accent))]/15",
    iconColor: "text-[hsl(var(--accent))]",
    accent: "from-[hsl(var(--accent))]/10 to-transparent",
    glow: "shadow-[0_0_40px_-12px_hsl(var(--accent)/0.35)]",
  },
  success: {
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-500",
    accent: "from-emerald-500/10 to-transparent",
    glow: "shadow-[0_0_40px_-12px_rgba(16,185,129,0.3)]",
  },
  warning: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500",
    accent: "from-amber-500/10 to-transparent",
    glow: "shadow-[0_0_40px_-12px_rgba(245,158,11,0.3)]",
  },
  danger: {
    iconBg: "bg-red-500/15",
    iconColor: "text-red-500",
    accent: "from-red-500/10 to-transparent",
    glow: "shadow-[0_0_40px_-12px_rgba(239,68,68,0.3)]",
  },
};

export function WMSStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
  onClick,
}: WMSStatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6",
        "transition-all duration-300",
        styles.glow,
        onClick && "cursor-pointer hover:border-border/60",
        className
      )}
      onClick={onClick}
    >
      {/* Subtle gradient overlay */}
      <div
        className={cn(
          "absolute top-0 right-0 w-32 h-32 bg-gradient-radial",
          styles.accent
        )}
      />
      
      {/* Top highlight line */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-1 tracking-wide uppercase">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  trend.positive ? "text-emerald-500" : "text-red-500"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        
        <div
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-xl",
            styles.iconBg
          )}
        >
          <div className={cn("w-7 h-7", styles.iconColor)}>{icon}</div>
        </div>
      </div>

      {/* Bottom shimmer effect on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

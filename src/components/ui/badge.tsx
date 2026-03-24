import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm shadow-primary/20",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-destructive/20 bg-destructive/15 text-destructive",
        warning: "border-warning/20 bg-warning/15 text-warning",
        success: "border-success/20 bg-success/15 text-success",
        info: "border-info/20 bg-info/15 text-info",
        outline: "border-border/60 text-foreground bg-background/50 backdrop-blur-sm",
        muted: "border-transparent bg-muted text-muted-foreground",
        premium: "border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 text-primary",
        gold: "border-accent/30 bg-gradient-to-r from-accent/15 to-accent/5 text-accent",
        glass: "border-border/30 bg-background/30 backdrop-blur-xl text-foreground",
        pulse: "border-transparent bg-primary text-primary-foreground animate-pulse",
        dot: "border-transparent bg-transparent text-foreground pl-0",
        counter: "border-transparent bg-destructive text-destructive-foreground min-w-[1.25rem] justify-center px-1.5 rounded-full",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  dot?: boolean;
  dotColor?: "success" | "warning" | "destructive" | "info" | "primary";
  animated?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, removable, onRemove, icon, dot, dotColor = "success", animated, children, ...props }, ref) => {
    return (
      <div 
        ref={ref} 
        className={cn(
          badgeVariants({ variant: dot ? "dot" : variant, size }),
          animated && "animate-scale-fade-in",
          className
        )} 
        {...props}
      >
        {/* Status dot */}
        {dot && (
          <span 
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              dotColor === "success" && "bg-success",
              dotColor === "warning" && "bg-warning",
              dotColor === "destructive" && "bg-destructive",
              dotColor === "info" && "bg-info",
              dotColor === "primary" && "bg-primary",
              animated && "animate-pulse"
            )}
          />
        )}
        
        {/* Icon */}
        {icon && !dot && (
          <span className="shrink-0 -ml-0.5">{icon}</span>
        )}
        
        {/* Content */}
        {children}
        
        {/* Remove button */}
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={cn(
              "-mr-1 p-0.5 rounded-full",
              "hover:bg-foreground/10 transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-ring"
            )}
            aria-label="Verwijderen"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);
Badge.displayName = "Badge";

// Animated badge wrapper
interface AnimatedBadgeProps extends BadgeProps {
  show?: boolean;
}

const AnimatedBadge = React.forwardRef<HTMLDivElement, AnimatedBadgeProps>(
  ({ show = true, ...props }, ref) => {
    if (!show) return null;
    return <Badge ref={ref} animated {...props} />;
  }
);
AnimatedBadge.displayName = "AnimatedBadge";

// Counter badge for notifications
interface CounterBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

const CounterBadge = ({ count, max = 99, className }: CounterBadgeProps) => {
  if (count <= 0) return null;
  
  return (
    <Badge variant="counter" size="sm" className={className}>
      {count > max ? `${max}+` : count}
    </Badge>
  );
};
CounterBadge.displayName = "CounterBadge";

// Status badge with dot
interface StatusBadgeProps {
  status: "online" | "offline" | "busy" | "away" | "pending";
  label?: string;
  className?: string;
}

const statusConfig = {
  online: { color: "success" as const, label: "Online" },
  offline: { color: "destructive" as const, label: "Offline" },
  busy: { color: "destructive" as const, label: "Bezet" },
  away: { color: "warning" as const, label: "Afwezig" },
  pending: { color: "info" as const, label: "In afwachting" },
};

const StatusBadge = ({ status, label, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge dot dotColor={config.color} className={className}>
      {label || config.label}
    </Badge>
  );
};
StatusBadge.displayName = "StatusBadge";

export { Badge, AnimatedBadge, CounterBadge, StatusBadge, badgeVariants };

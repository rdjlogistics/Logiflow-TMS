import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface InputProps extends React.ComponentProps<"input"> {
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon: Icon, iconPosition = "left", error, success, ...props }, ref) => {
    const hasIcon = !!Icon;
    
    return (
      <div className="relative w-full">
        {hasIcon && iconPosition === "left" && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border-2 bg-background/50 backdrop-blur-sm px-4 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 touch-manipulation",
            // Default border
            !error && !success && "border-input focus-visible:border-primary/50 hover:border-border/80",
            // Error state
            error && "border-destructive/50 focus-visible:border-destructive focus-visible:ring-destructive/20",
            // Success state
            success && "border-success/50 focus-visible:border-success focus-visible:ring-success/20",
            // Icon padding
            hasIcon && iconPosition === "left" && "pl-10",
            hasIcon && iconPosition === "right" && "pr-10",
            className,
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {hasIcon && iconPosition === "right" && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };

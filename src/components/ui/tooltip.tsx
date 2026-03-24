import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const tooltipVariants = cva(
  "z-50 overflow-hidden px-3 py-2 text-sm shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  {
    variants: {
      variant: {
        default: [
          "rounded-xl border border-border/50",
          "bg-popover/95 backdrop-blur-xl",
          "text-popover-foreground",
          "shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)]",
        ],
        premium: [
          "rounded-xl border border-primary/20",
          "bg-gradient-to-br from-card/98 via-card/95 to-primary/5",
          "backdrop-blur-xl",
          "text-foreground",
          "shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.25)]",
        ],
        gold: [
          "rounded-xl border border-accent/30",
          "bg-gradient-to-br from-card/98 via-card/95 to-accent/10",
          "backdrop-blur-xl",
          "text-foreground",
          "shadow-[0_8px_32px_-8px_hsl(var(--accent)/0.3)]",
        ],
        dark: [
          "rounded-xl border border-white/10",
          "bg-slate-900/98 backdrop-blur-xl",
          "text-white",
          "shadow-[0_8px_32px_-8px_hsl(0_0%_0%/0.5)]",
        ],
        info: [
          "rounded-xl border border-info/30",
          "bg-gradient-to-br from-card/98 to-info/10",
          "backdrop-blur-xl",
          "text-foreground",
          "shadow-[0_8px_24px_-6px_hsl(var(--info)/0.25)]",
        ],
      },
      size: {
        sm: "px-2 py-1 text-xs",
        default: "px-3 py-2 text-sm",
        lg: "px-4 py-2.5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipVariants> {
  showArrow?: boolean;
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 6, variant, size, showArrow = false, children, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(tooltipVariants({ variant, size }), className)}
    {...props}
  >
    {children}
    {showArrow && (
      <TooltipPrimitive.Arrow 
        className="fill-popover drop-shadow-sm" 
        width={10} 
        height={5} 
      />
    )}
  </TooltipPrimitive.Content>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const dialogContentVariants = cva(
  [
    "relative pointer-events-auto grid w-full gap-4 p-6 duration-200 outline-none",
    "max-h-full min-h-0 overflow-hidden",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  ],
  {
    variants: {
      variant: {
        default: [
          "rounded-2xl border border-border/50",
          "bg-card/95 backdrop-blur-xl",
          "shadow-[0_24px_64px_-16px_hsl(var(--foreground)/0.25)]",
        ],
        premium: [
          "rounded-2xl border border-primary/20",
          "bg-gradient-to-br from-card/98 via-card/95 to-primary/5",
          "backdrop-blur-xl",
          "shadow-[0_32px_80px_-20px_hsl(var(--primary)/0.3)]",
        ],
        gold: [
          "rounded-2xl border border-accent/30",
          "bg-gradient-to-br from-card/98 via-card/95 to-accent/8",
          "backdrop-blur-xl",
          "shadow-[0_32px_80px_-20px_hsl(var(--accent)/0.35)]",
        ],
        fullscreen: [
          "h-full w-full max-w-none rounded-none border-0 bg-background",
          "shadow-none",
        ],
        sheet: [
          "mt-auto w-full rounded-t-2xl border border-border/50",
          "bg-card/95 backdrop-blur-xl",
          "shadow-[0_-16px_48px_-12px_hsl(var(--foreground)/0.2)]",
          "data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-bottom-0",
          "data-[state=closed]:slide-out-to-bottom-full sm:data-[state=closed]:slide-out-to-bottom-0",
          "sm:mt-0 sm:rounded-2xl",
        ],
        minimal: [
          "rounded-xl border-0 bg-card shadow-2xl",
        ],
      },
      size: {
        sm: "max-w-sm",
        default: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-[95vw]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  hideCloseButton?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, variant, size, hideCloseButton = false, ...props }, ref) => {
  const resolvedSize = variant === "fullscreen" || variant === "sheet" ? undefined : size;

  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        className={cn(
          "fixed inset-0 z-[100] flex pointer-events-none",
          variant === "fullscreen" && "items-stretch justify-stretch p-0",
          variant === "sheet" && "items-end justify-stretch p-0 sm:items-center sm:justify-center sm:p-6",
          variant !== "fullscreen" && variant !== "sheet" && "items-center justify-center p-4 sm:p-6"
        )}
      >
        <DialogPrimitive.Content
          ref={ref}
          className={cn(dialogContentVariants({ variant, size: resolvedSize }), className)}
          {...props}
        >
          {children}
          {!hideCloseButton && (
            <DialogPrimitive.Close
              className={cn(
                "absolute right-4 top-4 rounded-xl p-2",
                "opacity-70 transition-all duration-150",
                "hover:bg-muted hover:opacity-100",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:pointer-events-none",
                "touch-manipulation active:scale-95"
              )}
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Sluiten</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      "pt-4 border-t border-border/30",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      "text-foreground",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogContentVariants,
};
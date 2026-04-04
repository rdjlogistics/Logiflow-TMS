import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={cn("animate-fade-in-up", className)}>
      {children}
    </div>
  );
}

// Fade only transition for modals/dialogs
export function FadeTransition({ children, show }: { children: ReactNode; show: boolean }) {
  if (!show) return null;
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
}

// Slide up transition for bottom sheets
export function SlideUpTransition({ children, show }: { children: ReactNode; show: boolean }) {
  if (!show) return null;
  return (
    <div className="animate-slide-up-fade">
      {children}
    </div>
  );
}

// Scale transition for cards/items
export function ScaleTransition({ 
  children, 
  show,
  delay = 0 
}: { 
  children: ReactNode; 
  show: boolean;
  delay?: number;
}) {
  if (!show) return null;
  return (
    <div
      className="animate-scale-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

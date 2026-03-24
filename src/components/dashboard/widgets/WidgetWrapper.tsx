import React, { memo } from "react";
import { motion } from "framer-motion";
import { GripVertical, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getWidgetDefinition, WidgetSize } from "./WidgetRegistry";

interface WidgetWrapperProps {
  widgetId: string;
  size: WidgetSize;
  mobileSize?: 'compact' | 'full';
  isEditing: boolean;
  onRemove?: () => void;
  onResize?: (newSize: WidgetSize) => void;
  children: React.ReactNode;
  className?: string;
}

const WidgetWrapper = ({
  widgetId,
  size,
  mobileSize = 'full',
  isEditing,
  onRemove,
  onResize,
  children,
  className,
}: WidgetWrapperProps) => {
  const definition = getWidgetDefinition(widgetId);

  const getSizeClass = () => {
    // On mobile, all widgets are full width
    // On desktop, respect the size setting
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'medium':
        return 'col-span-1';
      case 'large':
        return 'col-span-1 lg:col-span-2';
      case 'full':
        return 'col-span-1 lg:col-span-2';
      default:
        return 'col-span-1';
    }
  };

  // iOS-optimized mobile class
  const getMobileClass = () => {
    if (mobileSize === 'compact') {
      return 'sm:min-h-0';
    }
    return '';
  };

  const toggleSize = () => {
    if (!onResize) return;
    const sizes: WidgetSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    onResize(sizes[nextIndex]);
  };

  return (
    <motion.div
      layout
      className={cn(
        "relative group",
        getSizeClass(),
        getMobileClass(),
        isEditing && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background rounded-2xl",
        // iOS Mobile optimization
        "touch-manipulation",
        // Smooth scrolling and transforms
        "transform-gpu will-change-transform",
        className
      )}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Edit Mode Overlay */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full px-2 py-1 shadow-lg"
        >
          {/* Drag Handle */}
          <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded transition-colors">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Widget Name */}
          <span className="text-xs font-medium text-foreground px-2 truncate max-w-[120px]">
            {definition?.name || widgetId}
          </span>
          
          {/* Resize Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted/50"
            onClick={toggleSize}
          >
            {size === 'large' ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          
          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </motion.div>
      )}
      
      {/* Widget Content — glassmorphism wrapper */}
      <div className={cn(
        "h-full transition-all duration-200",
        !isEditing && "widget-glass",
        isEditing && "pointer-events-none opacity-80"
      )}>
        {children}
      </div>
    </motion.div>
  );
};

export default memo(WidgetWrapper);

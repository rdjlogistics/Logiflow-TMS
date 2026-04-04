import React, { memo } from "react";
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
  widgetId, size, mobileSize = 'full', isEditing, onRemove, onResize, children, className,
}: WidgetWrapperProps) => {
  const definition = getWidgetDefinition(widgetId);

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'col-span-1';
      case 'medium': return 'col-span-1';
      case 'large': return 'col-span-1 lg:col-span-2';
      case 'full': return 'col-span-1 lg:col-span-2';
      default: return 'col-span-1';
    }
  };

  const toggleSize = () => {
    if (!onResize) return;
    const sizes: WidgetSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    onResize(sizes[nextIndex]);
  };

  return (
    <div
      className={cn(
        "relative group animate-in fade-in zoom-in-[0.98] duration-300",
        getSizeClass(),
        mobileSize === 'compact' && 'sm:min-h-0',
        isEditing && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background rounded-2xl",
        "touch-manipulation transform-gpu",
        className
      )}
    >
      {isEditing && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border/50 rounded-full px-2 py-1 shadow-lg animate-in fade-in duration-200">
          <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded transition-colors">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium text-foreground px-2 truncate max-w-[120px]">{definition?.name || widgetId}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/50" onClick={toggleSize}>
            {size === 'large' ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <div className={cn(
        "h-full transition-all duration-200",
        !isEditing && "widget-glass",
        isEditing && "pointer-events-none opacity-80"
      )}>
        {children}
      </div>
    </div>
  );
};

export default memo(WidgetWrapper);

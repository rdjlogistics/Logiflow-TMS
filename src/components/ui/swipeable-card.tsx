import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, Archive, MoreHorizontal, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

// ============================================
// Swipeable Card with Actions (Mobile Gestures)
// ============================================

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: "destructive" | "warning" | "success" | "primary" | "muted";
  onAction: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeComplete?: (direction: "left" | "right") => void;
  swipeThreshold?: number;
  className?: string;
  disabled?: boolean;
}

const actionColors = {
  destructive: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
  success: "bg-success text-success-foreground",
  primary: "bg-primary text-primary-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeComplete,
  swipeThreshold = 100,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [thresholdReached, setThresholdReached] = React.useState<'left' | 'right' | null>(null);

  // Calculate action visibility based on swipe distance
  const leftOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);
  const rightOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  
  // Scale effect for actions
  const leftScale = useTransform(x, [0, 100], [0.8, 1]);
  const rightScale = useTransform(x, [-100, 0], [1, 0.8]);

  // Haptic feedback when crossing swipe threshold
  const hasTriggeredLeft = React.useRef(false);
  const hasTriggeredRight = React.useRef(false);

  React.useEffect(() => {
    const unsubscribe = x.on('change', (latest) => {
      if (latest > swipeThreshold && !hasTriggeredLeft.current) {
        hasTriggeredLeft.current = true;
        setThresholdReached('left');
        haptic('selection');
      } else if (latest < swipeThreshold * 0.8) {
        hasTriggeredLeft.current = false;
        if (latest >= -swipeThreshold * 0.8) setThresholdReached(null);
      }
      if (latest < -swipeThreshold && !hasTriggeredRight.current) {
        hasTriggeredRight.current = true;
        setThresholdReached('right');
        haptic('selection');
      } else if (latest > -swipeThreshold * 0.8) {
        hasTriggeredRight.current = false;
        if (latest <= swipeThreshold * 0.8) setThresholdReached(null);
      }
    });
    return unsubscribe;
  }, [x, swipeThreshold]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Check if swipe exceeds threshold
    if (offset > swipeThreshold || velocity > 500) {
      if (leftActions.length > 0) {
        haptic('medium');
        leftActions[0].onAction();
        onSwipeComplete?.("left");
      }
    } else if (offset < -swipeThreshold || velocity < -500) {
      if (rightActions.length > 0) {
        haptic('medium');
        rightActions[0].onAction();
        onSwipeComplete?.("right");
      }
    }

    setIsDragging(false);
  };

  if (disabled || (leftActions.length === 0 && rightActions.length === 0)) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Left actions (swipe right to reveal) */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center"
          style={{ opacity: leftOpacity, scale: leftScale }}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onAction}
              className={cn(
                "flex h-full items-center justify-center px-6",
                "transition-colors touch-manipulation",
                actionColors[action.color]
              )}
              aria-label={action.label}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
              </div>
            </button>
          ))}
        </motion.div>
      )}

      {/* Right actions (swipe left to reveal) */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center"
          style={{ opacity: rightOpacity, scale: rightScale }}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onAction}
              className={cn(
                "flex h-full items-center justify-center px-6",
                "transition-colors touch-manipulation",
                actionColors[action.color]
              )}
              aria-label={action.label}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
              </div>
            </button>
          ))}
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightActions.length > 0 ? -150 : 0, right: leftActions.length > 0 ? 150 : 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={{ scale: thresholdReached ? 0.97 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          "relative bg-card touch-manipulation",
          isDragging && "cursor-grabbing"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============================================
// Pre-configured Swipeable Actions
// ============================================

export const swipeActions = {
  delete: (onDelete: () => void): SwipeAction => ({
    icon: <Trash2 className="h-5 w-5" />,
    label: "Verwijderen",
    color: "destructive",
    onAction: onDelete,
  }),
  archive: (onArchive: () => void): SwipeAction => ({
    icon: <Archive className="h-5 w-5" />,
    label: "Archiveren",
    color: "warning",
    onAction: onArchive,
  }),
  complete: (onComplete: () => void): SwipeAction => ({
    icon: <Check className="h-5 w-5" />,
    label: "Afronden",
    color: "success",
    onAction: onComplete,
  }),
  more: (onMore: () => void): SwipeAction => ({
    icon: <MoreHorizontal className="h-5 w-5" />,
    label: "Meer",
    color: "muted",
    onAction: onMore,
  }),
};

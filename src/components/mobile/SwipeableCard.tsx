import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

interface SwipeAction {
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onAction: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  className?: string;
  threshold?: number;
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className,
  threshold = 100,
}: SwipeableCardProps) {
  const [isActionTriggered, setIsActionTriggered] = useState<'left' | 'right' | null>(null);
  const [thresholdReached, setThresholdReached] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef(null);
  
  const x = useMotionValue(0);
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const leftScale = useTransform(x, [0, threshold], [0.8, 1]);
  const rightScale = useTransform(x, [-threshold, 0], [1, 0.8]);

  const hasTriggeredLeft = useRef(false);
  const hasTriggeredRight = useRef(false);

  useEffect(() => {
    const unsubscribe = x.on('change', (latest) => {
      if (latest > threshold && !hasTriggeredLeft.current) {
        hasTriggeredLeft.current = true;
        setThresholdReached('left');
        haptic('selection');
      } else if (latest < threshold * 0.8) {
        hasTriggeredLeft.current = false;
        if (latest >= -threshold * 0.8) setThresholdReached(null);
      }
      if (latest < -threshold && !hasTriggeredRight.current) {
        hasTriggeredRight.current = true;
        setThresholdReached('right');
        haptic('selection');
      } else if (latest > -threshold * 0.8) {
        hasTriggeredRight.current = false;
        if (latest <= threshold * 0.8) setThresholdReached(null);
      }
    });
    return unsubscribe;
  }, [x, threshold]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x;
    
    if (offset > threshold && leftAction) {
      haptic('medium');
      setIsActionTriggered('left');
      leftAction.onAction();
      setTimeout(() => setIsActionTriggered(null), 300);
    } else if (offset < -threshold && rightAction) {
      haptic('medium');
      setIsActionTriggered('right');
      rightAction.onAction();
      setTimeout(() => setIsActionTriggered(null), 300);
    }
  };

  return (
    <div ref={constraintsRef} className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Left action background */}
      {leftAction && (
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center justify-start pl-4 w-24 transition-colors duration-150",
            leftAction.bgColor,
            thresholdReached === 'left' && "!bg-opacity-60"
          )}
          style={{ opacity: leftOpacity }}
          animate={{ opacity: thresholdReached === 'left' ? 1 : undefined }}
        >
          <motion.div 
            className="flex flex-col items-center gap-1"
            style={{ scale: leftScale }}
          >
            <div className={cn("p-2 rounded-full", leftAction.color)}>
              {leftAction.icon}
            </div>
            <span className="text-xs font-medium text-white">{leftAction.label}</span>
          </motion.div>
        </motion.div>
      )}

      {/* Right action background */}
      {rightAction && (
        <motion.div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-end pr-4 w-24 transition-colors duration-150",
            rightAction.bgColor,
            thresholdReached === 'right' && "!bg-opacity-60"
          )}
          style={{ opacity: rightOpacity }}
          animate={{ opacity: thresholdReached === 'right' ? 1 : undefined }}
        >
          <motion.div 
            className="flex flex-col items-center gap-1"
            style={{ scale: rightScale }}
          >
            <div className={cn("p-2 rounded-full", rightAction.color)}>
              {rightAction.icon}
            </div>
            <span className="text-xs font-medium text-white">{rightAction.label}</span>
          </motion.div>
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightAction ? -threshold * 1.2 : 0, right: leftAction ? threshold * 1.2 : 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileTap={{ cursor: 'grabbing' }}
        className="relative bg-card touch-pan-y"
        animate={isActionTriggered ? { x: 0 } : { scale: thresholdReached ? 0.97 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

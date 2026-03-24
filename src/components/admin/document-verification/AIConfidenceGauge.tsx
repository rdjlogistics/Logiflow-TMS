import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AIConfidenceGaugeProps {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

export function AIConfidenceGauge({ score, size = 80, label, className }: AIConfidenceGaugeProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const springValue = useSpring(0, { stiffness: 60, damping: 15 });
  const strokeDashoffset = useTransform(springValue, [0, 100], [circumference, 0]);
  
  useEffect(() => {
    springValue.set(score);
  }, [score, springValue]);

  const getColor = () => {
    if (score >= 90) return 'hsl(var(--success))';
    if (score >= 70) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getGlowColor = () => {
    if (score >= 90) return 'hsl(152 76% 45% / 0.4)';
    if (score >= 70) return 'hsl(38 92% 50% / 0.4)';
    return 'hsl(0 72% 51% / 0.4)';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="4"
          opacity={0.3}
        />
        {/* Animated ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset, filter: `drop-shadow(0 0 6px ${getGlowColor()})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-sm font-bold text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {score}%
        </motion.span>
        {label && (
          <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">{label}</span>
        )}
      </div>
    </div>
  );
}

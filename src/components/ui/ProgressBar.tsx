/**
 * ProgressBar — Animated progress bar for KPIs and goals.
 * Uses CSS transition (no framer-motion).
 */
import { cn } from '@/lib/utils';

type ProgressColor = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'auto';

interface ProgressBarProps {
  value: number;
  label?: string;
  color?: ProgressColor;
  showPercentage?: boolean;
  height?: number;
  className?: string;
  gradient?: boolean;
}

const COLOR_CLASSES: Record<Exclude<ProgressColor, 'auto'>, string> = {
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  purple:  'bg-purple-500',
  cyan:    'bg-cyan-500',
};

const GRADIENT_CLASSES: Record<Exclude<ProgressColor, 'auto'>, string> = {
  blue:    'bg-gradient-to-r from-blue-600 to-blue-400',
  emerald: 'bg-gradient-to-r from-emerald-600 to-emerald-400',
  amber:   'bg-gradient-to-r from-amber-600 to-amber-400',
  rose:    'bg-gradient-to-r from-rose-600 to-rose-400',
  purple:  'bg-gradient-to-r from-purple-600 to-purple-400',
  cyan:    'bg-gradient-to-r from-cyan-600 to-cyan-400',
};

function resolveColor(value: number): Exclude<ProgressColor, 'auto'> {
  if (value >= 80) return 'emerald';
  if (value >= 50) return 'blue';
  if (value >= 25) return 'amber';
  return 'rose';
}

export function ProgressBar({
  value,
  label,
  color = 'blue',
  showPercentage = false,
  height = 8,
  className,
  gradient = false,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const resolvedColor = color === 'auto' ? resolveColor(clampedValue) : color;
  const fillClass = gradient
    ? GRADIENT_CLASSES[resolvedColor]
    : COLOR_CLASSES[resolvedColor];

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs text-white/60 truncate">{label}</span>
          )}
          {showPercentage && (
            <span className="text-xs font-medium text-white/80 tabular-nums ml-auto">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}

      <div
        className="relative w-full rounded-full bg-white/10 overflow-hidden"
        style={{ height }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out animate-progress-fill',
            fillClass
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

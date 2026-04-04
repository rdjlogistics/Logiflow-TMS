import { useEffect, useRef } from 'react';
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
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = String(circumference - (score / 100) * circumference);
    }
  }, [score, circumference]);

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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="4"
          opacity={0.3}
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${getGlowColor()})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-foreground animate-fade-in">
          {score}%
        </span>
        {label && (
          <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">{label}</span>
        )}
      </div>
    </div>
  );
}

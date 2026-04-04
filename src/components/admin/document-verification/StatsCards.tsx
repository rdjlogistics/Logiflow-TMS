import { cn } from '@/lib/utils';
import { LucideIcon, Clock, CheckCircle, XCircle, FileCheck, AlertTriangle, Calendar } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  glowColor: string;
}

interface StatsCardsProps {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
  expiringSoon: number;
}

export function StatsCards({ pending, verified, rejected, total, expiringSoon }: StatsCardsProps) {
  const stats: StatItem[] = [
    { label: 'In afwachting', value: pending, icon: Clock, color: 'text-warning', glowColor: 'hsl(var(--warning) / 0.15)' },
    { label: 'Goedgekeurd', value: verified, icon: CheckCircle, color: 'text-success', glowColor: 'hsl(var(--success) / 0.15)' },
    { label: 'Afgekeurd', value: rejected, icon: XCircle, color: 'text-destructive', glowColor: 'hsl(var(--destructive) / 0.15)' },
    { label: 'Verloopt binnenkort', value: expiringSoon, icon: AlertTriangle, color: 'text-warning', glowColor: 'hsl(var(--warning) / 0.15)' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, i) => (
        <PerspectiveStatCard key={stat.label} stat={stat} index={i} />
      ))}
    </div>
  );
}

function PerspectiveStatCard({ stat, index }: { stat: StatItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(600px) rotateX(0deg) rotateY(0deg)');
  const Icon = stat.icon;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(600px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTransform('perspective(600px) rotateX(0deg) rotateY(0deg)');
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, animationDelay: `${index * 80}ms` }}
      className="rounded-2xl border border-border/30 bg-card/70 backdrop-blur-xl p-4 md:p-5 transition-[transform,box-shadow] duration-200 ease-out hover:shadow-[var(--shadow-float)] animate-fade-in-up"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: stat.glowColor }}
        >
          <Icon className={cn('h-5 w-5', stat.color)} />
        </div>
        <div className="min-w-0">
          <AnimatedCounter value={stat.value} />
          <p className="text-xs text-muted-foreground truncate mt-0.5">{stat.label}</p>
        </div>
      </div>
    </div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = performance.now();
    const startVal = display;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <p className="text-2xl font-bold text-foreground">{display}</p>;
}

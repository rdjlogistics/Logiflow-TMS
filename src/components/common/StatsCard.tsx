import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  trend?: {
    value: number; // percentage change
    label?: string;
  };
  loading?: boolean;
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  trend,
  loading = false,
  className,
  valueClassName,
  onClick,
}: StatsCardProps) {
  const trendPositive = (trend?.value ?? 0) > 0;
  const trendNeutral = (trend?.value ?? 0) === 0;
  const TrendIcon = trendNeutral ? Minus : trendPositive ? TrendingUp : TrendingDown;
  const trendColor = trendNeutral
    ? 'text-muted-foreground'
    : trendPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>

            {loading ? (
              <Skeleton className="h-8 w-32 mt-2" />
            ) : (
              <p className={cn('text-2xl font-bold mt-1 truncate', valueClassName)}>
                {value}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2">
              {trend !== undefined && !loading && (
                <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {trend.label ?? `${trend.value > 0 ? '+' : ''}${trend.value.toFixed(1)}%`}
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground truncate">{subtitle}</span>
              )}
            </div>
          </div>

          {Icon && (
            <div className={cn('rounded-lg p-2.5 bg-primary/10 shrink-0', iconClassName)}>
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}

export function StatsGrid({ children, cols = 4, className }: StatsGridProps) {
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  }[cols];

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {children}
    </div>
  );
}

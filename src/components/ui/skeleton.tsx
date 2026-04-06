import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

const Skeleton = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('animate-pulse rounded-md bg-muted/50', className)}
      {...props}
    />
  )
);

Skeleton.displayName = 'Skeleton';

// Glassmorphism pulse skeleton
export function GlassSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/40 backdrop-blur-sm',
        className
      )}
    />
  );
}

// Table skeleton — full table with header and rows
export function GlassTableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 p-4 bg-white/5 border-b border-white/10">
        {Array.from({ length: columns }).map((_, i) => (
          <GlassSkeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 p-4 border-b border-white/5 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <GlassSkeleton
              key={colIdx}
              className={cn(
                'h-4',
                colIdx === 0 ? 'w-8' : colIdx === 1 ? 'w-32' : 'w-20'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton — glassmorphism KPI/stat card
export function GlassCardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <GlassSkeleton className="h-4 w-24" />
        <GlassSkeleton className="h-8 w-8 rounded-lg" />
      </div>
      <GlassSkeleton className="h-9 w-28" />
      <GlassSkeleton className="h-3 w-20" />
    </div>
  );
}

// Form skeleton — label + input pairs
export function GlassFormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <GlassSkeleton className="h-4 w-28" />
          <GlassSkeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <GlassSkeleton className="h-10 w-28 rounded-lg" />
        <GlassSkeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}

// List skeleton — stacked items
export function GlassListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <GlassSkeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <GlassSkeleton className="h-4 w-40" />
            <GlassSkeleton className="h-3 w-28" />
          </div>
          <GlassSkeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton };

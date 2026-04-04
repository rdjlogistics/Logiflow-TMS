/**
 * EmptyState Component
 * Reusable empty-state for list pages with icon, title, description and optional action.
 * Glassmorphism styling + CSS entrance animation (no framer-motion).
 */
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-fade-in-up',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl mb-4 animate-fade-in-scale animate-delay-50',
            'bg-white/5 border border-white/10 backdrop-blur-xl',
            compact ? 'w-12 h-12' : 'w-16 h-16'
          )}
        >
          <Icon
            className={cn(
              'text-white/40',
              compact ? 'w-6 h-6' : 'w-8 h-8'
            )}
          />
        </div>
      )}

      <h3
        className={cn(
          'font-semibold text-white/80 mb-1 animate-fade-in animate-delay-100',
          compact ? 'text-sm' : 'text-base'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-white/40 max-w-xs leading-relaxed animate-fade-in animate-delay-150',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      )}

      {action && (
        <div className="mt-4 animate-fade-in-up-sm animate-delay-200">
          {action}
        </div>
      )}
    </div>
  );
}

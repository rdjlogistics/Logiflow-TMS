import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const iconSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  const padding = size === 'sm' ? 'py-8' : size === 'lg' ? 'py-20' : 'py-12';

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', padding, className)}>
      {Icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className={cn(iconSize, 'text-muted-foreground')} />
        </div>
      )}
      <h3 className={cn('font-semibold text-foreground', size === 'sm' ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-muted-foreground mt-1 max-w-sm', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            action.href ? (
              <Button asChild size={size === 'sm' ? 'sm' : 'default'}>
                <Link to={action.href}>
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button onClick={action.onClick} size={size === 'sm' ? 'sm' : 'default'}>
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

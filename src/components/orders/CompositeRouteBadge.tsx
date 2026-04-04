import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Route } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompositeRouteBadgeProps {
  childCount?: number;
  isChild?: boolean;
  parentOrderNumber?: string | null;
  onClick?: () => void;
  className?: string;
}

const CompositeRouteBadge: React.FC<CompositeRouteBadgeProps> = ({
  childCount,
  isChild = false,
  parentOrderNumber,
  onClick,
  className,
}) => {
  if (isChild) {
    return (
      <div
        className={cn("inline-flex items-center gap-1", className)}
      >
        <span className="text-muted-foreground text-xs">↳</span>
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 border-primary/30 bg-primary/5 text-primary cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          Route {parentOrderNumber || ''}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex", className)}
    >
      <Badge
        className="text-[9px] px-1.5 py-0 h-4 bg-gradient-to-r from-primary/80 to-primary text-primary-foreground cursor-pointer backdrop-blur-sm border-0 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-all"
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      >
        <Route className="h-2.5 w-2.5 mr-0.5" />
        Route · {childCount || 0}
      </Badge>
    </div>
  );
};

export default CompositeRouteBadge;

import React, { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCopilotContext } from './CopilotProvider';
import { Sparkles, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopilotTriggerProps {
  variant?: 'default' | 'fab' | 'icon';
  className?: string;
}

export const CopilotTrigger = forwardRef<HTMLButtonElement, CopilotTriggerProps>(({ 
  variant = 'default',
  className 
}, ref) => {
  const { openCommandBar, togglePanel } = useCopilotContext();

  if (variant === 'fab') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            onClick={togglePanel}
            size="icon"
            className={cn(
              "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/30",
              "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              "transition-all duration-300 hover:scale-110 z-50",
              className
            )}
          >
            <Sparkles className="w-6 h-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="flex items-center gap-2">
          <span>Copilot openen</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">⌘K</kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="icon"
            onClick={openCommandBar}
            className={cn("h-9 w-9", className)}
          >
            <Sparkles className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>Copilot</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">⌘K</kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      ref={ref}
      variant="outline"
      onClick={openCommandBar}
      className={cn(
        "gap-2 px-3 h-9 bg-muted/50 border-border/50 hover:bg-muted",
        className
      )}
    >
      <Sparkles className="w-4 h-4 text-primary" />
      <span className="text-sm text-muted-foreground">Copilot</span>
      <div className="flex items-center gap-0.5 ml-2 text-[10px] text-muted-foreground">
        <Command className="w-3 h-3" />
        <span>K</span>
      </div>
    </Button>
  );
});

CopilotTrigger.displayName = 'CopilotTrigger';

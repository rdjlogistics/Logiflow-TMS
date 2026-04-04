import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, X, ExternalLink, Lightbulb, BookOpen, Video, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Field-level help tooltip
interface FieldHelpProps {
  content: string;
  title?: string;
  learnMoreUrl?: string;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function FieldHelp({ content, title, learnMoreUrl, className, side = 'right' }: FieldHelpProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center w-4 h-4 rounded-full",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              className
            )}
            aria-label="Help informatie"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {title && <p className="font-medium mb-1">{title}</p>}
          <p className="text-xs text-muted-foreground">{content}</p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            >
              Meer informatie <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Contextual info card that appears inline
interface InfoCardProps {
  title: string;
  description: string;
  tips?: string[];
  variant?: 'info' | 'tip' | 'warning';
  dismissible?: boolean;
  storageKey?: string;
  className?: string;
}

export function InfoCard({
  title,
  description,
  tips,
  variant = 'info',
  dismissible = true,
  storageKey,
  className,
}: InfoCardProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (storageKey) {
      return localStorage.getItem(`info-card-${storageKey}`) === 'true';
    }
    return false;
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (storageKey) {
      localStorage.setItem(`info-card-${storageKey}`, 'true');
    }
  };

  const variantStyles = {
    info: 'bg-info/10 border-info/30 text-info',
    tip: 'bg-primary/10 border-primary/30 text-primary',
    warning: 'bg-warning/10 border-warning/30 text-warning',
  };

  const icons = {
    info: BookOpen,
    tip: Lightbulb,
    warning: HelpCircle,
  };

  const Icon = icons[variant];

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground text-sm mb-1">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
          {tips && tips.length > 0 && (
            <ul className="mt-2 space-y-1">
              {tips.map((tip, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Feature spotlight - highlights a feature with a pulsing indicator
interface FeatureSpotlightProps {
  children: React.ReactNode;
  title: string;
  description: string;
  isNew?: boolean;
  storageKey: string;
}

export function FeatureSpotlight({
  children,
  title,
  description,
  isNew = false,
  storageKey,
}: FeatureSpotlightProps) {
  const [hasSeen, setHasSeen] = useState(() => {
    return localStorage.getItem(`spotlight-${storageKey}`) === 'true';
  });

  const handleSeen = () => {
    setHasSeen(true);
    localStorage.setItem(`spotlight-${storageKey}`, 'true');
  };

  return (
    <Popover open={!hasSeen} onOpenChange={(open) => !open && handleSeen()}>
      <PopoverTrigger asChild>
        <div className="relative inline-block">
          {children}
          {!hasSeen && isNew && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isNew && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                NIEUW
              </span>
            )}
            <h4 className="font-medium">{title}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <Button size="sm" onClick={handleSeen} className="w-full">
            Begrepen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Floating help button with quick links
interface QuickHelpProps {
  pageKey: string;
  videoUrl?: string;
  docsUrl?: string;
  className?: string;
}

export function QuickHelp({ pageKey, videoUrl, docsUrl, className }: QuickHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const helpResources = {
    dashboard: {
      title: 'Dashboard Hulp',
      tips: [
        'Sleep widgets om ze te herschikken',
        'Klik op een widget om details te zien',
        'Gebruik ⌘K voor snelle navigatie',
      ],
    },
    orders: {
      title: 'Orders Hulp',
      tips: [
        'Filter orders met de zoekbalk',
        'Bulk acties via selectie checkbox',
        'Dubbelklik om te bewerken',
      ],
    },
    planning: {
      title: 'Planning Hulp',
      tips: [
        'Sleep ritten naar chauffeurs',
        'Rechtermuisknop voor meer opties',
        'Gebruik de tijdlijn voor overzicht',
      ],
    },
  };

  const resource = helpResources[pageKey as keyof typeof helpResources] || {
    title: 'Hulp',
    tips: ['Neem contact op voor ondersteuning'],
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Hulp</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">{resource.title}</h4>
          
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Snelle tips:</p>
            <ul className="space-y-1.5">
              {resource.tips.map((tip, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <Lightbulb className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-border space-y-1.5">
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted"
              >
                <Video className="h-4 w-4" />
                Bekijk video tutorial
              </a>
            )}
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted"
              >
                <BookOpen className="h-4 w-4" />
                Lees documentatie
              </a>
            )}
            <button
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted w-full text-left"
              onClick={() => {
                setIsOpen(false);
                navigate('/messenger?channel=support');
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Chat met support
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default FieldHelp;

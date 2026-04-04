import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb, Sparkles, Check, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Tour step definition
export interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
  highlightPadding?: number;
}

// Module tours configuration
export const MODULE_TOURS: Record<string, TourStep[]> = {
  dashboard: [
    {
      id: 'welcome',
      target: '[data-tour="dashboard-header"]',
      title: 'Welkom bij je Dashboard! 👋',
      content: 'Dit is je centrale commandocentrum. Hier zie je alle belangrijke metrics en acties in één overzicht.',
      position: 'bottom',
    },
    {
      id: 'widgets',
      target: '[data-tour="dashboard-widgets"]',
      title: 'Aanpasbare Widgets',
      content: 'Sleep widgets om ze te herschikken. Klik op het tandwiel om widgets toe te voegen of te verwijderen.',
      position: 'top',
    },
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Snelle Acties',
      content: 'Start hier direct met je meest voorkomende taken zoals nieuwe orders aanmaken of routes plannen.',
      position: 'left',
    },
    {
      id: 'command-palette',
      target: '[data-tour="command-palette"]',
      title: 'Command Palette',
      content: 'Druk op ⌘K (of Ctrl+K) om snel te navigeren, zoeken en acties uit te voeren.',
      position: 'bottom',
    },
  ],
  orders: [
    {
      id: 'orders-table',
      target: '[data-tour="orders-table"]',
      title: 'Orders Overzicht',
      content: 'Bekijk al je orders in één tabel. Klik op een order om details te zien of te bewerken.',
      position: 'top',
    },
    {
      id: 'filters',
      target: '[data-tour="orders-filters"]',
      title: 'Slimme Filters',
      content: 'Filter orders op status, datum, klant en meer. Je filters worden onthouden voor je volgende bezoek.',
      position: 'bottom',
    },
    {
      id: 'bulk-actions',
      target: '[data-tour="bulk-actions"]',
      title: 'Bulk Acties',
      content: 'Selecteer meerdere orders en voer acties uit zoals status wijzigen, toewijzen aan chauffeur, of exporteren.',
      position: 'left',
    },
  ],
  planning: [
    {
      id: 'timeline',
      target: '[data-tour="planning-timeline"]',
      title: 'Planning Tijdlijn',
      content: 'Bekijk de dag-, week- of maandplanning van al je chauffeurs en voertuigen.',
      position: 'top',
    },
    {
      id: 'drag-drop',
      target: '[data-tour="unassigned-trips"]',
      title: 'Drag & Drop',
      content: 'Sleep ritten naar chauffeurs om ze toe te wijzen. Het systeem berekent automatisch de optimale route.',
      position: 'right',
    },
    {
      id: 'optimization',
      target: '[data-tour="optimize-button"]',
      title: 'Route Optimalisatie',
      content: 'Klik hier om de AI automatisch de beste routes te laten berekenen op basis van afstand, tijd en voorkeur.',
      position: 'bottom',
    },
  ],
  tracking: [
    {
      id: 'map',
      target: '[data-tour="tracking-map"]',
      title: 'Live Kaart',
      content: 'Volg al je voertuigen real-time op de kaart. Klik op een voertuig voor details.',
      position: 'center',
    },
    {
      id: 'alerts',
      target: '[data-tour="tracking-alerts"]',
      title: 'Alerts & Notificaties',
      content: 'Ontvang direct meldingen bij vertragingen, afwijkingen of klant updates.',
      position: 'left',
    },
  ],
};

// --- Framer Motion Variants ---

const tooltipVariants = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: 'blur(8px)' },
  animate: { 
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  exit: { 
    opacity: 0, y: -12, scale: 0.96, filter: 'blur(4px)',
    transition: { duration: 0.2 }
  }
};

const childVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
  }
};

const spotlightPulse = {
  animate: {
    boxShadow: [
      '0 0 0 2px hsl(var(--primary)), 0 0 20px 4px hsl(var(--primary) / 0.15)',
      '0 0 0 2px hsl(var(--primary)), 0 0 30px 8px hsl(var(--primary) / 0.25)',
      '0 0 0 2px hsl(var(--primary)), 0 0 20px 4px hsl(var(--primary) / 0.15)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
};

interface ModuleOnboardingProps {
  moduleKey: string;
  onComplete?: () => void;
  forceShow?: boolean;
}

export function ModuleOnboarding({ moduleKey, onComplete, forceShow = false }: ModuleOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const touchStartX = useRef<number | null>(null);

  const steps = MODULE_TOURS[moduleKey] || [];
  const currentStepData = steps[currentStep];

  useEffect(() => {
    const storageKey = `tour-${moduleKey}`;
    const hasCompleted = localStorage.getItem(storageKey);
    
    if (forceShow || (!hasCompleted && steps.length > 0)) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [moduleKey, steps.length, forceShow]);

  // ESC key support
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleComplete();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  // Touch swipe support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else if (diff > 0 && currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      }
    }
    touchStartX.current = null;
  }, [currentStep, steps.length]);

  useEffect(() => {
    if (!isVisible || !currentStepData) return;

    const updatePosition = () => {
      const target = document.querySelector(currentStepData.target);
      const tooltipWidth = 340;
      const tooltipHeight = 220;

      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);

        const padding = currentStepData.highlightPadding || 8;
        let top = 0;
        let left = 0;

        switch (currentStepData.position) {
          case 'top':
            top = rect.top - tooltipHeight - padding - 16;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = rect.bottom + padding + 16;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - padding - 16;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + padding + 16;
            break;
          case 'center':
          default:
            top = window.innerHeight / 2 - tooltipHeight / 2;
            left = window.innerWidth / 2 - tooltipWidth / 2;
            break;
        }

        // Viewport boundary clamping
        left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));
        top = Math.max(12, Math.min(top, window.innerHeight - tooltipHeight - 12));

        setTooltipPosition({ top, left });
      } else {
        // Fallback: center of screen when target not found
        setTargetRect(null);
        setTooltipPosition({
          top: window.innerHeight / 2 - tooltipHeight / 2,
          left: window.innerWidth / 2 - tooltipWidth / 2,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep, isVisible, currentStepData]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(`tour-${moduleKey}`, 'true');
    setIsVisible(false);
    onComplete?.();
  }, [moduleKey, onComplete]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  if (!isVisible || !currentStepData) return null;

  const padding = currentStepData.highlightPadding || 8;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Overlay with spotlight */}
      <div
        className="fixed inset-0 z-[100]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtler overlay */}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-md" style={{ WebkitBackdropFilter: 'blur(12px)' }} />
        
        {/* Spotlight cutout */}
        {targetRect && currentStepData.position !== 'center' && (
          <div
            className="absolute rounded-xl"
            style={{
              top: targetRect.top - padding,
              left: targetRect.left - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.7)`,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
        <div
          key={currentStep}
          className="fixed z-[101] w-[340px] max-w-[calc(100vw-24px)] rounded-2xl overflow-hidden touch-manipulation"
          style={{ 
            top: tooltipPosition.top, 
            left: tooltipPosition.left,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Glassmorphism container */}
          <div 
            className="relative bg-card/75 border border-border/30 rounded-2xl overflow-hidden"
            style={{ 
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5), 0 0 40px -10px hsl(var(--primary) / 0.15), inset 0 1px 0 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {/* Shimmer */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                width: '50%',
              }}
            />

            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

            <div className="relative p-5">
              {/* Header */}
              <div
                className="flex items-center justify-between mb-4"
              >
                <div className="flex items-center gap-2.5">
                  <div 
                    className="relative p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10"
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div className="absolute inset-0 rounded-xl bg-primary/10 blur-md -z-10" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
                    Stap {currentStep + 1}/{steps.length}
                  </span>
                </div>

                <button
                  onClick={handleSkip}
                  className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
                  aria-label="Sluiten (ESC)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div
              >
                <h4
                  className="font-semibold text-foreground mb-2 text-[15px] leading-tight"
                >
                  {currentStepData.title}
                </h4>
                <p
                  className="text-sm text-muted-foreground mb-5 leading-relaxed"
                >
                  {currentStepData.content}
                </p>

                {currentStepData.action && (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={currentStepData.action.onClick}
                      className="w-full mb-4 min-h-[48px]"
                    >
                      {currentStepData.action.label}
                    </Button>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrev}
                      disabled={currentStep === 0}
                      className="gap-1 min-h-[48px] text-muted-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Vorige
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="text-muted-foreground min-h-[48px]"
                      >
                        <SkipForward className="h-3.5 w-3.5 mr-1" />
                        Skip
                      </Button>
                    </div>
                    <div>
                      <Button 
                        size="sm" 
                        onClick={handleNext} 
                        className="gap-1.5 min-h-[48px] px-5 bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
                      >
                        {currentStep === steps.length - 1 ? (
                          <>
                            <Check className="h-4 w-4" />
                            Klaar
                          </>
                        ) : (
                          <>
                            Volgende
                            <ChevronRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini progress bar instead of dots */}
              <div
                className="mt-5 pt-4 border-t border-border/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                    {currentStep + 1}/{steps.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}

// Hook to trigger tour manually
export function useTour(moduleKey: string) {
  const [showTour, setShowTour] = useState(false);

  const startTour = useCallback(() => {
    localStorage.removeItem(`tour-${moduleKey}`);
    setShowTour(true);
  }, [moduleKey]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(`tour-${moduleKey}`);
  }, [moduleKey]);

  return {
    showTour,
    startTour,
    resetTour,
    TourComponent: showTour ? (
      <ModuleOnboarding 
        moduleKey={moduleKey} 
        forceShow 
        onComplete={() => setShowTour(false)} 
      />
    ) : null,
  };
}

// Help button to restart tour
interface RestartTourButtonProps {
  moduleKey: string;
  className?: string;
}

export function RestartTourButton({ moduleKey, className }: RestartTourButtonProps) {
  const { startTour, TourComponent } = useTour(moduleKey);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={startTour}
        className={cn("gap-2 text-muted-foreground", className)}
      >
        <Lightbulb className="h-4 w-4" />
        <span className="hidden sm:inline">Rondleiding starten</span>
      </Button>
      {TourComponent}
    </>
  );
}

export default ModuleOnboarding;

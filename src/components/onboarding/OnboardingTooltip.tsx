import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TooltipStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTooltipProps {
  steps: TooltipStep[];
  storageKey: string;
  onComplete?: () => void;
}

export function OnboardingTooltip({ steps, storageKey, onComplete }: OnboardingTooltipProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding-${storageKey}`);
    if (!hasSeenOnboarding && steps.length > 0) {
      setIsVisible(true);
    }
  }, [storageKey, steps.length]);

  useEffect(() => {
    if (!isVisible || !steps[currentStep]) return;

    const targetElement = document.querySelector(steps[currentStep].target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const pos = steps[currentStep].position || 'bottom';

      let top = 0;
      let left = 0;

      switch (pos) {
        case 'top':
          top = rect.top - 120;
          left = rect.left + rect.width / 2 - 150;
          break;
        case 'bottom':
          top = rect.bottom + 12;
          left = rect.left + rect.width / 2 - 150;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 60;
          left = rect.left - 320;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 60;
          left = rect.right + 12;
          break;
      }

      setPosition({ top: Math.max(12, top), left: Math.max(12, left) });

      // Highlight target element
      targetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'relative', 'z-50');
      return () => {
        targetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'relative', 'z-50');
      };
    }
  }, [currentStep, isVisible, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`onboarding-${storageKey}`, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible || !steps[currentStep]) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed z-50 w-[300px] p-4 rounded-xl bg-card border border-border shadow-xl"
          style={{ top: position.top, left: position.left }}
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">
              Tip {currentStep + 1} van {steps.length}
            </span>
          </div>

          {/* Content */}
          <h4 className="font-semibold text-foreground mb-1">{steps[currentStep].title}</h4>
          <p className="text-sm text-muted-foreground mb-4">{steps[currentStep].content}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Vorige
            </Button>
            <Button size="sm" onClick={handleNext} className="gap-1">
              {currentStep === steps.length - 1 ? 'Klaar' : 'Volgende'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// Hook for managing onboarding state
export function useOnboarding(key: string) {
  const [hasCompleted, setHasCompleted] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(`onboarding-${key}`);
    setHasCompleted(!!completed);
  }, [key]);

  const reset = () => {
    localStorage.removeItem(`onboarding-${key}`);
    setHasCompleted(false);
  };

  return { hasCompleted, reset };
}

// Contextual hint component (smaller, inline)
interface ContextualHintProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  dismissable?: boolean;
}

export function ContextualHint({ id, children, className, dismissable = true }: ContextualHintProps) {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(`hint-${id}`);
    setIsDismissed(!!dismissed);
  }, [id]);

  const handleDismiss = () => {
    localStorage.setItem(`hint-${id}`, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm',
        className
      )}
    >
      <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-muted-foreground">{children}</div>
      {dismissable && (
        <button
          onClick={handleDismiss}
          className="p-0.5 rounded hover:bg-muted text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}

export default OnboardingTooltip;

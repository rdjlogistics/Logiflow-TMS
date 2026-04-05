import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface StepConfig {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
}

interface OrderStepperProps {
  steps: StepConfig[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  allowNavigation?: boolean;
  className?: string;
}

const checkVariants = {
  initial: { scale: 0, rotate: -90 },
  animate: { scale: 1, rotate: 0 },
  exit: { scale: 0, rotate: 90 },
};

const OrderStepper = ({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = true,
  className,
}: OrderStepperProps) => {
  const handleStepClick = (index: number) => {
    if (allowNavigation && onStepClick) {
      if (index <= currentStep + 1) {
        onStepClick(index);
      }
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: compact horizontal */}
      <div className="flex items-center justify-between md:hidden">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowNavigation && index <= currentStep + 1;

          return (
            <div 
              key={step.id}
              className={cn(
                "flex flex-col items-center gap-1 flex-1",
                isClickable && "cursor-pointer"
              )}
              onClick={() => handleStepClick(index)}
            >
              <div className="relative flex items-center w-full">
                {/* Left connector */}
                {index > 0 && (
                  <div className="absolute left-0 right-1/2 h-0.5 -translate-y-1/2 top-1/2 bg-border">
                    <motion.div
                      className="h-full bg-primary origin-left"
                      initial={{ scaleX: 0 }}
                    />
                  </div>
                )}
                {/* Right connector */}
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 right-0 h-0.5 -translate-y-1/2 top-1/2 bg-border">
                    <motion.div
                      className="h-full bg-primary origin-left"
                      initial={{ scaleX: 0 }}
                    />
                  </div>
                )}
                {/* Step circle */}
                <motion.div
                  className={cn(
                    "relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary border-primary text-primary-foreground shadow-md",
                    !isCompleted && !isCurrent && "bg-background border-border text-muted-foreground"
                  )}
                >
                  {/* Pulse ring for current */}
                  {isCurrent && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-primary/30"
                    />
                  )}
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.span
                        key="check"
                       
                       
                        exit="exit"
                        className="flex items-center justify-center"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="number"
                        initial={{ scale: 0 }}
                        exit={{ scale: 0 }}
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
              <motion.span
                className={cn(
                  "text-[10px] font-medium text-center leading-tight",
                  isCurrent && "text-primary",
                  !isCurrent && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.shortLabel || step.label}
              </motion.span>
            </div>
          );
        })}
      </div>

      {/* Desktop: full horizontal with labels */}
      <div className="hidden md:flex items-start justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = allowNavigation && index <= currentStep + 1;

          return (
            <div 
              key={step.id}
              className={cn(
                "flex flex-col items-center gap-2 flex-1",
                isClickable && "cursor-pointer group"
              )}
              onClick={() => handleStepClick(index)}
            >
              <div className="relative flex items-center w-full">
                {/* Left connector */}
                {index > 0 && (
                  <div className="absolute left-0 right-1/2 h-0.5 -translate-y-1/2 top-1/2 bg-border">
                    <motion.div
                      className="h-full bg-primary origin-left"
                      initial={{ scaleX: 0 }}
                    />
                  </div>
                )}
                {/* Right connector */}
                {index < steps.length - 1 && (
                  <div className="absolute left-1/2 right-0 h-0.5 -translate-y-1/2 top-1/2 bg-border">
                    <motion.div
                      className="h-full bg-primary origin-left"
                      initial={{ scaleX: 0 }}
                    />
                  </div>
                )}
                {/* Step circle */}
                <motion.div
                  className={cn(
                    "relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30",
                    !isCompleted && !isCurrent && "bg-background border-border text-muted-foreground",
                    isClickable && !isCurrent && "group-hover:border-primary/50 group-hover:scale-105"
                  )}
                >
                  {/* Pulse ring for current */}
                  {isCurrent && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-primary/30"
                    />
                  )}
                  <AnimatePresence mode="wait">
                    {isCompleted ? (
                      <motion.span
                        key="check"
                       
                       
                        exit="exit"
                        className="flex items-center justify-center"
                      >
                        <Check className="h-5 w-5" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="number"
                        initial={{ scale: 0 }}
                        exit={{ scale: 0 }}
                      >
                        {index + 1}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
              <div className="text-center">
                <motion.span
                  className={cn(
                    "text-sm font-medium block",
                    isCurrent && "text-primary",
                    isCompleted && "text-foreground",
                    !isCurrent && !isCompleted && "text-muted-foreground",
                    isClickable && !isCurrent && "group-hover:text-primary/70"
                  )}
                >
                  {step.label}
                </motion.span>
                {step.description && (
                  <span className="text-xs text-muted-foreground hidden lg:block">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStepper;

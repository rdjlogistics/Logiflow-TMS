import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  currentStep: number;
  steps: { label: string; icon?: React.ReactNode }[];
}

export const WizardProgress = ({ currentStep, steps }: WizardProgressProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card/90 via-card/80 to-muted/50 backdrop-blur-xl border border-border/40 p-4 sm:p-6"
    >
      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />
      
      {/* Shimmer effect */}
      <motion.div
        initial={{ x: '-100%' }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none"
      />

      <div className="relative flex items-center justify-between sm:justify-center">
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;
          const isFuture = currentStep < stepNumber;

          return (
            <div key={idx} className="flex items-center flex-1 sm:flex-none last:flex-none">
              {/* Step Circle */}
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <motion.div
                  initial={{ scale: 0.8 }}
                  className="relative"
                >
                  {/* Glow ring for active */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/30"
                    />
                  )}
                  
                  <div
                    className={cn(
                      "relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-500 z-10 touch-manipulation",
                      isCompleted && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30",
                      isActive && "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/40",
                      isFuture && "bg-muted/80 border-2 border-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                      >
                        <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                      </motion.div>
                    ) : (
                      stepNumber
                    )}
                  </div>
                </motion.div>
                
                {/* Label */}
                <motion.span
                  initial={{ opacity: 0, y: 5 }}
                  className={cn(
                    "text-[10px] sm:text-xs font-medium transition-colors text-center",
                    isActive && "text-primary",
                    isCompleted && "text-emerald-600 dark:text-emerald-400",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </motion.span>
              </div>

              {/* Connector Line */}
              {idx < steps.length - 1 && (
                <div className="relative flex-1 h-0.5 mx-2 sm:w-16 sm:mx-4 mb-5 sm:mb-6 sm:flex-none">
                  {/* Background line */}
                  <div className="absolute inset-0 bg-border/60 rounded-full" />
                  
                  {/* Animated fill */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    className={cn(
                      "absolute inset-0 origin-left rounded-full",
                      isCompleted ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-primary to-primary/60"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

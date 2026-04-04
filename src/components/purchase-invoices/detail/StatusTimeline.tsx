import { CheckCircle2, Sparkles, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemVariants } from "./PremiumGlassCard";

interface StatusTimelineProps {
  currentStatus: string;
}

const statusSteps = [
  { key: "concept", label: "Concept" },
  { key: "definitief", label: "Definitief" },
  { key: "verzonden", label: "Verzonden" },
  { key: "ontvangen", label: "Ontvangen" },
  { key: "goedgekeurd", label: "Goedgekeurd" },
  { key: "betaald", label: "Betaald" },
];

export const StatusTimeline = ({ currentStatus }: StatusTimelineProps) => {
  const currentStatusIndex = statusSteps.findIndex(s => s.key === currentStatus);

  return (
    <div
      className="relative w-full"
    >
      {/* Desktop: Centered timeline */}
      <div className="hidden sm:flex items-center justify-center gap-2 py-2">
        {statusSteps.map((status, idx, arr) => {
          const isActive = status.key === currentStatus;
          const isPast = currentStatusIndex > idx;
          
          return (
            <div key={status.key} className="flex items-center gap-2">
              <div 
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-500",
                  isActive && "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/30",
                  isPast && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                  !isActive && !isPast && "bg-muted/50 text-muted-foreground border border-border/50"
                )}
              >
                {/* Glow effect for active */}
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl"
                  />
                )}
                
                <span className="relative z-10 flex items-center gap-2">
                  {isPast && <CheckCircle2 className="h-4 w-4" />}
                  {isActive && (
                    <div
                    >
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}
                  {!isActive && !isPast && <Circle className="h-3.5 w-3.5" />}
                  <span className="capitalize">{status.label}</span>
                </span>
              </div>
              
              {idx < arr.length - 1 && (
                <div 
                  className={cn(
                    "w-12 h-1 rounded-full transition-all duration-500",
                    isPast ? "bg-gradient-to-r from-emerald-500/50 to-emerald-500/30" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Horizontal scroll with premium styling */}
      <div className="sm:hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div 
          className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex-shrink-0 w-2" />
          
          {statusSteps.map((status, idx, arr) => {
            const isActive = status.key === currentStatus;
            const isPast = currentStatusIndex > idx;
            
            return (
              <div key={status.key} className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    isActive && "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
                    isPast && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    !isActive && !isPast && "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isPast && <CheckCircle2 className="h-3 w-3 flex-shrink-0" />}
                  {isActive && <Sparkles className="h-3 w-3 flex-shrink-0" />}
                  <span className="capitalize">{status.label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={cn(
                    "w-6 h-0.5 rounded-full flex-shrink-0",
                    isPast ? "bg-emerald-500/40" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
          
          <div className="flex-shrink-0 w-2" />
        </div>
      </div>
    </div>
  );
};

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Check, ChevronRight, ChevronUp, ChevronDown, PartyPopper,
  Building2, Truck, Users, UserPlus, PackagePlus, CircleCheckBig,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingChecklist, OnboardingStep } from "@/hooks/useOnboardingChecklist";

const STEP_ICONS: Record<string, React.ElementType> = {
  account: CircleCheckBig, company: Building2, vehicle: Truck,
  driver: UserPlus, customer: Users, order: PackagePlus,
};

export default function OnboardingChecklist() {
  const { steps, completedCount, totalCount, allComplete, isMinimized, toggleMinimize, markComplete, show } = useOnboardingChecklist();
  const markedRef = useRef(false);
  const [isCollapsing, setIsCollapsing] = useState(false);

  useEffect(() => {
    if (allComplete && !markedRef.current) {
      markedRef.current = true;
      const timer = setTimeout(() => markComplete(), 5000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, markComplete]);

  if (!show) return null;

  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (allComplete) {
    return (
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <PartyPopper className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Gefeliciteerd! 🎉</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Je hebt alle stappen voltooid. LogiFlow is klaar voor gebruik!</p>
            </div>
            <Button variant="outline" size="sm" onClick={markComplete}>Sluiten</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleToggle = () => {
    if (!isMinimized) {
      setIsCollapsing(true);
      setTimeout(() => { toggleMinimize(); setIsCollapsing(false); }, 200);
    } else {
      toggleMinimize();
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <Card className="border-border/50 bg-gradient-to-br from-card/90 to-muted/30 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Welkom bij LogiFlow!</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Voltooi deze stappen om te beginnen.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleToggle} aria-label={isMinimized ? "Uitklappen" : "Inklappen"}>
              {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-3 mt-4 mb-1">
            <div className="flex-1"><Progress value={progress} className="h-2" /></div>
            <span className="text-xs text-muted-foreground font-medium tabular-nums whitespace-nowrap">{completedCount}/{totalCount} voltooid</span>
          </div>

          {!isMinimized && !isCollapsing && (
            <div className="grid gap-2 sm:grid-cols-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {steps.map((step) => <StepItem key={step.key} step={step} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepItem({ step }: { step: OnboardingStep }) {
  const Icon = STEP_ICONS[step.key] ?? CircleCheckBig;
  const content = (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-xl transition-all duration-200 border",
      step.completed
        ? "bg-primary/5 border-primary/20 opacity-70"
        : "bg-muted/30 border-border/50 hover:border-border hover:shadow-sm cursor-pointer group"
    )}>
      <div className={cn("p-2 rounded-lg shrink-0", step.completed ? "bg-primary/10" : "bg-muted")}>
        {step.completed ? <Check className="h-4 w-4 text-primary" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", step.completed && "line-through text-muted-foreground")}>{step.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{step.description}</p>
      </div>
      {!step.completed && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />}
    </div>
  );

  if (step.completed || step.href === "#") return content;
  return <Link to={step.href}>{content}</Link>;
}

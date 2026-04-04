import React, { memo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, UserPlus, FileX, Clock, AlertTriangle,
  ChevronRight, CheckCircle2, Inbox, Plus, ArrowRight, Sparkles, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QuickDriverAssign from "./QuickDriverAssign";

interface ActionItem {
  id: string;
  orderId?: string;
  orderRef: string;
  issueLabel: string;
  issueType: "driver" | "pod" | "waiting" | "eta" | "hold" | "submission";
  severity: "critical" | "warning" | "info";
  href: string;
  pickupCity?: string;
  deliveryCity?: string;
}

interface ActionQueueProps {
  actions: ActionItem[];
  loading?: boolean;
  onFix?: (action: ActionItem) => void;
}

const getIssueIcon = (type: ActionItem["issueType"]) => {
  switch (type) {
    case "driver": return UserPlus;
    case "pod": return FileX;
    case "waiting": return Clock;
    case "eta": return AlertTriangle;
    case "hold": return AlertTriangle;
    case "submission": return Inbox;
    default: return Zap;
  }
};

const getSeverityConfig = (severity: ActionItem["severity"]) => {
  switch (severity) {
    case "critical":
      return { bg: "bg-destructive/8", border: "border-destructive/25", dot: "bg-destructive", dotGlow: "shadow-destructive/50", text: "text-destructive", hoverBg: "hover:bg-destructive/12", mobileBg: "bg-destructive/10" };
    case "warning":
      return { bg: "bg-warning/8", border: "border-warning/25", dot: "bg-warning", dotGlow: "shadow-warning/50", text: "text-warning", hoverBg: "hover:bg-warning/12", mobileBg: "bg-warning/10" };
    case "info":
      return { bg: "bg-primary/8", border: "border-primary/25", dot: "bg-primary", dotGlow: "shadow-primary/50", text: "text-primary", hoverBg: "hover:bg-primary/12", mobileBg: "bg-primary/10" };
  }
};

const ActionQueue = ({ actions, loading }: ActionQueueProps) => {
  const navigate = useNavigate();
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);

  const criticalCount = actions.filter(a => a.severity === "critical").length;
  const warningCount = actions.filter(a => a.severity === "warning").length;

  const handleActionClick = (action: ActionItem, e: React.MouseEvent) => {
    if (action.issueType === "driver" && action.orderId) {
      e.preventDefault();
      setSelectedAction(action);
      setQuickAssignOpen(true);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4 border-b border-border/30 px-3 sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gold/15">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">Actie Wachtrij</CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Laden...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-muted/10 border border-border/20 animate-in fade-in duration-300" style={{ animationDelay: `${i * 50}ms` >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-muted/30 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                <div className="h-3.5 sm:h-4 bg-muted/30 rounded w-2/3 animate-pulse" />
                <div className="h-2.5 sm:h-3 bg-muted/20 rounded w-1/3 animate-pulse" />
              </div>
              <div className="w-8 h-8 sm:w-20 sm:h-9 bg-muted/30 rounded-lg animate-pulse shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4 border-b border-border/30 px-3 sm:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-success/15 animate-in zoom-in duration-300">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">Actie Wachtrij</CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Geen openstaande taken</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative mb-4 sm:mb-6 animate-in zoom-in duration-300 delay-150">
              <div className="absolute inset-0 bg-success/20 rounded-full blur-xl" />
              <div className="relative p-4 sm:p-6 rounded-full bg-gradient-to-br from-success/20 to-success/5 border border-success/20">
                <CheckCircle2 className="h-8 w-8 sm:h-12 sm:w-12 text-success" />
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2">Alles afgehandeld!</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-[260px] sm:max-w-[280px] mb-4 sm:mb-6">
              Geen openstaande acties. Je operaties draaien perfect.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button variant="premium" size="default" asChild className="w-full sm:w-auto h-11 sm:h-10 active:scale-[0.97] transition-transform">
                <Link to="/orders">
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe order
                </Link>
              </Button>
              <Button variant="outline" size="default" asChild className="w-full sm:w-auto h-11 sm:h-10 active:scale-[0.97] transition-transform">
                <Link to="/orders">
                  Bekijk orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="hidden sm:block absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px] pointer-events-none" />
      
      <CardHeader className="pb-3 sm:pb-4 border-b border-border/30 relative px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gold/15 shrink-0 hover:rotate-[10deg] hover:scale-105 transition-transform">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CardTitle className="text-base sm:text-lg font-bold truncate">Actie Wachtrij</CardTitle>
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold shrink-0" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                <span className="sm:hidden">{actions.length} taken</span>
                <span className="hidden sm:inline">{actions.length} {actions.length === 1 ? "taak vereist" : "taken vereisen"} aandacht</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-[10px] sm:text-xs font-bold tabular-nums px-1.5 sm:px-2 h-5 sm:h-auto">
                <span className="relative flex h-1.5 w-1.5 mr-1 sm:mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                <span className="sm:hidden">{criticalCount}</span>
                <span className="hidden sm:inline">{criticalCount} kritiek</span>
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="text-[10px] sm:text-xs font-bold tabular-nums px-1.5 sm:px-2 h-5 sm:h-auto">
                {warningCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <ScrollArea className="h-[320px] sm:h-[380px]">
          <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2">
            {actions.slice(0, 12).map((action, index) => {
              const Icon = getIssueIcon(action.issueType);
              const config = getSeverityConfig(action.severity);
              const isDriverIssue = action.issueType === "driver" && action.orderId;
              const Wrapper = isDriverIssue ? "div" : Link;
              const wrapperProps = isDriverIssue 
                ? { onClick: (e: React.MouseEvent) => handleActionClick(action, e), className: "block cursor-pointer" }
                : { to: action.href, className: "block" };
              
              return (
                <Wrapper key={action.id} {...wrapperProps as any}>
                  <div
                    className={cn(
                      "relative flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200",
                      "border group",
                      "active:scale-[0.98] touch-manipulation hover:translate-x-1",
                      "animate-in fade-in slide-in-from-left-2 duration-300",
                      config.bg, config.border, config.hoverBg
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className={cn(
                      "p-2 sm:p-2.5 rounded-xl shrink-0 transition-all",
                      "bg-background/60 backdrop-blur-sm border border-border/30",
                      "group-hover:scale-105"
                    )}>
                      <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", config.text)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                        <span className="text-xs sm:text-sm font-bold truncate">{action.orderRef}</span>
                        <span className={cn(
                          "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 shadow-lg",
                          config.dot, config.dotGlow,
                          action.severity === 'critical' && "animate-pulse"
                        )} />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium">
                        {action.issueLabel}
                      </p>
                    </div>
                    
                    <div className="sm:hidden shrink-0">
                      <ChevronRight className={cn("h-4 w-4", config.text)} />
                    </div>
                    <div className="hidden sm:block">
                      <Button 
                        size="sm" 
                        className={cn(
                          "shrink-0 h-9 px-4 text-xs font-bold transition-all hover:scale-105 active:scale-95",
                          isDriverIssue 
                            ? "bg-success/10 hover:bg-success hover:text-success-foreground border-success/30 hover:border-success"
                            : "bg-foreground/5 hover:bg-primary hover:text-primary-foreground border border-border/50 hover:border-primary"
                        )}
                      >
                        {isDriverIssue ? "Toewijzen" : "Oplossen"}
                        <ChevronRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </ScrollArea>
        
        {actions.length > 4 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        )}
      </CardContent>

      <QuickDriverAssign
        open={quickAssignOpen}
        onOpenChange={setQuickAssignOpen}
        tripId={selectedAction?.orderId || null}
        tripInfo={{
          orderNumber: selectedAction?.orderRef,
          pickupCity: selectedAction?.pickupCity,
          deliveryCity: selectedAction?.deliveryCity,
        }}
      />
    </Card>
  );
};

export default memo(ActionQueue);

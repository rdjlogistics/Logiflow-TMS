import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProactiveAlerts, ProactiveAlert, AlertSeverity } from '@/hooks/useProactiveAlerts';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  X,
  RefreshCw,
  CheckCircle2,
  Zap,
  Clock,
  TrendingDown,
  Shield,
  Euro,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getCategoryIcon = (category: ProactiveAlert['category']) => {
  switch (category) {
    case 'delay': return Clock;
    case 'capacity': return Truck;
    case 'compliance': return Shield;
    case 'finance': return Euro;
    case 'safety': return AlertTriangle;
    case 'opportunity': return TrendingDown;
    default: return Bell;
  }
};

const getSeverityConfig = (severity: AlertSeverity) => {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        bg: 'bg-destructive/10',
        border: 'border-destructive/25',
        text: 'text-destructive',
        badge: 'destructive',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        bg: 'bg-warning/10',
        border: 'border-warning/25',
        text: 'text-warning',
        badge: 'warning',
      };
    case 'info':
    default:
      return {
        icon: Info,
        bg: 'bg-primary/10',
        border: 'border-primary/25',
        text: 'text-primary',
        badge: 'secondary',
      };
  }
};

export function ProactiveAlertsWidget() {
  const { 
    activeAlerts, 
    criticalAlerts, 
    warningAlerts,
    isLoading, 
    fetchAlerts, 
    dismissAlert,
    resolveAlert,
    executeAction,
    actionRequiredCount,
  } = useProactiveAlerts();

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      x: 12,
      transition: { duration: 0.15 }
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl bg-warning/15"
            >
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Proactieve Alerts</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Analyseren...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl bg-success/15"
            >
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Proactieve Alerts</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Geen meldingen</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div 
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div 
              className="relative mb-4"
            >
              <div className="absolute inset-0 bg-success/20 rounded-full blur-xl" />
              <div className="relative p-4 rounded-full bg-success/10 border border-success/20">
                <Bell className="h-8 w-8 text-success" />
              </div>
            </div>
            <p className="font-semibold">Alles onder controle</p>
            <p className="text-xs text-muted-foreground mt-1">
              Geen actieve alerts of waarschuwingen
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-warning/5 rounded-full blur-[60px] pointer-events-none" />
      
      <CardHeader className="pb-4 border-b border-border/30 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl bg-warning/15"
              animate={criticalAlerts.length > 0 ? { scale: [1, 1.1, 1] } : {}}
            >
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Proactieve Alerts</CardTitle>
                {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
                  <div className="flex items-center gap-1">
                    {criticalAlerts.length > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                        {criticalAlerts.length}
                      </Badge>
                    )}
                    {warningAlerts.length > 0 && (
                      <Badge variant="warning" className="h-5 px-1.5 text-[10px] font-bold">
                        {warningAlerts.length}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {actionRequiredCount > 0 
                  ? `${actionRequiredCount} actie(s) vereist`
                  : `${activeAlerts.length} actief`
                }
              </p>
            </div>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={() => fetchAlerts()} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <ScrollArea className="h-[240px] sm:h-[280px]">
          <div 
            className="p-3 sm:p-4 space-y-2"
          >
              {activeAlerts.slice(0, 6).map((alert) => {
                const CategoryIcon = getCategoryIcon(alert.category);
                const config = getSeverityConfig(alert.severity);
                
                return (
                  <div
                    key={alert.id}
                    layout
                    className={cn(
                      "relative p-3 sm:p-3.5 rounded-xl border transition-all touch-manipulation",
                      config.bg,
                      config.border,
                      "hover:shadow-sm active:scale-[0.98]"
                    )}
                  >
                    <div
                      className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 sm:h-6 sm:w-6 p-0 opacity-60 sm:opacity-40 hover:opacity-100 touch-manipulation"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <X className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-start gap-2.5 sm:gap-3 pr-8 sm:pr-6">
                      <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", config.bg)}>
                        <CategoryIcon className={cn("h-3.5 sm:h-4 w-3.5 sm:w-4", config.text)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold text-xs sm:text-sm leading-tight", config.text)}>
                          {alert.title}
                        </p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">
                          {alert.description}
                        </p>
                        
                        {alert.actionRequired && alert.suggestedActions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {alert.suggestedActions.slice(0, 2).map((action, i) => (
                              <Button
                                key={i}
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2"
                                onClick={() => executeAction(alert.id, action.action)}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}

                        {!alert.actionRequired && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2 mt-2"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Markeer als opgelost
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

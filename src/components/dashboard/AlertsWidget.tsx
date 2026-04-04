import React, { memo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Clock, MapPin, FileX, Timer, Truck, ArrowRight, Bell,
  CheckCircle2, Shield, Zap, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: 'sla_risk' | 'delay' | 'gps_off' | 'pod_missing' | 'capacity' | 'exception';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  entityRef?: string;
  timestamp: Date;
  href: string;
}

interface AlertsWidgetProps {
  alerts?: Alert[];
  loading?: boolean;
}

const getAlertConfig = (type: Alert['type']) => {
  switch (type) {
    case 'sla_risk': return { icon: Timer, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' };
    case 'delay': return { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' };
    case 'gps_off': return { icon: MapPin, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' };
    case 'pod_missing': return { icon: FileX, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' };
    case 'capacity': return { icon: Truck, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' };
    case 'exception': return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' };
    default: return { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-border/30' };
  }
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Nu';
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}u geleden`;
  return `${Math.floor(diffHours / 24)}d geleden`;
};

const AlertsWidget = ({ alerts = [], loading }: AlertsWidgetProps) => {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-destructive/15"><Bell className="h-5 w-5 text-destructive" /></div>
            <CardTitle className="text-lg font-bold">Alerts & Excepties</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse p-3 rounded-xl bg-muted/10 border border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted/30 rounded w-2/3" />
                  <div className="h-3 bg-muted/20 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/15 animate-in zoom-in duration-300">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <CardTitle className="text-lg font-bold">Alerts & Excepties</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
            <div className="relative mb-4 animate-in zoom-in duration-300 delay-100">
              <div className="absolute inset-0 bg-success/20 rounded-full blur-xl" />
              <div className="relative p-4 rounded-full bg-success/10 border border-success/20">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </div>
            <p className="font-semibold text-success">Geen actieve alerts</p>
            <p className="text-xs text-muted-foreground mt-1">Alle operaties draaien zonder problemen</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      {criticalCount > 0 && (
        <div className="absolute top-0 left-0 w-64 h-64 bg-destructive/10 rounded-full blur-[80px] pointer-events-none animate-pulse" style={{ animationDuration: '2s' }} />
      )}
      
      <CardHeader className="pb-4 border-b border-border/30 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl",
              criticalCount > 0 ? "bg-destructive/15" : "bg-warning/15",
              criticalCount > 0 && "animate-pulse"
            )} style={criticalCount > 0 ? { animationDuration: '1s' } : undefined}>
              <Bell className={cn("h-5 w-5", criticalCount > 0 ? "text-destructive" : "text-warning")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Alerts & Excepties</CardTitle>
                <Zap className="h-4 w-4 text-warning" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {alerts.length} actieve {alerts.length === 1 ? 'melding' : 'meldingen'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs font-bold tabular-nums">
                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                {criticalCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning" className="text-xs font-bold tabular-nums">{warningCount}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        <ScrollArea className="h-[220px] sm:h-[280px]">
          <div className="p-3 sm:p-4 space-y-2">
            {alerts.map((alert, index) => {
              const config = getAlertConfig(alert.type);
              const Icon = config.icon;
              return (
                <div key={alert.id} className="group animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 40}ms` >
                  <Link to={alert.href} className="block touch-manipulation">
                    <div className={cn(
                      "relative p-3 sm:p-3.5 rounded-xl border transition-all",
                      config.bg, config.border,
                      "hover:shadow-md cursor-pointer active:scale-[0.98]"
                    )}>
                      {alert.severity === 'critical' && (
                        <div className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3">
                          <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-destructive" />
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-2.5 sm:gap-3 pr-5 sm:pr-6">
                        <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", config.bg)}>
                          <Icon className={cn("h-3.5 sm:h-4 w-3.5 sm:w-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                            <p className={cn("font-semibold text-xs sm:text-sm", config.color)}>{alert.title}</p>
                          </div>
                          <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">{alert.description}</p>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                            {alert.entityRef && (
                              <Badge variant="outline" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1 sm:px-1.5">{alert.entityRef}</Badge>
                            )}
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground">{formatTimeAgo(alert.timestamp)}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-2 sm:p-3 border-t border-border/30">
          <Button variant="ghost" size="sm" className="w-full text-xs group h-10 touch-manipulation" asChild>
            <Link to="/enterprise/holds">
              Alle meldingen bekijken
              <ArrowRight className="h-3.5 w-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(AlertsWidget);

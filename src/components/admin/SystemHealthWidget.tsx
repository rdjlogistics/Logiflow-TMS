import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { Activity, RefreshCcw, Truck, Clock, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const SystemHealthWidget = () => {
  const { metrics, loading, refresh } = useSystemHealth();

  if (loading && !metrics) {
    return (
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Systeemstatus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = metrics ? [
    { label: "Ritten vandaag", value: metrics.tripsToday, icon: Truck, color: "text-primary" },
    { label: "Onderweg", value: metrics.tripsOnderweg, icon: Clock, color: "text-warning" },
    { label: "Gepland", value: metrics.pendingCount, icon: CheckCircle2, color: "text-success" },
    { label: "Open facturen", value: metrics.openInvoices, icon: FileText, color: "text-muted-foreground" },
  ] : [];

  return (
    <Card className="premium-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Systeemstatus
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {metrics?.lastUpdated && format(metrics.lastUpdated, "HH:mm", { locale: nl })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                <span className="text-[10px] text-muted-foreground uppercase">{stat.label}</span>
              </div>
              <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemHealthWidget;

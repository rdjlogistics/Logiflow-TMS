import { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  Warehouse,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  TrendingUp,
  Timer,
  Layers,
  ChevronRight,
  Sparkles,
  Crown,
  Activity,
  Zap,
  BarChart3,
  ArrowRight,
  CircleDot,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWMSDashboardStats, useWarehouses, useLowStockProducts, useOutboundOrders } from "@/hooks/useWMS";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  WMSGlassCard,
  WMSCardTitle,
  WMSQuickActions,
  WMSCommandPalette,
  WMSActivityFeed,
  WMSWarehouseMap,
} from "@/components/wms";

const container = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.015 },
  },
};

const item = {
  hidden: { opacity: 0.9, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.08, ease: "easeOut" } },
};

// Premium Stat Card Component - Consistent Layout with icon on right
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  pulse = false,
  trend,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "primary" | "emerald" | "amber" | "red" | "violet" | "blue" | "gold";
  pulse?: boolean;
  trend?: { value: number; positive: boolean };
  href?: string;
}) {
  const colorStyles = {
    primary: { bg: "bg-primary/15", text: "text-primary", border: "border-primary/30" },
    emerald: { bg: "bg-emerald-500/15", text: "text-emerald-500", border: "border-emerald-500/30" },
    amber: { bg: "bg-amber-500/15", text: "text-amber-500", border: "border-amber-500/30" },
    red: { bg: "bg-red-500/15", text: "text-red-500", border: "border-red-500/30" },
    violet: { bg: "bg-violet-500/15", text: "text-violet-500", border: "border-violet-500/30" },
    blue: { bg: "bg-blue-500/15", text: "text-blue-500", border: "border-blue-500/30" },
    gold: { bg: "bg-[hsl(var(--accent))]/15", text: "text-[hsl(var(--accent))]", border: "border-[hsl(var(--accent))]/30" },
  };

  const styles = colorStyles[color];

  const content = (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-xl border bg-card/60 backdrop-blur-md p-5",
        "transition-all duration-300 group cursor-pointer",
        styles.border,
        pulse && "ring-2 ring-offset-2 ring-offset-background ring-amber-500/50"
      )}
    >
      {/* Subtle corner glow */}
      <div className={cn("absolute -top-10 -right-10 w-24 h-24 opacity-40 blur-2xl rounded-full", styles.bg)} />
      
      <div className="relative flex items-center justify-between h-full">
        {/* Left side: Text content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          {trend && (
            <span className={cn("text-xs font-medium", trend.positive ? "text-emerald-500" : "text-red-500")}>
              {trend.positive ? "+" : ""}{trend.value}% <span className="text-muted-foreground font-normal">vs vorige maand</span>
            </span>
          )}
          {subtitle && !trend && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        
        {/* Right side: Icon */}
        <div
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ml-3",
            styles.bg, "border", styles.border
          )}
        >
          <Icon className={cn("h-6 w-6", styles.text)} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href} className="block h-full">{content}</Link>;
  }
  return content;
}

// Operations Status Card
function OperationsCard({
  title,
  icon: Icon,
  color,
  stats,
  href,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  stats: { label: string; value: number | string; status?: "success" | "warning" | "pending" }[];
  href: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/30" },
  };

  const statusColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    pending: "bg-blue-500",
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <Link to={href} className="block group">
      <div className={cn(
        "relative overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm p-5",
        style.border,
        "hover:bg-card/80 transition-all duration-300"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", style.bg)}>
              <Icon className={cn("h-5 w-5", style.text)} />
            </div>
            <h3 className="font-semibold">{title}</h3>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {stat.status && <div className={cn("w-2 h-2 rounded-full", statusColors[stat.status])} />}
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function WMSDashboard() {
  const { toast } = useToast();
  const { data: stats, isLoading: statsLoading } = useWMSDashboardStats();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
  const { data: lowStock } = useLowStockProducts();
  const { data: pendingOutbound } = useOutboundOrders("pending");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

  // Empty data - WMS is a future module
  const activities: any[] = [];
  const zones: any[] = [];

  // Calculate percentages for progress
  const warehouseUtilization = 0;
  const pickingEfficiency = 0;

  return (
    <DashboardLayout title="WMS Control Tower">
      {/* Imperial Header */}
      <div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-[hsl(var(--accent))] flex items-center justify-center shadow-[0_0_50px_-10px_hsl(var(--primary)/0.6)]">
              <Warehouse className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center animate-pulse">
                <Crown className="h-3 w-3 text-[hsl(var(--accent-foreground))]" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">WMS Control Tower</h1>
              <Badge className="bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30 hover:bg-[hsl(var(--accent))]/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Elite
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CircleDot className="h-3 w-3 text-emerald-500 animate-pulse" />
              Live warehouse operations • Multi-warehouse FIFO/LIFO
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <WMSCommandPalette />
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 hidden sm:flex"
            onClick={() => {
              toast({
                title: "Live Mode",
                description: "Real-time warehouse monitoring is actief",
              });
            }}
          >
            <Activity className="h-4 w-4" />
            Live Mode
          </Button>
          <Button 
            className="gap-2 bg-gradient-to-r from-primary to-primary/80"
            onClick={() => {
              toast({
                title: "AI Optimalisatie",
                description: "AI analyse van warehouse operaties wordt gestart...",
              });
            }}
          >
            <Zap className="h-4 w-4" />
            AI Optimalisatie
          </Button>
        </div>
      </div>

      {/* Quick Actions - Compact */}
      <div
        className="mb-6"
      >
        <WMSQuickActions />
      </div>

      {/* Main Metrics Grid - 6 Columns, Properly Centered */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
      >
        <div className="col-span-1">
          <MetricCard
            title="Magazijnen"
            value={statsLoading ? "-" : stats?.totalWarehouses || 0}
            subtitle="locaties actief"
            icon={Warehouse}
            color="primary"
            href="/wms/warehouses"
          />
        </div>

        <div className="col-span-1">
          <MetricCard
            title="Producten"
            value={statsLoading ? "-" : (stats?.totalProducts?.toLocaleString("nl-NL") || "0")}
            subtitle="SKU's in systeem"
            icon={Package}
            color="blue"
            href="/wms/products"
          />
        </div>

        <div className="col-span-1">
          <MetricCard
            title="Totale Bezetting"
            value={`${warehouseUtilization}%`}
            subtitle="magazijn capaciteit"
            icon={BarChart3}
            color="violet"
            href="/wms/warehouses"
          />
        </div>

        <div className="col-span-1">
          <MetricCard
            title="Voorraadwaarde"
            value={statsLoading ? "-" : formatCurrency(stats?.totalInventoryValue || 0)}
            subtitle="totaal actief"
            icon={TrendingUp}
            color="gold"
            trend={{ value: 12.5, positive: true }}
          />
        </div>

        <div className="col-span-1">
          <MetricCard
            title="Lage Voorraad"
            value={statsLoading ? "-" : stats?.lowStockProducts || 0}
            subtitle="onder minimum"
            icon={AlertTriangle}
            color="amber"
            pulse={(stats?.lowStockProducts || 0) > 0}
            href="/wms/inventory"
          />
        </div>

        <div className="col-span-1">
          <MetricCard
            title="Pick Efficiëntie"
            value={`${pickingEfficiency}%`}
            subtitle="vandaag"
            icon={Zap}
            color="emerald"
          />
        </div>
      </div>

      {/* Operations Status - 3 Column */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        <div>
          <OperationsCard
            title="Ontvangst"
            icon={ArrowDownToLine}
            color="emerald"
            href="/wms/inbound"
            stats={[
              { label: "Wachtend", value: stats?.pendingInbound || 0, status: "pending" },
              { label: "In Proces", value: 2, status: "warning" },
              { label: "Gereed", value: 15, status: "success" },
            ]}
          />
        </div>

        <div>
          <OperationsCard
            title="Verzending"
            icon={ArrowUpFromLine}
            color="blue"
            href="/wms/outbound"
            stats={[
              { label: "Te Picken", value: stats?.pendingOutbound || 0, status: "pending" },
              { label: "Gepicked", value: 8, status: "warning" },
              { label: "Verzonden", value: 42, status: "success" },
            ]}
          />
        </div>

        <div>
          <OperationsCard
            title="Picking Waves"
            icon={Layers}
            color="violet"
            href="/wms/picking"
            stats={[
              { label: "Actief", value: stats?.pickingInProgress || 0, status: "pending" },
              { label: "Pauze", value: 1, status: "warning" },
              { label: "Voltooid", value: 12, status: "success" },
            ]}
          />
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Warehouse Map & Performance */}
        <div className="lg:col-span-8 space-y-6">
          {/* Warehouse Zone Overview */}
          <WMSGlassCard
            header={
              <WMSCardTitle subtitle="Real-time bezetting per zone">
                Zone Overzicht
              </WMSCardTitle>
            }
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link to="/wms/warehouses">Beheren</Link>
              </Button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Zone Map */}
              <div>
                <WMSWarehouseMap zones={zones} />
              </div>
              
              {/* Zone Breakdown Stats */}
              <div className="space-y-3">
                {[
                  { name: "Zone A - Bulk", usage: 85, color: "bg-primary", items: 1240 },
                  { name: "Zone B - Picking", usage: 62, color: "bg-blue-500", items: 890 },
                  { name: "Zone C - Koel", usage: 91, color: "bg-violet-500", items: 456 },
                  { name: "Zone D - Staging", usage: 45, color: "bg-emerald-500", items: 234 },
                ].map((zone) => (
                  <div key={zone.name} className="p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", zone.color)} />
                        <span className="text-sm font-medium">{zone.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{zone.items} items</span>
                        <span className="text-sm font-bold">{zone.usage}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", zone.color)}
                        style={{ width: `${zone.usage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </WMSGlassCard>

          {/* Pending Orders Table */}
          <WMSGlassCard
            header={
              <WMSCardTitle subtitle="Orders met prioriteit die verwerkt moeten worden">
                Wachtende Verzendingen
              </WMSCardTitle>
            }
            actions={
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                  {pendingOutbound?.length || 0} orders
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/wms/outbound">Alle orders</Link>
                </Button>
              </div>
            }
            noPadding
          >
            {pendingOutbound?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                <p className="font-medium">Alle orders verwerkt</p>
                <p className="text-sm">Geen wachtende verzendingen</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Order</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Klant</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Magazijn</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Deadline</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Prio</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {pendingOutbound?.slice(0, 6).map((order, index) => (
                      <tr 
                        key={order.id} 
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-medium text-primary">{order.order_number}</span>
                        </td>
                        <td className="py-3 px-4 font-medium">{order.customer?.company_name || "-"}</td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {order.warehouse?.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {order.required_date
                              ? formatDistanceToNow(new Date(order.required_date), { addSuffix: true, locale: nl })
                              : "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={order.priority <= 2 ? "destructive" : order.priority <= 3 ? "default" : "secondary"}
                            className="font-mono text-xs"
                          >
                            P{order.priority}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize text-xs">{order.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WMSGlassCard>
        </div>

        {/* Right Column - Activity & Alerts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Warehouses Quick View */}
          <WMSGlassCard
            header={
              <WMSCardTitle subtitle="Actieve locaties">
                Magazijnen
              </WMSCardTitle>
            }
            actions={
              <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
                <Link to="/wms/warehouses">
                  Bekijk alle
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            }
          >
            {warehousesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : warehouses?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Warehouse className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Geen magazijnen</p>
                <Button variant="link" size="sm" asChild>
                  <Link to="/wms/warehouses">Voeg toe</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {warehouses?.slice(0, 4).map((wh, i) => (
                  <div
                    key={wh.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      wh.is_active ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Warehouse className={cn("h-4 w-4", wh.is_active ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{wh.name}</p>
                      <p className="text-xs text-muted-foreground">{wh.city || wh.code}</p>
                    </div>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      wh.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                    )} />
                  </div>
                ))}
              </div>
            )}
          </WMSGlassCard>

          {/* Low Stock Alerts */}
          <WMSGlassCard
            header={
              <WMSCardTitle subtitle="Producten onder minimum">
                Voorraad Alerts
              </WMSCardTitle>
            }
            actions={
              lowStock && lowStock.length > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                  {lowStock.length} alerts
                </Badge>
              )
            }
          >
            {lowStock?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-50" />
                <p className="text-sm font-medium">Alle voorraadniveaus OK</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock?.slice(0, 5).map((inv, i) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{inv.product?.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">SKU: {inv.product?.sku}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-amber-600">{inv.available_quantity}</p>
                      <p className="text-[10px] text-muted-foreground">min: {inv.product?.min_stock_level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WMSGlassCard>

          {/* Activity Feed */}
          <WMSGlassCard
            header={
              <WMSCardTitle subtitle="Live warehouse updates">
                Activiteit
              </WMSCardTitle>
            }
          >
            <ScrollArea className="h-[280px] pr-2">
              <WMSActivityFeed activities={activities} />
            </ScrollArea>
          </WMSGlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

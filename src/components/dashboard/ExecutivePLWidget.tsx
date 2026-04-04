import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Wallet,
  Receipt,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface PLMetrics {
  revenue: number;
  costs: number;
  grossProfit: number;
  margin: number;
  revenueChange: number;
  marginChange: number;
  avgOrderValue: number;
  totalOrders: number;
  pendingInvoices: number;
  cashPosition: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyCompact = (value: number) => {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}K`;
  }
  return formatCurrency(value);
};

const ExecutivePLWidget = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["executive-pl-metrics"],
    queryFn: async (): Promise<PLMetrics> => {
      const now = new Date();
      const currentMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const currentMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      // Fetch current month trips - use price only (costs estimated as 70% of revenue)
      const { data: currentTrips } = await supabase
        .from("trips")
        .select("price, distance_km")
        .gte("trip_date", currentMonthStart)
        .lte("trip_date", currentMonthEnd);

      // Fetch last month trips for comparison
      const { data: lastMonthTrips } = await supabase
        .from("trips")
        .select("price, distance_km")
        .gte("trip_date", lastMonthStart)
        .lte("trip_date", lastMonthEnd);

      // Fetch pending invoices
      const { count: pendingCount } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("status", "verzonden");

      // Calculate current month metrics (estimate costs as 70% of revenue)
      const revenue = currentTrips?.reduce((sum, t) => sum + ((t as any).price || 0), 0) || 0;
      const costs = revenue * 0.7; // Estimated cost ratio
      const grossProfit = revenue - costs;
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const totalOrders = currentTrips?.length || 0;
      const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

      // Calculate last month metrics for comparison
      const lastRevenue = lastMonthTrips?.reduce((sum, t) => sum + ((t as any).price || 0), 0) || 0;
      const lastCosts = lastRevenue * 0.7;
      const lastMargin = lastRevenue > 0 ? ((lastRevenue - lastCosts) / lastRevenue) * 100 : 0;

      // Calculate changes
      const revenueChange = lastRevenue > 0 ? ((revenue - lastRevenue) / lastRevenue) * 100 : 0;
      const marginChange = margin - lastMargin;

      return {
        revenue,
        costs,
        grossProfit,
        margin,
        revenueChange,
        marginChange,
        avgOrderValue,
        totalOrders,
        pendingInvoices: pendingCount || 0,
        cashPosition: grossProfit * 0.6, // Simplified cash estimate
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.02 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-gradient-to-br from-card via-card to-card/80">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-16 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const data = metrics || {
    revenue: 0,
    costs: 0,
    grossProfit: 0,
    margin: 0,
    revenueChange: 0,
    marginChange: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    pendingInvoices: 0,
    cashPosition: 0,
  };

  const marginStatus = data.margin >= 25 ? "excellent" : data.margin >= 18 ? "good" : data.margin >= 12 ? "warning" : "critical";

  const marginColors = {
    excellent: "text-success bg-success/10 border-success/20",
    good: "text-primary bg-primary/10 border-primary/20",
    warning: "text-warning bg-warning/10 border-warning/20",
    critical: "text-destructive bg-destructive/10 border-destructive/20",
  };

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card via-card to-card/80">
      {/* Subtle background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Euro className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Executive P&L</CardTitle>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "MMMM yyyy")}
              </p>
            </div>
          </div>
          <Badge variant="premium" className="text-[9px] font-semibold uppercase tracking-wider">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            Live
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className="grid grid-cols-2 gap-3"
        >
          {/* Revenue */}
          <div
            className="relative p-3 rounded-xl border border-border/40 bg-gradient-to-br from-background to-muted/20"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Omzet
              </span>
              {data.revenueChange !== 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] h-4 px-1.5",
                    data.revenueChange > 0 ? "text-success border-success/30" : "text-destructive border-destructive/30"
                  )}
                >
                  {data.revenueChange > 0 ? (
                    <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                  )}
                  {Math.abs(data.revenueChange).toFixed(0)}%
                </Badge>
              )}
            </div>
            <p className="text-xl font-bold tabular-nums text-foreground">
              {formatCurrencyCompact(data.revenue)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {data.totalOrders} orders
            </p>
          </div>

          {/* Gross Profit */}
          <div
            className="relative p-3 rounded-xl border border-border/40 bg-gradient-to-br from-background to-muted/20"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bruto Winst
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            </div>
            <p className={cn("text-xl font-bold tabular-nums", data.grossProfit >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrencyCompact(data.grossProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Kosten: {formatCurrencyCompact(data.costs)}
            </p>
          </div>

          {/* Margin */}
          <div
            className={cn(
              "relative p-3 rounded-xl border",
              marginColors[marginStatus]
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                Marge
              </span>
              {data.marginChange !== 0 && (
                <span className={cn("text-[10px] font-medium flex items-center", data.marginChange > 0 ? "text-success" : "text-destructive")}>
                  {data.marginChange > 0 ? "+" : ""}
                  {data.marginChange.toFixed(1)}pp
                </span>
              )}
            </div>
            <p className="text-xl font-bold tabular-nums">
              {data.margin.toFixed(1)}%
            </p>
            <Progress 
              value={Math.min(data.margin, 40)} 
              className="h-1.5 mt-2 bg-background/50" 
            />
          </div>

          {/* Avg Order Value */}
          <div
            className="relative p-3 rounded-xl border border-border/40 bg-gradient-to-br from-background to-muted/20"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gem. Order
              </span>
              <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold tabular-nums">
              {formatCurrency(data.avgOrderValue)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Per zending
            </p>
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div
          className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-muted/20"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-warning/10">
                <Wallet className="h-3.5 w-3.5 text-warning" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Open facturen</p>
                <p className="text-sm font-bold tabular-nums">{data.pendingInvoices}</p>
              </div>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-success/10">
                <Target className="h-3.5 w-3.5 text-success" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Cash positie</p>
                <p className="text-sm font-bold tabular-nums text-success">
                  {formatCurrencyCompact(data.cashPosition)}
                </p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 px-2 group">
            <Link to="/finance/cashflow">
              <span className="text-xs">Details</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(ExecutivePLWidget);

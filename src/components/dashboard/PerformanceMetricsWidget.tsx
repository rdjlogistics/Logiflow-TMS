import React, { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Truck,
  Target,
  Gauge,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceData {
  otifRate: number;
  otifTrend: number;
  utilizationRate: number;
  utilizationTrend: number;
  onTimePickup: number;
  onTimeDelivery: number;
  avgDeliveryTime: number;
  avgDeliveryTrend: number;
  totalDeliveries: number;
  successRate: number;
}

interface PerformanceMetricsWidgetProps {
  data?: PerformanceData;
  loading?: boolean;
}

const PerformanceMetricsWidget = ({ 
  data, 
  loading 
}: PerformanceMetricsWidgetProps) => {
  const getTrendIcon = (trend: number) => {
    if (trend > 0) return ArrowUpRight;
    if (trend < 0) return ArrowDownRight;
    return Minus;
  };

  const getTrendColor = (trend: number, inverted = false) => {
    const isPositive = inverted ? trend < 0 : trend > 0;
    if (isPositive) return "text-success";
    if (trend === 0) return "text-muted-foreground";
    return "text-destructive";
  };

  const getProgressColor = (value: number, thresholds = { good: 90, warn: 75 }) => {
    if (value >= thresholds.good) return "bg-success";
    if (value >= thresholds.warn) return "bg-warning";
    return "bg-destructive";
  };

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    }
  };

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold">Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-24 bg-muted/30 rounded mb-2" />
              <div className="h-8 w-full bg-muted/20 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold">Performance KPIs</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-2xl bg-muted/20 mb-3">
              <Gauge className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nog geen data</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Performance data verschijnt zodra er ritten zijn</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-success/5 rounded-full blur-[60px] pointer-events-none" />
      
      <CardHeader className="pb-4 border-b border-border/30 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl bg-success/15"
            >
              <Gauge className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Performance KPIs</CardTitle>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  Live
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Operationele prestaties
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 relative">
        <div 
          className="space-y-3 sm:space-y-5"
        >
          {/* OTIF Rate - Hero Metric */}
          <div>
            <Link to="/enterprise/recommendations" className="block group touch-manipulation">
              <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-success/10 via-success/5 to-transparent border border-success/20 hover:border-success/40 transition-all active:scale-[0.98]">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Target className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-success" />
                    <span className="text-xs sm:text-sm font-semibold text-success">OTIF Score</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {React.createElement(getTrendIcon(data.otifTrend), {
                      className: cn("h-3 sm:h-3.5 w-3 sm:w-3.5", getTrendColor(data.otifTrend))
                    })}
                    <span className={cn("text-[10px] sm:text-xs font-bold", getTrendColor(data.otifTrend))}>
                      {data.otifTrend > 0 ? "+" : ""}{data.otifTrend}%
                    </span>
                  </div>
                </div>
                <div className="flex items-end gap-2 sm:gap-3">
                  <span 
                    className="text-3xl sm:text-4xl font-bold text-success tabular-nums"
                  >
                    {data.otifRate}%
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">On Time In Full</span>
                </div>
                <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-success to-success/70"
                  />
                </div>
              </div>
            </Link>
          </div>

          {/* Utilization & Delivery Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Utilization Rate */}
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Truck className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bezetting</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{data.utilizationRate}%</span>
                <div className="flex items-center gap-0.5">
                  {React.createElement(getTrendIcon(data.utilizationTrend), {
                    className: cn("h-2.5 sm:h-3 w-2.5 sm:w-3", getTrendColor(data.utilizationTrend))
                  })}
                  <span className={cn("text-[9px] sm:text-[10px] font-bold", getTrendColor(data.utilizationTrend))}>
                    {data.utilizationTrend > 0 ? "+" : ""}{data.utilizationTrend}%
                  </span>
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div 
                  className={cn("h-full rounded-full", getProgressColor(data.utilizationRate, { good: 80, warn: 60 }))}
                />
              </div>
            </div>

            {/* Average Delivery Time */}
            <div className="p-2.5 sm:p-3.5 rounded-xl bg-gradient-to-br from-accent/10 to-transparent border border-accent/20">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-accent-foreground" />
                <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Gem. Tijd</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl sm:text-2xl font-bold tabular-nums">{data.avgDeliveryTime}u</span>
                <div className="flex items-center gap-0.5">
                  {React.createElement(getTrendIcon(data.avgDeliveryTrend), {
                    className: cn("h-2.5 sm:h-3 w-2.5 sm:w-3", getTrendColor(data.avgDeliveryTrend, true))
                  })}
                  <span className={cn("text-[9px] sm:text-[10px] font-bold", getTrendColor(data.avgDeliveryTrend, true))}>
                    {data.avgDeliveryTrend > 0 ? "+" : ""}{data.avgDeliveryTrend}u
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* On-Time Metrics */}
          <div className="space-y-2 sm:space-y-3">
            {/* On-Time Pickup */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/10 border border-border/30">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="p-1 sm:p-1.5 rounded-lg bg-success/15">
                  <CheckCircle2 className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-success" />
                </div>
                <span className="text-xs sm:text-sm font-medium">On-Time Pickup</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-16 sm:w-24 h-1 sm:h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-success"
                  />
                </div>
                <span className="text-xs sm:text-sm font-bold text-success tabular-nums w-10 sm:w-12 text-right">
                  {data.onTimePickup}%
                </span>
              </div>
            </div>

            {/* On-Time Delivery */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-muted/10 border border-border/30">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="p-1 sm:p-1.5 rounded-lg bg-primary/15">
                  <TrendingUp className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
                </div>
                <span className="text-xs sm:text-sm font-medium">On-Time Delivery</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-16 sm:w-24 h-1 sm:h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-primary"
                  />
                </div>
                <span className="text-xs sm:text-sm font-bold text-primary tabular-nums w-10 sm:w-12 text-right">
                  {data.onTimeDelivery}%
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div
            className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/30"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
              <span className="text-muted-foreground hidden sm:inline">Totaal leveringen:</span>
              <span className="text-muted-foreground sm:hidden">Totaal:</span>
              <span className="font-bold tabular-nums">{data.totalDeliveries.toLocaleString('nl-NL')}</span>
            </div>
            <Badge 
              variant={data.successRate >= 95 ? "success" : data.successRate >= 85 ? "warning" : "destructive"}
              className="text-[9px] sm:text-[10px] font-bold"
            >
              {data.successRate}% success
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(PerformanceMetricsWidget);

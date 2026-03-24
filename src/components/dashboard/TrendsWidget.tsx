import React, { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Euro,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendData {
  period: string;
  revenue: number;
  costs: number;
  margin: number;
  trips: number;
}

interface TrendsWidgetProps {
  data?: TrendData[];
  loading?: boolean;
}

const TrendsWidget = ({ data, loading }: TrendsWidgetProps) => {
  const safeData = data || [];
  const totalRevenue = useMemo(() => safeData.reduce((sum, d) => sum + d.revenue, 0), [safeData]);
  const totalProfit = useMemo(() => safeData.reduce((sum, d) => sum + (d.revenue - d.costs), 0), [safeData]);
  const avgMargin = useMemo(() => {
    const totalMargin = safeData.reduce((sum, d) => sum + d.margin, 0);
    return safeData.length > 0 ? totalMargin / safeData.length : 0;
  }, [safeData]);
  
  const revenueTrend = useMemo(() => {
    if (safeData.length < 2) return 0;
    const lastTwo = safeData.slice(-2);
    return ((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100;
  }, [safeData]);

  const marginTrend = useMemo(() => {
    if (safeData.length < 2) return 0;
    const lastTwo = safeData.slice(-2);
    return lastTwo[1].margin - lastTwo[0].margin;
  }, [safeData]);
  const totalProfit = useMemo(() => data.reduce((sum, d) => sum + (d.revenue - d.costs), 0), [data]);
  const avgMargin = useMemo(() => {
    const totalMargin = data.reduce((sum, d) => sum + d.margin, 0);
    return data.length > 0 ? totalMargin / data.length : 0;
  }, [data]);
  
  const revenueTrend = useMemo(() => {
    if (data.length < 2) return 0;
    const lastTwo = data.slice(-2);
    return ((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100;
  }, [data]);

  const marginTrend = useMemo(() => {
    if (data.length < 2) return 0;
    const lastTwo = data.slice(-2);
    return lastTwo[1].margin - lastTwo[0].margin;
  }, [data]);

  if (loading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-success/15">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <CardTitle className="text-lg font-bold">Omzet & Marge</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded-lg w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-success/5 rounded-full blur-[60px] pointer-events-none" />
      
      <CardHeader className="pb-4 border-b border-border/30 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2.5 rounded-xl bg-success/15"
              whileHover={{ rotate: 10, scale: 1.05 }}
            >
              <TrendingUp className="h-5 w-5 text-success" />
            </motion.div>
            <div>
              <CardTitle className="text-lg font-bold">Omzet & Marge Trends</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Laatste 6 maanden
              </p>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/30 border border-border/30">
              {revenueTrend >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={cn(
                "text-xs font-bold",
                revenueTrend >= 0 ? "text-success" : "text-destructive"
              )}>
                {revenueTrend > 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 relative">
        {/* Summary cards */}
        <motion.div 
          className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-success/10 to-transparent border border-success/20">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <Euro className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-success" />
              <span className="text-[8px] sm:text-[10px] font-semibold text-muted-foreground uppercase">Omzet</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-success tabular-nums">
              €{(totalRevenue / 1000).toFixed(0)}k
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <TrendingUp className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
              <span className="text-[8px] sm:text-[10px] font-semibold text-muted-foreground uppercase">Winst</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-primary tabular-nums">
              €{(totalProfit / 1000).toFixed(0)}k
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-gold/10 to-transparent border border-gold/20">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <Percent className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-gold" />
              <span className="text-[8px] sm:text-[10px] font-semibold text-muted-foreground uppercase">Marge</span>
            </div>
            <div className="flex items-center gap-1">
              <p className="text-base sm:text-lg font-bold text-gold tabular-nums">
                {avgMargin.toFixed(1)}%
              </p>
              {marginTrend !== 0 && (
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-bold",
                  marginTrend > 0 ? "text-success" : "text-destructive"
                )}>
                  {marginTrend > 0 ? '+' : ''}{marginTrend.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Chart */}
        <Tabs defaultValue="revenue" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4 h-8 sm:h-9">
            <TabsTrigger value="revenue" className="text-[10px] sm:text-xs touch-manipulation">Omzet vs Kosten</TabsTrigger>
            <TabsTrigger value="margin" className="text-[10px] sm:text-xs touch-manipulation">Marge Trend</TabsTrigger>
          </TabsList>
          
          <TabsContent value="revenue" className="mt-0">
            <div className="h-[180px] sm:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenueTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCostsTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                  <XAxis 
                    dataKey="period" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                      backdropFilter: "blur(8px)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number, name: string) => [
                      `€${value.toLocaleString("nl-NL")}`,
                      name === "revenue" ? "Omzet" : "Kosten",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--success))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenueTrend)"
                  />
                  <Area
                    type="monotone"
                    dataKey="costs"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCostsTrend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="margin" className="mt-0">
            <div className="h-[180px] sm:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(45 93% 47%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(45 93% 47%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                  <XAxis 
                    dataKey="period" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 50]}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                      backdropFilter: "blur(8px)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number, name: string) => [
                      name === "margin" ? `${value}%` : value,
                      name === "margin" ? "Marge" : "Ritten",
                    ]}
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="trips" 
                    fill="hsl(var(--primary))" 
                    opacity={0.3}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={35}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="margin"
                    stroke="hsl(45 93% 47%)"
                    strokeWidth={3}
                    dot={{ fill: "hsl(45 93% 47%)", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(45 93% 47%)" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-success shadow-lg shadow-success/30" />
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Omzet</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-destructive shadow-lg shadow-destructive/30" />
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Kosten</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-gold shadow-lg shadow-gold/30" />
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Marge</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(TrendsWidget);

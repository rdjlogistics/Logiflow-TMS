import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface RevenueData {
  month: string;
  revenue: number;
  costs: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
}

const RevenueChart = ({ data, loading }: RevenueChartProps) => {
  const formattedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      profit: item.revenue - item.costs,
    }));
  }, [data]);

  const totalRevenue = useMemo(() => {
    return data.reduce((sum, item) => sum + item.revenue, 0);
  }, [data]);

  const totalProfit = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.revenue - item.costs), 0);
  }, [data]);

  if (loading) {
    return (
      <Card className="premium-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-success to-success/70">
              <TrendingUp className="h-4 w-4 text-success-foreground" />
            </div>
            <CardTitle className="text-lg">Omzet Overzicht</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded-lg w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-accent/5 opacity-50" />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-success to-success/70 shadow-lg shadow-success/20">
              <TrendingUp className="h-5 w-5 text-success-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Omzet Overzicht</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Laatste 6 maanden performance</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-4 py-2 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/30">
              <p className="text-2xl font-bold tracking-tight">
                €{totalRevenue.toLocaleString("nl-NL", { minimumFractionDigits: 0 })}
              </p>
              <p className={`text-xs font-medium ${totalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                {totalProfit >= 0 ? "+" : ""}€{totalProfit.toLocaleString("nl-NL", { minimumFractionDigits: 0 })} winst
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }}
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
                  `€${value.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`,
                  name === "revenue" ? "Omzet" : "Kosten",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--success))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="costs"
                stroke="hsl(var(--destructive))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCosts)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-8 mt-5 text-sm">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-success/10 border border-success/20">
            <div className="w-3 h-3 rounded-full bg-success shadow-lg shadow-success/50" />
            <span className="text-muted-foreground font-medium">Omzet</span>
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20">
            <div className="w-3 h-3 rounded-full bg-destructive shadow-lg shadow-destructive/50" />
            <span className="text-muted-foreground font-medium">Kosten</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;

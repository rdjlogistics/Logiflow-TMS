import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Route } from "lucide-react";

interface TripStatusData { status: string; count: number; label: string }
interface WeeklyTripsData { week: string; trips: number }

interface TripStatsChartProps {
  statusData: TripStatusData[];
  weeklyData: WeeklyTripsData[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  aanvraag: "hsl(var(--muted-foreground))",
  offerte: "hsl(var(--accent-foreground))",
  gepland: "hsl(var(--primary))",
  geladen: "hsl(210, 70%, 55%)",
  onderweg: "hsl(var(--warning))",
  afgeleverd: "hsl(160, 60%, 45%)",
  afgerond: "hsl(var(--success))",
  gecontroleerd: "hsl(190, 60%, 45%)",
  gefactureerd: "hsl(270, 50%, 55%)",
  geannuleerd: "hsl(var(--destructive))",
};

const TripStatsChart = ({ statusData, weeklyData, loading }: TripStatsChartProps) => {
  const totalTrips = useMemo(() => statusData.reduce((sum, item) => sum + item.count, 0), [statusData]);

  const completedTrips = useMemo(() => {
    return statusData
      .filter((item) => ['afgerond', 'afgeleverd', 'gecontroleerd', 'gefactureerd'].includes(item.status))
      .reduce((sum, item) => sum + item.count, 0);
  }, [statusData]);

  const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;

  if (loading) {
    return (
      <Card className="premium-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <Route className="h-4 w-4 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg">Rit Statistieken</CardTitle>
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
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
              <Route className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Rit Statistieken</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Verdeling & weekoverzicht</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-4 py-2 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/30">
              <p className="text-2xl font-bold tracking-tight">{totalTrips}</p>
              <p className="text-xs text-muted-foreground font-medium">totaal ritten</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie chart */}
          <div className="relative flex flex-col items-center">
            <div className="relative h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status] || "hsl(var(--muted))"}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                      backdropFilter: "blur(8px)",
                    }}
                    formatter={(value: number, _name: string, props: any) => [
                      value,
                      props.payload.label,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-[80px] h-[80px] flex flex-col items-center justify-center rounded-full bg-background/90 backdrop-blur-sm border border-border/30 shadow-lg">
                  <p className="text-xl font-bold leading-none">{completionRate}%</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">voltooid</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {statusData.map((item) => (
                <div key={item.status} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/30 text-[11px]">
                  <div
                    className="w-2 h-2 rounded-full shadow-sm"
                    style={{ backgroundColor: STATUS_COLORS[item.status], boxShadow: `0 1px 4px ${STATUS_COLORS[item.status]}40` }}
                  />
                  <span className="text-muted-foreground font-medium">{item.label}</span>
                  <span className="text-foreground font-semibold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                  }}
                  formatter={(value: number) => [value, "Ritten"]}
                  labelFormatter={(label) => `Week ${label}`}
                />
                <Bar dataKey="trips" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripStatsChart;

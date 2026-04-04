import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Clock,
  Truck,
  Users,
  Euro,
  Download,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

// KPI data — will be replaced with real calculations when data is available
const kpiSummary: { name: string; value: number; target: number; unit: string; trend: string; change: number; status: string }[] = [
  {
    name: "OTIF Score",
    value: 94.2,
    target: 95,
    unit: "%",
    trend: "up",
    change: 2.1,
    status: "warning"
  },
  {
    name: "Gemiddelde Levertijd",
    value: 2.4,
    target: 3,
    unit: "dagen",
    trend: "down",
    change: -0.3,
    status: "success"
  },
  {
    name: "Voertuig Bezetting",
    value: 82,
    target: 85,
    unit: "%",
    trend: "up",
    change: 5,
    status: "warning"
  },
  {
    name: "Klanttevredenheid",
    value: 4.6,
    target: 4.5,
    unit: "/5",
    trend: "up",
    change: 0.2,
    status: "success"
  }
];

const weeklyPerformance = [
  { week: "W1", otif: 92, delivery: 2.8, utilization: 78, satisfaction: 4.4 },
  { week: "W2", otif: 93, delivery: 2.6, utilization: 80, satisfaction: 4.5 },
  { week: "W3", otif: 91, delivery: 2.7, utilization: 79, satisfaction: 4.3 },
  { week: "W4", otif: 94, delivery: 2.4, utilization: 82, satisfaction: 4.6 },
  { week: "W5", otif: 95, delivery: 2.3, utilization: 84, satisfaction: 4.7 },
  { week: "W6", otif: 94, delivery: 2.4, utilization: 82, satisfaction: 4.6 },
];

const radarData = [
  { subject: "OTIF", A: 94, fullMark: 100 },
  { subject: "Snelheid", A: 88, fullMark: 100 },
  { subject: "Kosten", A: 75, fullMark: 100 },
  { subject: "Kwaliteit", A: 92, fullMark: 100 },
  { subject: "Flexibiliteit", A: 85, fullMark: 100 },
  { subject: "Betrouwbaarheid", A: 91, fullMark: 100 },
];

const driverPerformance = [
  { name: "Jan de Vries", score: 98, trips: 45, onTime: 44, rating: 4.9 },
  { name: "Pieter Bakker", score: 95, trips: 52, onTime: 49, rating: 4.7 },
  { name: "Kees Jansen", score: 92, trips: 38, onTime: 35, rating: 4.5 },
  { name: "Willem Smit", score: 88, trips: 41, onTime: 36, rating: 4.3 },
  { name: "Henk de Jong", score: 85, trips: 48, onTime: 41, rating: 4.1 },
];

const KPIDashboard = () => {
  const [period, setPeriod] = useState("month");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  const handleExport = () => {
    const csvContent = `KPI Dashboard Export - ${period}
    
KPI Naam,Waarde,Unit,Target,Status,Trend,Verandering
${kpiSummary.map(kpi => 
  `${kpi.name},${kpi.value},${kpi.unit},${kpi.target},${kpi.status},${kpi.trend},${kpi.change}`
).join('\n')}

Wekelijkse Performance:
Week,OTIF,Delivery,Utilization,Satisfaction
${weeklyPerformance.map(w => 
  `${w.week},${w.otif},${w.delivery},${w.utilization},${w.satisfaction}`
).join('\n')}

Top Chauffeurs:
Naam,Score,Ritten,Op tijd,Rating
${driverPerformance.map(d => 
  `${d.name},${d.score},${d.trips},${d.onTime},${d.rating}`
).join('\n')}
`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-dashboard-${period}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-3 w-3" />;
      case "down":
        return <ArrowDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  return (
    <DashboardLayout 
      title="KPI Dashboard" 
      description="Realtime prestatie-indicatoren en analytics"
    >
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Vandaag</SelectItem>
                <SelectItem value="week">Deze week</SelectItem>
                <SelectItem value="month">Deze maand</SelectItem>
                <SelectItem value="quarter">Dit kwartaal</SelectItem>
                <SelectItem value="year">Dit jaar</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Laatst bijgewerkt: {lastUpdated.toLocaleTimeString('nl-NL')}
            </span>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {kpiSummary.map((kpi, i) => (
            <div
              key={kpi.name}}}}
            >
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                {getStatusIcon(kpi.status)}
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{kpi.value}</span>
                  <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className={`flex items-center text-xs ${
                    kpi.trend === "up" ? "text-emerald-500" : 
                    kpi.trend === "down" ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {getTrendIcon(kpi.trend)}
                    <span className="ml-1">
                      {kpi.change > 0 ? "+" : ""}{kpi.change}{kpi.unit === "%" ? "%" : ""}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Target: {kpi.target}{kpi.unit}
                  </span>
                </div>
                <Progress
                  value={(kpi.value / kpi.target) * 100}
                  className="h-1 mt-3"
                />
              </CardContent>
            </Card>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="operations">Operatie</TabsTrigger>
            <TabsTrigger value="drivers">Chauffeurs</TabsTrigger>
            <TabsTrigger value="financial">Financieel</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Performance Radar */}
              <Card>
                <CardHeader>
                  <CardTitle>Prestatie Radar</CardTitle>
                  <CardDescription>Multidimensionale performance analyse</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid className="stroke-muted" />
                        <PolarAngleAxis dataKey="subject" className="text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Score"
                          dataKey="A"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Wekelijkse Trend</CardTitle>
                  <CardDescription>OTIF en klanttevredenheid</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="otif" 
                          name="OTIF %"
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="utilization" 
                          name="Bezetting %"
                          stroke="#22c55e" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Operationele KPI's</CardTitle>
                <CardDescription>Gedetailleerd overzicht van operationele prestaties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="otif" name="OTIF %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="utilization" name="Bezetting %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chauffeur Prestaties</CardTitle>
                <CardDescription>Top performers van deze periode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {driverPerformance.map((driver, index) => (
                    <div
                      key={driver.name}}}}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-amber-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{driver.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {driver.trips} ritten • {driver.onTime} op tijd
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 pl-12 sm:pl-0">
                        <div className="text-right">
                          <p className="text-sm font-medium">{driver.rating} ★</p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                        <div className="flex-1 sm:w-20">
                          <div className="flex items-center gap-2">
                            <Progress value={driver.score} className="h-2 flex-1 sm:flex-none sm:w-16" />
                            <span className="text-sm font-medium whitespace-nowrap">{driver.score}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Omzet per Rit</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€285</div>
                  <p className="text-xs text-emerald-500 flex items-center">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    +8% vs vorige maand
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Kosten per KM</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0.68</div>
                  <p className="text-xs text-emerald-500 flex items-center">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    -3% vs vorige maand
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Marge</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">18.5%</div>
                  <p className="text-xs text-emerald-500 flex items-center">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    +1.2% vs vorige maand
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default KPIDashboard;

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  Truck,
  Euro,
  Download,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  DatabaseZap
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

// ─── Data fetching ────────────────────────────────────────────────────

function usePeriodDays(period: string) {
  return useMemo(() => {
    switch (period) {
      case "today": return 1;
      case "week": return 7;
      case "month": return 30;
      case "quarter": return 90;
      case "year": return 365;
      default: return 30;
    }
  }, [period]);
}

function useKPISnapshots(companyId: string | undefined, periodType: string) {
  return useQuery({
    queryKey: ["kpi-snapshots", companyId, periodType],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_snapshots")
        .select("*")
        .eq("company_id", companyId!)
        .order("snapshot_date", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useTripsStats(companyId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["kpi-trips-stats", companyId, days],
    enabled: !!companyId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from("trips")
        .select("id, status, sales_total, purchase_total, trip_date")
        .eq("company_id", companyId!)
        .gte("trip_date", since.toISOString().split("T")[0]);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useDriverPerformance(companyId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["kpi-driver-perf", companyId, days],
    enabled: !!companyId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Use explicit type to avoid TS2589 deep instantiation
      const driversResult: { data: { id: string; name: string }[] | null; error: any } =
        await (supabase.from("drivers").select("id, name").eq("company_id", companyId!).is("deleted_at", null).limit(50) as any);
      if (driversResult.error) throw driversResult.error;
      const data = driversResult.data ?? [];

      // Get trips per driver
      const { data: trips } = await supabase
        .from("trips")
        .select("id, driver_id, status")
        .eq("company_id", companyId!)
        .gte("trip_date", since.toISOString().split("T")[0])
        .not("driver_id", "is", null);

      const driverMap = new Map<string, { total: number; completed: number; onTime: number }>();
      (trips ?? []).forEach((t) => {
        if (!t.driver_id) return;
        const d = driverMap.get(t.driver_id) ?? { total: 0, completed: 0, onTime: 0 };
        d.total++;
        if (t.status === "afgeleverd" || t.status === "gefactureerd") {
          d.completed++;
          d.onTime++; // best-effort — actual lateness requires stop timestamps
        }
        driverMap.set(t.driver_id, d);
      });

      return (data ?? [])
        .map((d) => {
          const stats = driverMap.get(d.id) ?? { total: 0, completed: 0, onTime: 0 };
          const score = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0;
          return { id: d.id, name: d.name, trips: stats.total, onTime: stats.onTime, score };
        })
        .filter((d) => d.trips > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────

const KPIDashboard = () => {
  const [period, setPeriod] = useState("month");
  const { company } = useCompany();
  const days = usePeriodDays(period);

  const periodType = period === "week" ? "weekly" : period === "quarter" ? "quarterly" : "monthly";
  const { data: snapshots = [], isLoading: snapshotsLoading, refetch: refetchSnaps } = useKPISnapshots(company?.id, periodType);
  const { data: trips = [], isLoading: tripsLoading, refetch: refetchTrips } = useTripsStats(company?.id, days);
  const { data: driverPerf = [], isLoading: driversLoading, refetch: refetchDrivers } = useDriverPerformance(company?.id, days);

  const loading = snapshotsLoading || tripsLoading || driversLoading;

  const handleRefresh = () => {
    refetchSnaps();
    refetchTrips();
    refetchDrivers();
  };

  // ─── Computed KPIs from real data ────────────────────────────────────

  const computed = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter((t) => t.status === "afgeleverd" || t.status === "gefactureerd").length;
    const otif = total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0;

    const revenue = trips.reduce((s, t) => s + (Number(t.sales_total) || 0), 0);
    const cost = trips.reduce((s, t) => s + (Number(t.purchase_total) || 0), 0);
    const margin = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100 * 10) / 10 : 0;
    const revenuePerTrip = completed > 0 ? Math.round(revenue / completed) : 0;

    const latestSnap = snapshots[0];
    const vehicleUtil = latestSnap?.vehicle_utilization_pct ? Number(latestSnap.vehicle_utilization_pct) : 0;
    const driverUtil = latestSnap?.driver_utilization_pct ? Number(latestSnap.driver_utilization_pct) : 0;

    return { total, completed, otif, revenue, cost, margin, revenuePerTrip, vehicleUtil, driverUtil };
  }, [trips, snapshots]);

  const kpiCards = useMemo(() => [
    {
      name: "OTIF Score",
      value: computed.otif,
      target: 95,
      unit: "%",
      status: computed.otif >= 95 ? "success" : computed.otif >= 85 ? "warning" : "error",
    },
    {
      name: "Totaal Orders",
      value: computed.total,
      target: 0,
      unit: "",
      status: computed.total > 0 ? "success" : "warning",
    },
    {
      name: "Voertuig Bezetting",
      value: computed.vehicleUtil,
      target: 85,
      unit: "%",
      status: computed.vehicleUtil >= 85 ? "success" : computed.vehicleUtil >= 70 ? "warning" : "error",
    },
    {
      name: "Marge",
      value: computed.margin,
      target: 15,
      unit: "%",
      status: computed.margin >= 15 ? "success" : computed.margin >= 10 ? "warning" : "error",
    },
  ], [computed]);

  // Weekly snapshots for charts
  const weeklyData = useMemo(() => {
    return snapshots.slice(0, 6).reverse().map((s, i) => ({
      label: `W${i + 1}`,
      otif: s.orders_total && s.orders_on_time ? Math.round((s.orders_on_time / (s.orders_completed || 1)) * 100) : 0,
      utilization: Number(s.vehicle_utilization_pct) || 0,
      revenue: Number(s.revenue_total) || 0,
    }));
  }, [snapshots]);

  const radarData = useMemo(() => {
    const snap = snapshots[0];
    if (!snap) return [];
    return [
      { subject: "OTIF", A: snap.orders_on_time && snap.orders_completed ? Math.round((snap.orders_on_time / snap.orders_completed) * 100) : 0, fullMark: 100 },
      { subject: "Marge", A: Number(snap.margin_avg) || 0, fullMark: 100 },
      { subject: "Voertuigen", A: Number(snap.vehicle_utilization_pct) || 0, fullMark: 100 },
      { subject: "Chauffeurs", A: Number(snap.driver_utilization_pct) || 0, fullMark: 100 },
      { subject: "Omzet", A: Math.min(100, Math.round((Number(snap.revenue_total) || 0) / 1000)), fullMark: 100 },
      { subject: "Volume", A: Math.min(100, (snap.orders_total || 0) * 2), fullMark: 100 },
    ];
  }, [snapshots]);

  const handleExport = () => {
    const csvContent = `KPI Dashboard Export - ${period}\n\nKPI,Waarde,Unit\n${kpiCards.map(k => `${k.name},${k.value},${k.unit}`).join("\n")}\n\nChauffeurs:\nNaam,Score,Ritten,Op Tijd\n${driverPerf.map(d => `${d.name},${d.score},${d.trips},${d.onTime}`).join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi-dashboard-${period}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const hasData = trips.length > 0 || snapshots.length > 0;

  return (
    <DashboardLayout title="KPI Dashboard" description="Realtime prestatie-indicatoren en analytics">
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
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={!hasData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Empty state */}
        {!loading && !hasData && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <DatabaseZap className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="font-medium text-lg">Nog geen KPI data</p>
              <p className="text-sm text-muted-foreground mt-1">
                Zodra er orders en snapshots zijn worden hier live KPI's getoond.
              </p>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        {hasData && (
          <>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {kpiCards.map((kpi) => (
                <Card key={kpi.name} className="relative overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                    {getStatusIcon(kpi.status)}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{kpi.value}</span>
                      <span className="text-sm text-muted-foreground">{kpi.unit}</span>
                    </div>
                    {kpi.target > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">Target: {kpi.target}{kpi.unit}</span>
                        <Progress value={Math.min(100, (kpi.value / kpi.target) * 100)} className="h-1 mt-2" />
                      </>
                    )}
                  </CardContent>
                </Card>
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Prestatie Radar</CardTitle>
                      <CardDescription>Multidimensionale performance analyse</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {radarData.length > 0 ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid className="stroke-muted" />
                              <PolarAngleAxis dataKey="subject" className="text-xs" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">Geen snapshot data beschikbaar</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Trend</CardTitle>
                      <CardDescription>OTIF en bezetting per snapshot</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {weeklyData.length > 0 ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="label" className="text-xs" />
                              <YAxis className="text-xs" />
                              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                              <Legend />
                              <Line type="monotone" dataKey="otif" name="OTIF %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="utilization" name="Bezetting %" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">Geen trend data beschikbaar</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="operations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Operationele KPI's</CardTitle>
                    <CardDescription>Overzicht per snapshot periode</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {weeklyData.length > 0 ? (
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="label" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                            <Legend />
                            <Bar dataKey="otif" name="OTIF %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="utilization" name="Bezetting %" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Geen data beschikbaar voor deze periode</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="drivers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Chauffeur Prestaties</CardTitle>
                    <CardDescription>Top performers — {period === "today" ? "vandaag" : `laatste ${days} dagen`}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {driversLoading ? (
                      <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : driverPerf.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Geen chauffeur data voor deze periode</p>
                    ) : (
                      <div className="space-y-4">
                        {driverPerf.map((driver, index) => (
                          <div key={driver.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
                                index === 0 ? "bg-amber-500 text-white" : index === 1 ? "bg-gray-400 text-white" : index === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{driver.name}</p>
                                <p className="text-xs text-muted-foreground">{driver.trips} ritten • {driver.onTime} op tijd</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pl-12 sm:pl-0">
                              <Progress value={driver.score} className="h-2 w-16" />
                              <span className="text-sm font-medium whitespace-nowrap">{driver.score}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                      <div className="text-2xl font-bold">€{computed.revenuePerTrip}</div>
                      <p className="text-xs text-muted-foreground">{computed.completed} afgeronde ritten</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Totale Omzet</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">€{Math.round(computed.revenue).toLocaleString("nl-NL")}</div>
                      <p className="text-xs text-muted-foreground">Kosten: €{Math.round(computed.cost).toLocaleString("nl-NL")}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Marge</CardTitle>
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{computed.margin}%</div>
                      <p className="text-xs text-muted-foreground">Winst: €{Math.round(computed.revenue - computed.cost).toLocaleString("nl-NL")}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KPIDashboard;

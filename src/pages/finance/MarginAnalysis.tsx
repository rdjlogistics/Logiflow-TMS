import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMarginIntelligence, type Period } from "@/hooks/useMarginIntelligence";
import { Loader2, PieChart, TrendingUp, TrendingDown, Users, Route, Truck, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const fmt = (v: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v);

const pct = (v: number) => `${v.toFixed(1)}%`;

const marginColor = (m: number) =>
  m >= 20 ? "text-emerald-600" : m >= 10 ? "text-amber-600" : "text-destructive";

const marginBadge = (m: number) =>
  m >= 20 ? "default" as const : m >= 10 ? "secondary" as const : "destructive" as const;

const MarginAnalysis = () => {
  const [period, setPeriod] = useState<Period>("month");
  const [tab, setTab] = useState("customers");
  const { kpis, byCustomer, byRoute, byDriver, monthlyTrend, alerts, isLoading } = useMarginIntelligence(period);

  return (
    <DashboardLayout title="Marge Analyse" description="Omzet, kosten en winstmarges per klant, route en chauffeur">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Period selector */}
          <div className="flex justify-end mb-4">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Afgelopen week</SelectItem>
                <SelectItem value="month">Afgelopen maand</SelectItem>
                <SelectItem value="quarter">Afgelopen kwartaal</SelectItem>
                <SelectItem value="year">Afgelopen jaar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card variant="glass">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Omzet</p>
                <p className="text-lg font-bold tabular-nums">{fmt(kpis.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Kosten</p>
                <p className="text-lg font-bold tabular-nums">{fmt(kpis.totalCosts)}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Brutowinst</p>
                <p className={`text-lg font-bold tabular-nums ${marginColor(kpis.avgMargin)}`}>{fmt(kpis.totalProfit)}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Gem. marge</p>
                <p className={`text-lg font-bold tabular-nums ${marginColor(kpis.avgMargin)}`}>{pct(kpis.avgMargin)}</p>
              </CardContent>
            </Card>
            <Card variant="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs text-muted-foreground">Alerts (&lt;10%)</p>
                </div>
                <p className="text-lg font-bold tabular-nums">{kpis.alertCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend Chart */}
          {monthlyTrend.length > 1 && (
            <Card variant="glass" className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Marge Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" name="Omzet" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    <Bar dataKey="profit" name="Winst" radius={[4,4,0,0]}>
                      {monthlyTrend.map((entry, i) => (
                        <Cell key={i} fill={entry.margin_pct >= 15 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detail Tabs */}
          <Card variant="glass">
            <CardContent className="pt-6">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="mb-4 flex-wrap">
                  <TabsTrigger value="customers"><Users className="h-3.5 w-3.5 mr-1" />Klanten</TabsTrigger>
                  <TabsTrigger value="routes"><Route className="h-3.5 w-3.5 mr-1" />Routes</TabsTrigger>
                  <TabsTrigger value="drivers"><Truck className="h-3.5 w-3.5 mr-1" />Chauffeurs</TabsTrigger>
                  <TabsTrigger value="alerts"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="customers">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Klant</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">Kosten</TableHead>
                        <TableHead className="text-right">Winst</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">Ritten</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byCustomer.length === 0 ? (
                        <TableEmpty colSpan={6} title="Geen klantdata gevonden" />
                      ) : byCustomer.map((c) => (
                        <TableRow key={c.customer_id}>
                          <TableCell className="font-medium">{c.customer_name}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(c.revenue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(c.costs)}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${marginColor(c.margin_pct)}`}>{fmt(c.profit)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={marginBadge(c.margin_pct)}>{pct(c.margin_pct)}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{c.trip_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="routes">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">Winst</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">Gem/rit</TableHead>
                        <TableHead className="text-right">Ritten</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byRoute.length === 0 ? (
                        <TableEmpty colSpan={6} title="Geen routedata gevonden" />
                      ) : byRoute.map((r) => (
                        <TableRow key={r.route}>
                          <TableCell className="font-medium">{r.route}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.revenue)}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${marginColor(r.margin_pct)}`}>{fmt(r.profit)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={marginBadge(r.margin_pct)}>{pct(r.margin_pct)}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.avg_per_trip)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.trip_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="drivers">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chauffeur</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">Winst</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                        <TableHead className="text-right">Ritten</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byDriver.length === 0 ? (
                        <TableEmpty colSpan={5} title="Geen chauffeurdata gevonden" />
                      ) : byDriver.map((d) => (
                        <TableRow key={d.driver_id}>
                          <TableCell className="font-medium">{d.driver_name}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(d.revenue)}</TableCell>
                          <TableCell className={`text-right tabular-nums font-medium ${marginColor(d.margin_pct)}`}>{fmt(d.profit)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={marginBadge(d.margin_pct)}>{pct(d.margin_pct)}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{d.trip_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="alerts">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Klant</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Omzet</TableHead>
                        <TableHead className="text-right">Kosten</TableHead>
                        <TableHead className="text-right">Marge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alerts.length === 0 ? (
                        <TableEmpty colSpan={6} title="Geen marge-alerts" />
                      ) : alerts.map((a) => (
                        <TableRow key={a.trip_id}>
                          <TableCell className="font-mono text-sm">{a.order_number}</TableCell>
                          <TableCell>{a.customer_name}</TableCell>
                          <TableCell>{a.route}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(a.revenue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(a.costs)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{pct(a.margin_pct)}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
};

export default MarginAnalysis;

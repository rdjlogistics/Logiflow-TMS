import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMarginIntelligence, type Period } from '@/hooks/useMarginIntelligence';
import { useExport } from '@/hooks/useExport';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Euro, AlertTriangle, Users, MapPin, Truck, Download, Loader2, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function marginBadge(pct: number) {
  if (pct >= 25) return <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">{pct.toFixed(1)}%</Badge>;
  if (pct >= 10) return <Badge variant="default" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">{pct.toFixed(1)}%</Badge>;
  return <Badge variant="destructive">{pct.toFixed(1)}%</Badge>;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);
}

const periodLabels: Record<Period, string> = { week: 'Week', month: 'Maand', quarter: 'Kwartaal', year: 'Jaar' };

const MarginIntelligence = () => {
  const [period, setPeriod] = useState<Period>('month');
  const { kpis, byCustomer, byRoute, byDriver, monthlyTrend, alerts, isLoading } = useMarginIntelligence(period);
  const { exportToCSV } = useExport();
  const { toast } = useToast();

  const handleExport = (tab: string) => {
    try {
      if (tab === 'customers') {
        exportToCSV({
          filename: 'marge-klanten',
          columns: [
            { key: 'customer_name', header: 'Klant' },
            { key: 'revenue', header: 'Omzet', format: (v) => Number(v).toFixed(2) },
            { key: 'costs', header: 'Kosten', format: (v) => Number(v).toFixed(2) },
            { key: 'profit', header: 'Winst', format: (v) => Number(v).toFixed(2) },
            { key: 'margin_pct', header: 'Marge %', format: (v) => Number(v).toFixed(1) },
            { key: 'trip_count', header: 'Ritten' },
          ],
          data: byCustomer as unknown as Record<string, unknown>[],
        });
      } else if (tab === 'routes') {
        exportToCSV({
          filename: 'marge-routes',
          columns: [
            { key: 'route', header: 'Route' },
            { key: 'revenue', header: 'Omzet', format: (v) => Number(v).toFixed(2) },
            { key: 'profit', header: 'Winst', format: (v) => Number(v).toFixed(2) },
            { key: 'margin_pct', header: 'Marge %', format: (v) => Number(v).toFixed(1) },
            { key: 'trip_count', header: 'Ritten' },
          ],
          data: byRoute as unknown as Record<string, unknown>[],
        });
      } else if (tab === 'drivers') {
        exportToCSV({
          filename: 'marge-chauffeurs',
          columns: [
            { key: 'driver_name', header: 'Chauffeur' },
            { key: 'revenue', header: 'Omzet', format: (v) => Number(v).toFixed(2) },
            { key: 'profit', header: 'Winst', format: (v) => Number(v).toFixed(2) },
            { key: 'margin_pct', header: 'Marge %', format: (v) => Number(v).toFixed(1) },
            { key: 'trip_count', header: 'Ritten' },
          ],
          data: byDriver as unknown as Record<string, unknown>[],
        });
      }
      toast({ title: 'Export geslaagd ✅' });
    } catch {
      toast({ title: 'Export mislukt', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Margin Intelligence</h1>
          <p className="text-sm text-muted-foreground">Real-time winstgevendheidsanalyse per klant, route en chauffeur</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(periodLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Euro className="h-3.5 w-3.5" /> Totale Omzet
            </div>
            <p className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(kpis.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">{kpis.tripCount} ritten</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> Brutowinst
            </div>
            <p className={cn("text-xl font-bold tabular-nums", kpis.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
              {formatCurrency(kpis.totalProfit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BarChart3 className="h-3.5 w-3.5" /> Gem. Marge
            </div>
            <p className={cn("text-xl font-bold tabular-nums", kpis.avgMargin >= 25 ? 'text-emerald-600 dark:text-emerald-400' : kpis.avgMargin >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive')}>
              {kpis.avgMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Margin Alerts
            </div>
            <p className={cn("text-xl font-bold tabular-nums", kpis.alertCount > 0 ? 'text-destructive' : 'text-foreground')}>
              {kpis.alertCount}
            </p>
            <p className="text-xs text-muted-foreground">orders &lt;10% marge</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="customers">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="customers"><Users className="h-3.5 w-3.5 mr-1.5" />Klanten</TabsTrigger>
            <TabsTrigger value="routes"><MapPin className="h-3.5 w-3.5 mr-1.5" />Routes</TabsTrigger>
            <TabsTrigger value="drivers"><Truck className="h-3.5 w-3.5 mr-1.5" />Chauffeurs</TabsTrigger>
            <TabsTrigger value="trend"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Trend</TabsTrigger>
            <TabsTrigger value="alerts"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Alerts</TabsTrigger>
          </TabsList>
        </div>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Marge per Klant</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('customers')}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
            </CardHeader>
            <CardContent className="p-0">
              {byCustomer.length > 0 && (
                <div className="px-6 pb-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={byCustomer.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="customer_name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="profit" name="Winst" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table variant="premium">
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
                    <TableEmpty title="Geen data" description="Geen orders gevonden in deze periode" colSpan={6} />
                  ) : byCustomer.map(c => (
                    <TableRow key={c.customer_id}>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(c.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(c.costs)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", c.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{formatCurrency(c.profit)}</TableCell>
                      <TableCell className="text-right">{marginBadge(c.margin_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.trip_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="routes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Marge per Route</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('routes')}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table variant="premium">
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead className="text-right">Omzet</TableHead>
                    <TableHead className="text-right">Winst</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                    <TableHead className="text-right">Ritten</TableHead>
                    <TableHead className="text-right">Gem/rit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byRoute.length === 0 ? (
                    <TableEmpty title="Geen routes" description="Geen routes gevonden in deze periode" colSpan={6} />
                  ) : byRoute.map(r => (
                    <TableRow key={r.route}>
                      <TableCell className="font-medium">{r.route}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(r.revenue)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", r.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{formatCurrency(r.profit)}</TableCell>
                      <TableCell className="text-right">{marginBadge(r.margin_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.trip_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(r.avg_per_trip)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Marge per Chauffeur</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport('drivers')}><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table variant="premium">
                <TableHeader>
                  <TableRow>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead className="text-right">Omzet</TableHead>
                    <TableHead className="text-right">Winst</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                    <TableHead className="text-right">Ritten</TableHead>
                    <TableHead className="text-right">Efficiëntie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byDriver.length === 0 ? (
                    <TableEmpty title="Geen chauffeurs" description="Geen data gevonden in deze periode" colSpan={6} />
                  ) : byDriver.map(d => (
                    <TableRow key={d.driver_id}>
                      <TableCell className="font-medium">{d.driver_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(d.revenue)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>{formatCurrency(d.profit)}</TableCell>
                      <TableCell className="text-right">{marginBadge(d.margin_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.trip_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(d.efficiency)}/rit</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Tab */}
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Omzet & Marge Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <TrendingDown className="h-8 w-8 mb-2" />
                  <p className="text-sm">Geen trenddata beschikbaar</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'Marge %') return `${value.toFixed(1)}%`;
                        return formatCurrency(value);
                      }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Omzet" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="left" type="monotone" dataKey="profit" name="Winst" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="margin_pct" name="Marge %" stroke="hsl(38, 92%, 50%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Margin Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table variant="premium">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Omzet</TableHead>
                    <TableHead className="text-right">Kosten</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableEmpty
                      title="Geen alerts 🎉"
                      description="Alle orders hebben een gezonde marge"
                      colSpan={7}
                      icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                    />
                  ) : alerts.map(a => (
                    <TableRow key={a.trip_id}>
                      <TableCell className="font-mono text-xs">{a.order_number}</TableCell>
                      <TableCell>{a.customer_name}</TableCell>
                      <TableCell className="text-sm">{a.route}</TableCell>
                      <TableCell className="text-sm">{a.trip_date ? format(new Date(a.trip_date), 'dd MMM yyyy', { locale: nl }) : '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(a.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(a.costs)}</TableCell>
                      <TableCell className="text-right">{marginBadge(a.margin_pct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarginIntelligence;

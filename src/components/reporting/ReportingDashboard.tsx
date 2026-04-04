import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  FileSpreadsheet,
  FileText,
  Euro,
  Truck,
  Users,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardCheck,
  Clock,
  Route,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { writeExcelFile } from '@/lib/excelUtils';

interface KPIMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const ReportingDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch orders data for reporting
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['reporting-orders', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'quarter':
          startDate = subMonths(now, 3);
          break;
        case 'year':
          startDate = subMonths(now, 12);
          break;
      }

      const { data, error } = await supabase
        .from('trips')
        .select('id, trip_date, status, sales_total, purchase_total, gross_profit, profit_margin_pct, customer_id, driver_id')
        .is('deleted_at', null)
        .gte('trip_date', format(startDate, 'yyyy-MM-dd'))
        .lte('trip_date', format(now, 'yyyy-MM-dd'));

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch previous period for comparison
  const { data: previousData } = useQuery({
    queryKey: ['reporting-orders-prev', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      switch (period) {
        case 'week':
          endDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          endDate = startOfMonth(now);
          startDate = startOfMonth(subMonths(now, 1));
          break;
        case 'quarter':
          endDate = subMonths(now, 3);
          startDate = subMonths(now, 6);
          break;
        case 'year':
          endDate = subMonths(now, 12);
          startDate = subMonths(now, 24);
          break;
      }

      const { data, error } = await supabase
        .from('trips')
        .select('id, sales_total, purchase_total, gross_profit')
        .is('deleted_at', null)
        .gte('trip_date', format(startDate, 'yyyy-MM-dd'))
        .lt('trip_date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;
      return data || [];
    },
  });

  const { toast } = useToast();

  // Fetch checkout (stop_proofs) data
  const { data: checkoutData, isLoading: checkoutLoading } = useQuery({
    queryKey: ['reporting-checkout', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case 'week': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'month': startDate = startOfMonth(now); break;
        case 'quarter': startDate = subMonths(now, 3); break;
        case 'year': startDate = subMonths(now, 12); break;
      }

      const { data: proofs, error } = await supabase
        .from('stop_proofs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!proofs || proofs.length === 0) return [];

      const tripIds = [...new Set(proofs.map(p => p.trip_id))];
      const stopIds = [...new Set(proofs.map(p => p.stop_id))];
      const driverIds = [...new Set(proofs.map(p => p.driver_id))];

      const [tripsRes, stopsRes, profilesRes] = await Promise.all([
        supabase.from('trips').select('id, order_number, trip_date, status, customer_id').in('id', tripIds),
        supabase.from('route_stops').select('id, company_name, city, stop_order').in('id', stopIds),
        supabase.from('profiles').select('user_id, full_name').in('user_id', driverIds),
      ]);

      const tripsMap = new Map((tripsRes.data || []).map((t: any) => [t.id, t]));
      const stopsMap = new Map((stopsRes.data || []).map((s: any) => [s.id, s]));
      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

      return proofs.map((row: any) => {
        const trip = tripsMap.get(row.trip_id);
        const stop = stopsMap.get(row.stop_id);
        const profile = profilesMap.get(row.driver_id);
        return {
          ...row,
          order_number: trip?.order_number || '-',
          trip_date: trip?.trip_date || '-',
          trip_status: trip?.status || '-',
          stop_name: stop?.company_name || stop?.city || '-',
          stop_order: stop?.stop_order ?? '-',
          driver_name: profile?.full_name || '-',
        };
      });
    },
  });

  // Checkout totals
  const checkoutTotals = useMemo(() => {
    if (!checkoutData) return { loading: 0, waiting: 0, distance: 0, count: 0 };
    return checkoutData.reduce((acc, row) => ({
      loading: acc.loading + (row.loading_minutes || 0),
      waiting: acc.waiting + (row.waiting_minutes || 0),
      distance: acc.distance + (row.actual_distance_km || 0),
      count: acc.count + 1,
    }), { loading: 0, waiting: 0, distance: 0, count: 0 });
  }, [checkoutData]);

  // Export checkout to CSV
  const exportCheckoutCSV = () => {
    if (!checkoutData || checkoutData.length === 0) {
      toast({ title: 'Geen data om te exporteren', variant: 'destructive' });
      return;
    }
    const headers = [
      'Ordernummer', 'Ritdatum', 'Ritstatus', 'Chauffeur', 'Stop', 'Stop Nr',
      'Substatus', 'Laadtijd (min)', 'Wachttijd (min)', 'Afstand (km)',
      'Ontvanger', 'Aankomst', 'Vertrek', 'Opmerking'
    ];
    const rows = checkoutData.map(row => [
      row.order_number,
      row.trip_date,
      row.trip_status,
      row.driver_name,
      row.stop_name,
      row.stop_order,
      row.sub_status || '',
      row.loading_minutes ?? '',
      row.waiting_minutes ?? '',
      row.actual_distance_km ?? '',
      [row.receiver_first_name, row.receiver_last_name].filter(Boolean).join(' ') || '',
      row.arrival_time ? format(new Date(row.arrival_time), 'dd-MM-yyyy HH:mm') : '',
      row.departure_time ? format(new Date(row.departure_time), 'dd-MM-yyyy HH:mm') : '',
      row.note || '',
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkout_rapport_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export geslaagd 📊', description: `${checkoutData.length} rijen geëxporteerd` });
  };

  // Calculate KPIs
  const kpis = useMemo<KPIMetric[]>(() => {
    if (!ordersData) return [];

    const totalOrders = ordersData.length;
    const totalRevenue = ordersData.reduce((sum, o) => sum + (o.sales_total || 0), 0);
    const totalProfit = ordersData.reduce((sum, o) => sum + (o.gross_profit || 0), 0);
    const avgMargin = totalRevenue > 0
      ? (totalProfit / totalRevenue) * 100
      : 0;
    const completedOrders = ordersData.filter(o => ['afgerond', 'afgeleverd', 'gecontroleerd', 'gefactureerd'].includes(o.status)).length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Previous period comparisons
    const prevRevenue = previousData?.reduce((sum, o) => sum + (o.sales_total || 0), 0) || 0;
    const prevProfit = previousData?.reduce((sum, o) => sum + (o.gross_profit || 0), 0) || 0;
    const prevOrders = previousData?.length || 0;

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitChange = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0;
    const ordersChange = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

    return [
      {
        label: 'Totale Omzet',
        value: `€${totalRevenue.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`,
        change: revenueChange,
        trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
        icon: <Euro className="h-5 w-5" />,
        color: 'text-green-500',
      },
      {
        label: 'Bruto Winst',
        value: `€${totalProfit.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`,
        change: profitChange,
        trend: profitChange > 0 ? 'up' : profitChange < 0 ? 'down' : 'neutral',
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-blue-500',
      },
      {
        label: 'Orders',
        value: totalOrders,
        change: ordersChange,
        trend: ordersChange > 0 ? 'up' : ordersChange < 0 ? 'down' : 'neutral',
        icon: <Package className="h-5 w-5" />,
        color: 'text-purple-500',
      },
      {
        label: 'Gemiddelde Marge',
        value: `${avgMargin.toFixed(1)}%`,
        trend: avgMargin >= 15 ? 'up' : 'down',
        icon: <BarChart3 className="h-5 w-5" />,
        color: avgMargin >= 15 ? 'text-green-500' : 'text-amber-500',
      },
      {
        label: 'Voltooiingsgraad',
        value: `${completionRate.toFixed(0)}%`,
        trend: completionRate >= 90 ? 'up' : 'down',
        icon: <Truck className="h-5 w-5" />,
        color: 'text-cyan-500',
      },
    ];
  }, [ordersData, previousData]);

  // Chart data - orders by day/week
  const chartData = useMemo(() => {
    if (!ordersData) return [];

    const grouped: Record<string, { date: string; orders: number; revenue: number; profit: number }> = {};
    
    ordersData.forEach(order => {
      const dateKey = order.trip_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, orders: 0, revenue: 0, profit: 0 };
      }
      grouped[dateKey].orders++;
      grouped[dateKey].revenue += order.sales_total || 0;
      grouped[dateKey].profit += order.gross_profit || 0;
    });

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [ordersData]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    if (!ordersData) return [];

    const statusCounts: Record<string, number> = {};
    ordersData.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [ordersData]);

  // Export functions
  const exportToExcel = () => {
    if (!ordersData) return;

    const exportData = ordersData.map(order => ({
      Datum: order.trip_date,
      Status: order.status,
      Verkoop: order.sales_total || 0,
      Inkoop: order.purchase_total || 0,
      Winst: order.gross_profit || 0,
      'Marge %': order.profit_margin_pct || 0,
    }));

    writeExcelFile(exportData, `rapport_${format(new Date(), 'yyyy-MM-dd')}.xlsx`, 'Orders');
  };

  const exportToCSV = () => {
    if (!ordersData) return;

    const headers = ['Datum', 'Status', 'Verkoop', 'Inkoop', 'Winst', 'Marge %'];
    const rows = ordersData.map(order => [
      order.trip_date,
      order.status,
      order.sales_total || 0,
      order.purchase_total || 0,
      order.gross_profit || 0,
      order.profit_margin_pct || 0,
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapportage & Analytics</h2>
          <p className="text-muted-foreground">Inzicht in uw bedrijfsprestaties</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v: typeof period) => setPeriod(v)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Maand</SelectItem>
              <SelectItem value="quarter">Kwartaal</SelectItem>
              <SelectItem value="year">Jaar</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
          >
            <Card className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={kpi.color}>{kpi.icon}</div>
                  {kpi.change !== undefined && (
                    <Badge 
                      variant={kpi.trend === 'up' ? 'default' : kpi.trend === 'down' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {kpi.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="revenue">Omzet</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="checkout">
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Checkout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Orders & Omzet Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: nl })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'revenue' ? `€${value.toLocaleString()}` : value,
                        name === 'revenue' ? 'Omzet' : 'Orders'
                      ]}
                      labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: nl })}
                    />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Omzet & Winst Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: nl })}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v / 1000}k`} />
                    <Tooltip 
                      formatter={(value: number) => [`€${value.toLocaleString()}`, '']}
                      labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: nl })}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Omzet" />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Winst" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Status Verdeling</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkout" className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="text-xs">Checkouts</span>
                </div>
                <p className="text-2xl font-bold">{checkoutTotals.count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Totaal Laadtijd</span>
                </div>
                <p className="text-2xl font-bold">{checkoutTotals.loading} <span className="text-sm font-normal text-muted-foreground">min</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Totaal Wachttijd</span>
                </div>
                <p className="text-2xl font-bold">{checkoutTotals.waiting} <span className="text-sm font-normal text-muted-foreground">min</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                  <Route className="h-4 w-4" />
                  <span className="text-xs">Totaal Afstand</span>
                </div>
                <p className="text-2xl font-bold">{checkoutTotals.distance.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km</span></p>
              </CardContent>
            </Card>
          </div>

          {/* Export button */}
          <div className="flex justify-end">
            <Button onClick={exportCheckoutCSV} disabled={checkoutLoading || !checkoutData?.length}>
              {checkoutLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exporteer Checkout Data (CSV)
            </Button>
          </div>

          {/* Data table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Checkout Data per Stop</CardTitle>
            </CardHeader>
            <CardContent>
              {checkoutLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !checkoutData || checkoutData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Geen checkout data gevonden voor deze periode</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-2 font-medium text-muted-foreground">Order</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground">Datum</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground">Chauffeur</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground">Stop</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground">Substatus</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-right">Laadtijd</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-right">Wachttijd</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-right">Afstand</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground">Ontvanger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkoutData.slice(0, 50).map((row: any) => (
                        <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2 font-mono text-xs">{row.order_number}</td>
                          <td className="py-2 px-2">{row.trip_date}</td>
                          <td className="py-2 px-2">{row.driver_name}</td>
                          <td className="py-2 px-2">{row.stop_name}</td>
                          <td className="py-2 px-2">
                            {row.sub_status ? (
                              <Badge variant="secondary" className="text-xs">{row.sub_status}</Badge>
                            ) : '-'}
                          </td>
                          <td className="py-2 px-2 text-right">{row.loading_minutes ?? '-'}</td>
                          <td className="py-2 px-2 text-right">{row.waiting_minutes ?? '-'}</td>
                          <td className="py-2 px-2 text-right">{row.actual_distance_km != null ? `${row.actual_distance_km} km` : '-'}</td>
                          <td className="py-2 px-2">{[row.receiver_first_name, row.receiver_last_name].filter(Boolean).join(' ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {checkoutData.length > 50 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Toont 50 van {checkoutData.length} rijen — exporteer voor alle data
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportingDashboard;

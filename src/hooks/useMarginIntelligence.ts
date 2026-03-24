import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { subDays, subMonths, subWeeks, startOfMonth, format } from 'date-fns';

export type Period = 'week' | 'month' | 'quarter' | 'year';

export interface MarginByCustomer {
  customer_id: string;
  customer_name: string;
  revenue: number;
  costs: number;
  profit: number;
  margin_pct: number;
  trip_count: number;
}

export interface MarginByRoute {
  route: string;
  pickup_city: string;
  delivery_city: string;
  revenue: number;
  costs: number;
  profit: number;
  margin_pct: number;
  trip_count: number;
  avg_per_trip: number;
}

export interface MarginByDriver {
  driver_id: string;
  driver_name: string;
  revenue: number;
  costs: number;
  profit: number;
  margin_pct: number;
  trip_count: number;
  efficiency: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
  margin_pct: number;
}

export interface MarginAlert {
  trip_id: string;
  order_number: string;
  customer_name: string;
  route: string;
  revenue: number;
  costs: number;
  margin_pct: number;
  trip_date: string;
}

function getPeriodStart(period: Period): string {
  const now = new Date();
  switch (period) {
    case 'week': return subWeeks(now, 1).toISOString();
    case 'month': return subMonths(now, 1).toISOString();
    case 'quarter': return subMonths(now, 3).toISOString();
    case 'year': return subDays(now, 365).toISOString();
  }
}

export function useMarginIntelligence(period: Period) {
  const periodStart = getPeriodStart(period);

  const { data: rawTrips, isLoading, error } = useQuery({
    queryKey: ['margin-intelligence', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id, order_number, trip_date,
          sales_total, purchase_total, gross_profit, profit_margin_pct,
          customer_id, driver_id,
          pickup_city, delivery_city,
          customers!inner(company_name),
          drivers(id, profiles(full_name))
        `)
        .is('deleted_at', null)
        .gte('trip_date', periodStart.split('T')[0])
        .not('sales_total', 'is', null);

      if (error) throw error;
      return data || [];
    },
  });

  const trips = rawTrips || [];

  const kpis = useMemo(() => {
    const totalRevenue = trips.reduce((s, t) => s + (t.sales_total || 0), 0);
    const totalCosts = trips.reduce((s, t) => s + (t.purchase_total || 0), 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const alertCount = trips.filter(t => (t.profit_margin_pct ?? 0) < 10).length;
    return { totalRevenue, totalCosts, totalProfit, avgMargin, alertCount, tripCount: trips.length };
  }, [trips]);

  const byCustomer = useMemo((): MarginByCustomer[] => {
    const map = new Map<string, MarginByCustomer>();
    for (const t of trips) {
      const cid = t.customer_id || 'unknown';
      const name = (t.customers as any)?.company_name || 'Onbekend';
      const existing = map.get(cid) || { customer_id: cid, customer_name: name, revenue: 0, costs: 0, profit: 0, margin_pct: 0, trip_count: 0 };
      existing.revenue += t.sales_total || 0;
      existing.costs += t.purchase_total || 0;
      existing.trip_count++;
      map.set(cid, existing);
    }
    return Array.from(map.values()).map(c => ({
      ...c,
      profit: c.revenue - c.costs,
      margin_pct: c.revenue > 0 ? ((c.revenue - c.costs) / c.revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [trips]);

  const byRoute = useMemo((): MarginByRoute[] => {
    const map = new Map<string, MarginByRoute>();
    for (const t of trips) {
      const pickup = t.pickup_city || '?';
      const delivery = t.delivery_city || '?';
      const key = `${pickup} → ${delivery}`;
      const existing = map.get(key) || { route: key, pickup_city: pickup, delivery_city: delivery, revenue: 0, costs: 0, profit: 0, margin_pct: 0, trip_count: 0, avg_per_trip: 0 };
      existing.revenue += t.sales_total || 0;
      existing.costs += t.purchase_total || 0;
      existing.trip_count++;
      map.set(key, existing);
    }
    return Array.from(map.values()).map(r => ({
      ...r,
      profit: r.revenue - r.costs,
      margin_pct: r.revenue > 0 ? ((r.revenue - r.costs) / r.revenue) * 100 : 0,
      avg_per_trip: r.trip_count > 0 ? (r.revenue - r.costs) / r.trip_count : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [trips]);

  const byDriver = useMemo((): MarginByDriver[] => {
    const map = new Map<string, MarginByDriver>();
    for (const t of trips) {
      const did = t.driver_id || 'unassigned';
      const driverProfile = (t.drivers as any)?.profiles;
      const name = driverProfile?.full_name || 'Niet toegewezen';
      const existing = map.get(did) || { driver_id: did, driver_name: name, revenue: 0, costs: 0, profit: 0, margin_pct: 0, trip_count: 0, efficiency: 0 };
      existing.revenue += t.sales_total || 0;
      existing.costs += t.purchase_total || 0;
      existing.trip_count++;
      map.set(did, existing);
    }
    return Array.from(map.values()).map(d => ({
      ...d,
      profit: d.revenue - d.costs,
      margin_pct: d.revenue > 0 ? ((d.revenue - d.costs) / d.revenue) * 100 : 0,
      efficiency: d.trip_count > 0 ? (d.revenue - d.costs) / d.trip_count : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [trips]);

  const monthlyTrend = useMemo((): MonthlyTrend[] => {
    const map = new Map<string, MonthlyTrend>();
    for (const t of trips) {
      const month = format(startOfMonth(new Date(t.trip_date)), 'yyyy-MM');
      const existing = map.get(month) || { month, revenue: 0, costs: 0, profit: 0, margin_pct: 0 };
      existing.revenue += t.sales_total || 0;
      existing.costs += t.purchase_total || 0;
      map.set(month, existing);
    }
    return Array.from(map.values())
      .map(m => ({
        ...m,
        profit: m.revenue - m.costs,
        margin_pct: m.revenue > 0 ? ((m.revenue - m.costs) / m.revenue) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [trips]);

  const alerts = useMemo((): MarginAlert[] => {
    return trips
      .filter(t => (t.profit_margin_pct ?? 0) < 10)
      .map(t => ({
        trip_id: t.id,
        order_number: t.order_number || '-',
        customer_name: (t.customers as any)?.company_name || 'Onbekend',
        route: `${t.pickup_city || '?'} → ${t.delivery_city || '?'}`,
        revenue: t.sales_total || 0,
        costs: t.purchase_total || 0,
        margin_pct: t.profit_margin_pct ?? 0,
        trip_date: t.trip_date || '',
      }))
      .sort((a, b) => a.margin_pct - b.margin_pct);
  }, [trips]);

  return { kpis, byCustomer, byRoute, byDriver, monthlyTrend, alerts, isLoading, error };
}

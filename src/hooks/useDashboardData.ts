import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, eachWeekOfInterval, subWeeks, endOfWeek } from "date-fns";
import { getNlLocale } from "@/lib/locale";
import { useCompany } from "@/hooks/useCompany";

// --- Types ---

interface RevenueData { month: string; revenue: number; costs: number }
interface TripStatusData { status: string; count: number; label: string }
interface WeeklyTripsData { week: string; trips: number }
interface DashboardStats { customers: number; vehicles: number; tripsThisMonth: number; openInvoices: number; totalRevenue: number; pendingPayments: number; pendingSubmissions: number }
interface OpsStats { chauffeurNodig: number; onderweg: number; afgeleverd: number; atRisk: number; podMissing: number; waitingTime: number; gpsOff: number; etaRisk: number; hold: number }
interface FinanceStats { openstaand: number; openFacturen: number; payoutsGepland: number; cashRunway: number; readyToInvoice: number }
interface ActionItem { id: string; orderId?: string; orderRef: string; issueLabel: string; issueType: "driver" | "pod" | "waiting" | "eta" | "hold" | "submission"; severity: "critical" | "warning" | "info"; href: string; pickupCity?: string; deliveryCity?: string }

interface DashboardData {
  stats: DashboardStats;
  opsStats: OpsStats;
  financeStats: FinanceStats;
  actionQueue: ActionItem[];
  revenueData: RevenueData[];
  tripStatusData: TripStatusData[];
  weeklyTripsData: WeeklyTripsData[];
  otifPercentage: number;
  unreadEmailCount: number;
}

const EMPTY_DATA: DashboardData = {
  stats: { customers: 0, vehicles: 0, tripsThisMonth: 0, openInvoices: 0, totalRevenue: 0, pendingPayments: 0, pendingSubmissions: 0 },
  opsStats: { chauffeurNodig: 0, onderweg: 0, afgeleverd: 0, atRisk: 0, podMissing: 0, waitingTime: 0, gpsOff: 0, etaRisk: 0, hold: 0 },
  financeStats: { openstaand: 0, openFacturen: 0, payoutsGepland: 0, cashRunway: 90, readyToInvoice: 0 },
  actionQueue: [],
  revenueData: [],
  tripStatusData: [],
  weeklyTripsData: [],
  otifPercentage: 0,
  unreadEmailCount: 0,
};

// --- Data fetcher (tenant-scoped, uses server-side RPCs) ---

async function fetchDashboardData(companyId: string): Promise<DashboardData> {
  const now = new Date();
  const sixMonthsAgo = subMonths(startOfMonth(now), 5);
  const monthStart = startOfMonth(now);

  const nlLocalePromise = getNlLocale();

  // 3 RPCs + 2 light queries instead of 6 heavy queries
  const [
    countsResult,
    invoiceStatsResult,
    opsResult,
    { data: submissions },
    unreadEmailResult,
  ] = await Promise.all([
    supabase.rpc('get_dashboard_counts', { p_month_start: monthStart.toISOString() }),
    supabase.rpc('get_invoice_stats', { p_company_id: companyId }),
    // New consolidated RPC — replaces 2 unbounded trips queries + client-side aggregation
    supabase.rpc('get_dashboard_ops', {
      p_company_id: companyId,
      p_month_start: monthStart.toISOString(),
      p_six_months_ago: sixMonthsAgo.toISOString(),
    }),
    supabase.from("customer_submissions").select("id, pickup_company, delivery_company, status, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
    (supabase as any).from("inbound_emails").select("id", { count: "exact", head: true }).eq("read", false).then((r: any) => r).catch(() => ({ count: 0 })),
  ]);

  const counts = (countsResult.data as any) || {};
  const customersCount = counts.customers || 0;
  const vehiclesCount = counts.vehicles || 0;
  const tripsCount = counts.trips_month || 0;
  const pendingSubmissionsCount = counts.pending_submissions || 0;
  const purchaseInvoiceCount = counts.purchase_invoices || 0;

  // Invoice stats from RPC
  const invStats = (invoiceStatsResult.data as any) || {};
  const openInvoices = invStats.open_invoices || 0;
  const totalRevenue = invStats.total_paid || 0;
  const pendingPayments = invStats.pending_payments || 0;

  // Ops data from consolidated RPC
  const ops = (opsResult.data as any) || {};
  const opsData = ops.ops || {};
  const chauffeurNodig = opsData.chauffeur_nodig || 0;
  const onderweg = opsData.onderweg || 0;
  const afgeleverd = opsData.afgeleverd || 0;
  const atRisk = opsData.at_risk || 0;
  const podMissing = ops.pod_missing_count || 0;
  const readyToInvoice = ops.ready_to_invoice || 0;
  const completedCount = ops.completed_count || 0;

  // Action queue from RPC data
  const actions: ActionItem[] = [];
  const unassigned = ops.unassigned_today || [];
  for (const trip of unassigned) {
    actions.push({
      id: trip.id, orderId: trip.id,
      orderRef: trip.order_number ? `#${trip.order_number}` : `Rit ${trip.id.slice(0, 6)}`,
      issueLabel: "Chauffeur koppelen", issueType: "driver", severity: "critical",
      href: `/driver/assign`, pickupCity: trip.pickup_city || undefined, deliveryCity: trip.delivery_city || undefined,
    });
  }
  const podItems = ops.pod_missing_items || [];
  for (const trip of podItems.slice(0, 5)) {
    actions.push({
      id: trip.id, orderId: trip.id,
      orderRef: trip.order_number ? `#${trip.order_number}` : `Rit ${trip.id.slice(0, 6)}`,
      issueLabel: "POD ontbreekt", issueType: "pod", severity: "warning",
      href: `/operations/pod`,
    });
  }
  submissions?.forEach(sub => {
    actions.push({
      id: sub.id, orderRef: `Aanvraag ${sub.pickup_company || 'Onbekend'}`,
      issueLabel: `${sub.pickup_company || ''} → ${sub.delivery_company || ''}`,
      issueType: "submission", severity: "warning", href: `/orders?tab=submissions&id=${sub.id}`,
    });
  });
  actions.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));

  const nl = await nlLocalePromise;

  // Revenue by month — map RPC month_key (YYYY-MM) to display format
  const monthlyRevenue: Record<string, { revenue: number; costs: number }> = {};
  for (let i = 5; i >= 0; i--) {
    monthlyRevenue[format(subMonths(now, i), "MMM", { locale: nl })] = { revenue: 0, costs: 0 };
  }
  const revenueRows = ops.revenue || [];
  for (const row of revenueRows) {
    const d = new Date(row.month_key + '-01');
    const monthKey = format(d, "MMM", { locale: nl });
    if (monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey].revenue += Number(row.revenue) || 0;
      monthlyRevenue[monthKey].costs += Number(row.costs) || 0;
    }
  }
  const revenueData = Object.entries(monthlyRevenue).map(([month, data]) => ({ month, revenue: data.revenue, costs: data.costs }));

  // Trip status distribution from RPC
  const statusLabels: Record<string, string> = { gepland: "Gepland", onderweg: "Onderweg", afgerond: "Afgerond", geannuleerd: "Geannuleerd" };
  const rpcStatusCounts = ops.status_counts || {};
  const tripStatusData = ['gepland', 'onderweg', 'afgerond', 'geannuleerd'].map(status => ({
    status,
    count: rpcStatusCounts[status] || 0,
    label: statusLabels[status] || status,
  }));

  // Weekly trips from RPC
  const rpcWeekly = ops.weekly || [];
  const weeks = eachWeekOfInterval({ start: subWeeks(now, 5), end: now });
  const weeklyTripsData = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekTrips = rpcWeekly.filter((w: any) => {
      const d = new Date(w.week_start);
      return d >= weekStart && d <= weekEnd;
    }).reduce((sum: number, w: any) => sum + (w.trips || 0), 0);
    return { week: format(weekStart, "d/M"), trips: weekTrips };
  });

  // OTIF
  const otifPercentage = completedCount > 0 ? 100 : 0;

  return {
    stats: {
      customers: customersCount, vehicles: vehiclesCount, tripsThisMonth: tripsCount,
      openInvoices, totalRevenue, pendingPayments, pendingSubmissions: pendingSubmissionsCount,
    },
    opsStats: {
      chauffeurNodig, onderweg, afgeleverd, atRisk,
      podMissing, waitingTime: 0, gpsOff: 0, etaRisk: 0, hold: 0,
    },
    financeStats: {
      openstaand: pendingPayments,
      openFacturen: openInvoices,
      payoutsGepland: purchaseInvoiceCount,
      cashRunway: pendingPayments > 0 ? Math.max(7, Math.round((totalRevenue / Math.max(pendingPayments, 1)) * 30)) : 90,
      readyToInvoice,
    },
    actionQueue: actions,
    revenueData,
    tripStatusData,
    weeklyTripsData,
    otifPercentage,
    unreadEmailCount: unreadEmailResult?.count ?? 0,
  };
}

// --- Hook ---

export const useDashboardData = () => {
  const { company } = useCompany();
  const companyId = company?.id;

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-data', companyId],
    queryFn: () => fetchDashboardData(companyId!),
    enabled: !!companyId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000,
    refetchIntervalInBackground: false,
    retry: 2,
  });

  const result = data ?? EMPTY_DATA;
  // True only until first successful fetch — background refetches stay invisible
  const isFirstLoad = isLoading || (isFetching && !dataUpdatedAt);

  const hasEnoughData = useMemo(() => {
    const totalTrips = result.tripStatusData.reduce((sum, item) => sum + item.count, 0);
    const totalRevenue = result.revenueData.reduce((sum, item) => sum + item.revenue, 0);
    return totalTrips >= 5 || totalRevenue > 0;
  }, [result.tripStatusData, result.revenueData]);

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    stats: result.stats,
    opsStats: result.opsStats,
    financeStats: result.financeStats,
    actionQueue: result.actionQueue,
    revenueData: result.revenueData,
    tripStatusData: result.tripStatusData,
    weeklyTripsData: result.weeklyTripsData,
    otifPercentage: result.otifPercentage,
    unreadEmailCount: result.unreadEmailCount,
    hasEnoughData,
    loading: isLoading,
    error: error instanceof Error ? error : null,
    lastRefresh: dataUpdatedAt ? new Date(dataUpdatedAt) : new Date(),
    refetch: handleRefetch,
  };
};

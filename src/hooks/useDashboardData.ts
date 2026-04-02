import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks, startOfDay, endOfDay } from "date-fns";
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

// --- Data fetcher (tenant-scoped) ---

async function fetchDashboardData(companyId: string): Promise<DashboardData> {
  const now = new Date();
  const sixMonthsAgo = subMonths(startOfMonth(now), 5);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);

  const nlLocalePromise = getNlLocale();

  const [
    countsResult,
    invoiceStatsResult,
    { data: tripsData },
    { data: allTrips },
    { data: submissions },
    unreadEmailResult,
  ] = await Promise.all([
    supabase.rpc('get_dashboard_counts', { p_month_start: monthStart.toISOString() }),
    // Invoice stats via server-side RPC — replaces client-side aggregation
    supabase.rpc('get_invoice_stats', { p_company_id: companyId }),
    // Trips for revenue chart (6 months) — tenant-scoped
    supabase.from("trips").select("trip_date, sales_total, purchase_total, created_at, status, driver_id, vehicle_id, pickup_city, delivery_city, pod_available, id, order_number").is("deleted_at", null).eq("company_id", companyId).gte("created_at", sixMonthsAgo.toISOString()),
    // Recent trips for status/weekly/ops (6 weeks) — tenant-scoped
    supabase.from("trips").select("id, order_number, status, trip_date, driver_id, vehicle_id, pickup_city, delivery_city, pod_available").is("deleted_at", null).eq("company_id", companyId).gte("trip_date", subWeeks(now, 6).toISOString()),
    // Pending submissions
    supabase.from("customer_submissions").select("id, pickup_company, delivery_company, status, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
    // Unread emails
    (supabase as any).from("inbound_emails").select("id", { count: "exact", head: true }).eq("read", false).then((r: any) => r).catch(() => ({ count: 0 })),
  ]);

  const counts = (countsResult.data as any) || {};
  const customersCount = counts.customers || 0;
  const vehiclesCount = counts.vehicles || 0;
  const tripsCount = counts.trips_month || 0;
  const pendingSubmissionsCount = counts.pending_submissions || 0;
  const purchaseInvoiceCount = counts.purchase_invoices || 0;

  // Client-side: filter today's trips and POD-missing from allTrips
  const todayTrips = allTrips?.filter(t => {
    const d = new Date(t.trip_date);
    return d >= todayStart && d <= todayEnd;
  }) || [];
  const podTrips = allTrips?.filter(t => ['afgerond', 'gecontroleerd'].includes(t.status) && t.pod_available === false) || [];

  // Invoice calculations
  const openInvoices = invoicesData?.filter(inv => inv.status === "verzonden" || inv.status === "vervallen").length || 0;
  const totalRevenue = invoicesData?.reduce((sum, inv) => sum + (Number(inv.amount_paid) || 0), 0) || 0;
  const pendingPayments = invoicesData?.reduce((sum, inv) => {
    if (inv.status !== "betaald") return sum + (Number(inv.total_amount) - Number(inv.amount_paid || 0));
    return sum;
  }, 0) || 0;

  // Ops stats
  const terminalStatuses = ['geannuleerd', 'afgerond', 'afgeleverd', 'gecontroleerd', 'gefactureerd'];
  const chauffeurNodig = todayTrips.filter(t => !t.driver_id && !terminalStatuses.includes(t.status)).length;
  const onderweg = todayTrips.filter(t => t.status === 'onderweg').length;
  const afgeleverd = todayTrips.filter(t => ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(t.status)).length;
  const podMissing = podTrips.length;
  const atRisk = todayTrips.filter(t => !t.driver_id && !t.vehicle_id && !terminalStatuses.includes(t.status)).length;

  // Action queue
  const actions: ActionItem[] = [];
  todayTrips.filter(t => !t.driver_id && !terminalStatuses.includes(t.status)).forEach(trip => {
    actions.push({
      id: trip.id, orderId: trip.id,
      orderRef: trip.order_number ? `#${trip.order_number}` : `Rit ${trip.id.slice(0, 6)}`,
      issueLabel: "Chauffeur koppelen", issueType: "driver", severity: "critical",
      href: `/driver/assign`, pickupCity: trip.pickup_city || undefined, deliveryCity: trip.delivery_city || undefined,
    });
  });
  podTrips.slice(0, 5).forEach(trip => {
    actions.push({
      id: trip.id, orderId: trip.id,
      orderRef: trip.order_number ? `#${trip.order_number}` : `Rit ${trip.id.slice(0, 6)}`,
      issueLabel: "POD ontbreekt", issueType: "pod", severity: "warning",
      href: `/operations/pod`,
    });
  });
  submissions?.forEach(sub => {
    actions.push({
      id: sub.id, orderRef: `Aanvraag ${sub.pickup_company || 'Onbekend'}`,
      issueLabel: `${sub.pickup_company || ''} → ${sub.delivery_company || ''}`,
      issueType: "submission", severity: "warning", href: `/orders?tab=submissions&id=${sub.id}`,
    });
  });
  actions.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));

  const nl = await nlLocalePromise;

  // Revenue by month
  const monthlyRevenue: Record<string, { revenue: number; costs: number }> = {};
  for (let i = 5; i >= 0; i--) {
    monthlyRevenue[format(subMonths(now, i), "MMM", { locale: nl })] = { revenue: 0, costs: 0 };
  }
  tripsData?.forEach(trip => {
    const monthKey = format(new Date(trip.created_at), "MMM", { locale: nl });
    if (monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey].revenue += Number(trip.sales_total) || 0;
      monthlyRevenue[monthKey].costs += Number(trip.purchase_total) || 0;
    }
  });
  const revenueData = Object.entries(monthlyRevenue).map(([month, data]) => ({ month, revenue: data.revenue, costs: data.costs }));

  // Trip status distribution
  const statusCounts: Record<string, number> = { gepland: 0, onderweg: 0, afgerond: 0, geannuleerd: 0 };
  const statusLabels: Record<string, string> = { gepland: "Gepland", onderweg: "Onderweg", afgerond: "Afgerond", geannuleerd: "Geannuleerd" };
  allTrips?.forEach(trip => { if (statusCounts[trip.status] !== undefined) statusCounts[trip.status]++; });
  const tripStatusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count, label: statusLabels[status] || status }));

  // Weekly trips
  const weeks = eachWeekOfInterval({ start: subWeeks(now, 5), end: now });
  const weeklyTripsData = weeks.map(weekStart => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekTrips = allTrips?.filter(trip => { const d = new Date(trip.trip_date); return d >= weekStart && d <= weekEnd; }).length || 0;
    return { week: format(weekStart, "d/M"), trips: weekTrips };
  });

  // OTIF
  const completedTrips = allTrips?.filter(t => ['afgerond', 'afgeleverd', 'gecontroleerd', 'gefactureerd'].includes(t.status)) || [];
  const otifPercentage = completedTrips.length > 0 ? 100 : 0;

  // Finance stats
  const readyToInvoice = allTrips?.filter(t => ['afgerond', 'gecontroleerd'].includes(t.status)).length || 0;

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

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-data', companyId],
    queryFn: () => fetchDashboardData(companyId!),
    enabled: !!companyId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,   // Fix 5: stop polling in background tabs
    retry: 2,
    placeholderData: EMPTY_DATA,
  });

  const result = data ?? EMPTY_DATA;

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

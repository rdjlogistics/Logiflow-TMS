// KPI calculation utilities for LogiFlow TMS dashboard

export interface TripKpiInput {
  salesTotal: number;
  purchaseTotal: number;
  distanceKm: number;
}

export interface KpiSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPct: number;
  totalKm: number;
  revenuePerKm: number;
  costPerKm: number;
  profitPerKm: number;
  tripCount: number;
}

export function berekendKpiSummary(trips: TripKpiInput[]): KpiSummary {
  const tripCount = trips.length;
  const totalRevenue = round(trips.reduce((s, t) => s + (t.salesTotal ?? 0), 0));
  const totalCost = round(trips.reduce((s, t) => s + (t.purchaseTotal ?? 0), 0));
  const grossProfit = round(totalRevenue - totalCost);
  const marginPct = totalRevenue > 0 ? round2((grossProfit / totalRevenue) * 100) : 0;
  const totalKm = round(trips.reduce((s, t) => s + (t.distanceKm ?? 0), 0));
  const revenuePerKm = totalKm > 0 ? round2(totalRevenue / totalKm) : 0;
  const costPerKm = totalKm > 0 ? round2(totalCost / totalKm) : 0;
  const profitPerKm = totalKm > 0 ? round2(grossProfit / totalKm) : 0;

  return {
    totalRevenue,
    totalCost,
    grossProfit,
    marginPct,
    totalKm,
    revenuePerKm,
    costPerKm,
    profitPerKm,
    tripCount,
  };
}

// --- Growth / trend ---

/** Percentage change between two periods */
export function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/** Trend arrow label */
export function trendLabel(pct: number): { label: string; positive: boolean } {
  const abs = Math.abs(pct);
  const positive = pct >= 0;
  return {
    label: `${positive ? '+' : ''}${pct.toFixed(1)}%`,
    positive,
  };
}

// --- Invoice KPIs ---

export interface InvoiceKpiInput {
  totalAmount: number;
  amountPaid: number;
  status: string;
  dueDate?: string | null;
}

export interface InvoiceKpiSummary {
  totalOutstanding: number;
  totalOverdue: number;
  totalPaid: number;
  overdueCount: number;
  paidCount: number;
  openCount: number;
  averageDso: number; // Days Sales Outstanding
}

export function berekenInvoiceKpis(invoices: InvoiceKpiInput[]): InvoiceKpiSummary {
  const now = new Date();
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let totalPaid = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let openCount = 0;
  let dsoSum = 0;
  let dsoCount = 0;

  for (const inv of invoices) {
    const open = round(inv.totalAmount - (inv.amountPaid ?? 0));

    if (inv.status === 'betaald') {
      totalPaid += inv.totalAmount;
      paidCount++;
    } else {
      totalOutstanding += open;
      openCount++;
      if (inv.dueDate) {
        const due = new Date(inv.dueDate);
        if (due < now) {
          totalOverdue += open;
          overdueCount++;
          const days = Math.round((now.getTime() - due.getTime()) / 86400000);
          dsoSum += days;
          dsoCount++;
        }
      }
    }
  }

  return {
    totalOutstanding: round(totalOutstanding),
    totalOverdue: round(totalOverdue),
    totalPaid: round(totalPaid),
    overdueCount,
    paidCount,
    openCount,
    averageDso: dsoCount > 0 ? Math.round(dsoSum / dsoCount) : 0,
  };
}

// --- Driver performance ---

export interface DriverPerformanceInput {
  totalTrips: number;
  onTimeTrips: number;
  totalKm: number;
  fuelLiters?: number;
  rating?: number;
}

export function berekenDriverScore(input: DriverPerformanceInput): {
  onTimePct: number;
  fuelEfficiency?: number; // km per liter
  performanceScore: number; // 0–100
} {
  const onTimePct = input.totalTrips > 0
    ? round2((input.onTimeTrips / input.totalTrips) * 100)
    : 0;

  const fuelEfficiency = input.fuelLiters && input.fuelLiters > 0
    ? round2(input.totalKm / input.fuelLiters)
    : undefined;

  // Weighted score: 60% on-time, 30% rating (0-5 → 0-100), 10% trips volume bonus
  const ratingScore = ((input.rating ?? 3) / 5) * 100;
  const volumeBonus = Math.min(10, (input.totalTrips / 100) * 10);
  const performanceScore = Math.round(onTimePct * 0.6 + ratingScore * 0.3 + volumeBonus);

  return { onTimePct, fuelEfficiency, performanceScore };
}

// --- Helpers ---

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

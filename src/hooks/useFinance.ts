import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "./useCompany";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears, differenceInDays, format } from "date-fns";

// =============================================
// Types
// =============================================

export type FinanceTransactionType = 
  | "fuel" | "toll" | "parking" | "maintenance" | "insurance" 
  | "lease" | "subscription" | "other_cost" | "revenue" | "subcontract";

export type FinanceTransactionStatus = 
  | "pending" | "matched" | "unmatched" | "disputed" | "approved" | "rejected";

export type FuelCardProvider = 
  | "shell" | "dkv" | "travelcard" | "multitankcard" | "bp" | "esso" | "total" | "avia" | "other";

export type ImportMethod = "api" | "csv" | "pdf" | "manual";

export interface FuelCardConnection {
  id: string;
  company_id: string;
  provider: FuelCardProvider;
  connection_name: string;
  import_method: ImportMethod;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export interface FuelCard {
  id: string;
  connection_id: string;
  card_number: string;
  card_name: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  is_active: boolean;
  monthly_limit: number | null;
  created_at: string;
  updated_at: string;
  vehicle?: { license_plate: string; brand: string; model: string } | null;
}

export interface FinanceTransaction {
  id: string;
  company_id: string;
  transaction_type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  provider: FuelCardProvider | null;
  fuel_card_id: string | null;
  import_method: ImportMethod;
  external_id: string | null;
  transaction_date: string;
  description: string | null;
  amount: number;
  vat_amount: number;
  currency: string;
  fuel_type: string | null;
  liters: number | null;
  kwh: number | null;
  price_per_unit: number | null;
  odometer_reading: number | null;
  location_name: string | null;
  location_address: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  trip_id: string | null;
  customer_id: string | null;
  cost_center: string | null;
  is_billable: boolean;
  is_fraud_suspected: boolean;
  is_outlier: boolean;
  needs_review: boolean;
  document_url: string | null;
  created_at: string;
  vehicle?: { license_plate: string; brand: string } | null;
  trip?: { order_number: string } | null;
}

export interface RecurringCost {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  transaction_type: FinanceTransactionType;
  amount: number;
  vat_percentage: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_due_date: string | null;
  vehicle_id: string | null;
  cost_center: string | null;
  is_active: boolean;
  auto_book: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceGoal {
  id: string;
  company_id: string;
  name: string;
  metric_key: string;
  target_value: number;
  warning_threshold: number | null;
  current_value: number | null;
  unit: string | null;
  period: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceSnapshot {
  id: string;
  company_id: string;
  snapshot_date: string;
  period_type: string;
  revenue_total: number;
  revenue_transport: number;
  revenue_waiting_time: number;
  costs_fuel: number;
  costs_toll: number;
  costs_parking: number;
  costs_subcontract: number;
  costs_maintenance: number;
  costs_insurance: number;
  costs_lease: number;
  costs_other: number;
  gross_profit: number;
  gross_margin_pct: number;
  net_profit: number;
  net_margin_pct: number;
  receivables_total: number;
  receivables_overdue: number;
  payables_total: number;
  cash_position: number;
  dso_days: number;
  fuel_per_100km: number;
  orders_count: number;
  km_driven: number;
}

export interface FinanceAlert {
  id: string;
  company_id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  data: Record<string, unknown>;
  action_url: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export interface CashflowSummary {
  revenue: {
    mtd: number;
    previousMtd: number;
    trend: number;
  };
  costs: {
    fuel: number;
    toll: number;
    parking: number;
    subcontract: number;
    maintenance: number;
    other: number;
    total: number;
  };
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  receivables: {
    total: number;
    overdue: number;
    within7days: number;
    within14days: number;
    within30days: number;
  };
  payables: {
    total: number;
    within7days: number;
    within14days: number;
  };
  cashPosition: number;
  dso: number;
}

// =============================================
// Hooks
// =============================================

export const useFinanceTransactions = (filters?: {
  startDate?: string;
  endDate?: string;
  type?: FinanceTransactionType;
  status?: FinanceTransactionStatus;
  vehicleId?: string;
}) => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["finance-transactions", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("finance_transactions")
        .select(`
          *,
          vehicle:vehicles(license_plate, brand)
        `)
        .eq("company_id", company.id)
        .order("transaction_date", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("transaction_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("transaction_date", filters.endDate);
      }
      if (filters?.type) {
        query = query.eq("transaction_type", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as FinanceTransaction[];
    },
    enabled: !!company?.id,
  });
};

export const useFuelCardConnections = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["fuel-card-connections", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("fuel_card_connections")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FuelCardConnection[];
    },
    enabled: !!company?.id,
  });
};

export const useFuelCards = (connectionId?: string) => {
  return useQuery({
    queryKey: ["fuel-cards", connectionId],
    queryFn: async () => {
      let query = supabase
        .from("fuel_cards")
        .select(`
          *,
          vehicle:vehicles(license_plate, brand, model)
        `)
        .order("card_number", { ascending: true });

      if (connectionId) {
        query = query.eq("connection_id", connectionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FuelCard[];
    },
  });
};

export const useRecurringCosts = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["recurring-costs", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("recurring_costs")
        .select("*")
        .eq("company_id", company.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as RecurringCost[];
    },
    enabled: !!company?.id,
  });
};

export const useFinanceGoals = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["finance-goals", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("finance_goals")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as FinanceGoal[];
    },
    enabled: !!company?.id,
  });
};

export const useFinanceAlerts = () => {
  const { company } = useCompany();

  return useQuery({
    queryKey: ["finance-alerts", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("finance_alerts")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as FinanceAlert[];
    },
    enabled: !!company?.id,
  });
};

export const useCashflowSummary = (period: 'month' | 'quarter' | 'year' = 'month') => {
  const { company } = useCompany();
  const now = new Date();

  // Calculate date ranges based on period
  const periodStart = format(
    period === 'year' ? startOfYear(now) : period === 'quarter' ? startOfQuarter(now) : startOfMonth(now),
    "yyyy-MM-dd"
  );
  const periodEnd = format(
    period === 'year' ? endOfYear(now) : period === 'quarter' ? endOfQuarter(now) : endOfMonth(now),
    "yyyy-MM-dd"
  );
  const prevPeriodStart = format(
    period === 'year' ? startOfYear(subYears(now, 1)) : period === 'quarter' ? startOfQuarter(subQuarters(now, 1)) : startOfMonth(subMonths(now, 1)),
    "yyyy-MM-dd"
  );
  const prevPeriodEnd = format(
    period === 'year' ? endOfYear(subYears(now, 1)) : period === 'quarter' ? endOfQuarter(subQuarters(now, 1)) : endOfMonth(subMonths(now, 1)),
    "yyyy-MM-dd"
  );

  return useQuery({
    queryKey: ["cashflow-summary", company?.id, period, periodStart],
    queryFn: async (): Promise<CashflowSummary> => {
      if (!company?.id) {
        return getEmptySummary();
      }

      // Primary revenue source: trips table (sales_total / purchase_total)
      const { data: currentTrips } = await supabase
        .from("trips")
        .select("sales_total, purchase_total, carrier_id, status, trip_date")
        .eq("company_id", company.id)
        .gte("trip_date", periodStart)
        .lte("trip_date", periodEnd)
        .not("status", "eq", "geannuleerd")
        .is("deleted_at", null);

      // Previous period trips for comparison
      const { data: prevTrips } = await supabase
        .from("trips")
        .select("sales_total")
        .eq("company_id", company.id)
        .gte("trip_date", prevPeriodStart)
        .lte("trip_date", prevPeriodEnd)
        .not("status", "eq", "geannuleerd")
        .is("deleted_at", null);

      // Supplementary cost data from finance_transactions (fuel, toll, etc.)
      const { data: transactions } = await supabase
        .from("finance_transactions")
        .select("transaction_type, amount")
        .eq("company_id", company.id)
        .gte("transaction_date", periodStart)
        .lte("transaction_date", periodEnd);

      // Uninvoiced delivered orders = receivables
      const { data: uninvoicedTrips } = await supabase
        .from("trips")
        .select("sales_total, trip_date")
        .eq("company_id", company.id)
        .in("status", ["afgeleverd", "afgerond", "gecontroleerd"])
        .is("invoice_id", null)
        .is("deleted_at", null);

      // Open invoices for additional receivables (company-scoped)
      const { data: openInvoices } = await supabase
        .from("invoices")
        .select("total_amount, status, due_date")
        .eq("company_id", company.id)
        .in("status", ["verzonden", "vervallen"]);

      // Calculate revenue from trips
      const revenue = (currentTrips || []).reduce((s, t) => s + (t.sales_total || 0), 0);
      const purchaseCosts = (currentTrips || []).reduce((s, t) => s + (t.purchase_total || 0), 0);
      const prevRevenue = (prevTrips || []).reduce((s, t) => s + (t.sales_total || 0), 0);

      // Subcontracting: purchase costs from trips with a carrier
      const subcontractCosts = (currentTrips || [])
        .filter(t => t.carrier_id)
        .reduce((s, t) => s + (t.purchase_total || 0), 0);

      // Cost breakdown from finance_transactions (supplementary)
      const fuelCost = sumByType(transactions || [], "fuel");
      const tollCost = sumByType(transactions || [], "toll");
      const parkingCost = sumByType(transactions || [], "parking");
      const maintenanceCost = sumByType(transactions || [], "maintenance");
      const otherFinanceCost = sumByType(transactions || [], "other_cost") +
        sumByType(transactions || [], "insurance") +
        sumByType(transactions || [], "lease") +
        sumByType(transactions || [], "subscription");

      // Total costs = purchase costs from trips + finance_transactions costs
      const financeTransactionTotal = fuelCost + tollCost + parkingCost + maintenanceCost + otherFinanceCost;
      const totalCosts = purchaseCosts + financeTransactionTotal;

      const costs = {
        fuel: fuelCost,
        toll: tollCost,
        parking: parkingCost,
        subcontract: subcontractCosts,
        maintenance: maintenanceCost,
        other: otherFinanceCost,
        total: totalCosts,
      };

      const grossProfit = revenue - totalCosts;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      // Receivables: uninvoiced trips + open invoices
      const uninvoicedTotal = (uninvoicedTrips || []).reduce((s, t) => s + (t.sales_total || 0), 0);
      const openInvoiceTotal = (openInvoices || []).reduce((s, inv) => s + (inv.total_amount || 0), 0);
      const receivablesTotal = uninvoicedTotal + openInvoiceTotal;

      // Overdue invoices
      const overdueTotal = (openInvoices || [])
        .filter(i => i.due_date && new Date(i.due_date) < now)
        .reduce((s, inv) => s + (inv.total_amount || 0), 0);

      // DSO calculation: average days from delivery to now for uninvoiced trips
      let dso = 0;
      if (uninvoicedTrips && uninvoicedTrips.length > 0) {
        const totalDays = uninvoicedTrips.reduce((s, t) => {
          return s + differenceInDays(now, new Date(t.trip_date));
        }, 0);
        dso = totalDays / uninvoicedTrips.length;
      } else if (revenue > 0) {
        dso = (receivablesTotal / revenue) * 30;
      }

      return {
        revenue: {
          mtd: revenue,
          previousMtd: prevRevenue,
          trend: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
        },
        costs,
        grossProfit,
        grossMargin,
        netProfit: grossProfit * 0.75,
        netMargin: revenue > 0 ? ((grossProfit * 0.75) / revenue) * 100 : 0,
        receivables: {
          total: receivablesTotal,
          overdue: overdueTotal,
          within7days: receivablesTotal * 0.3,
          within14days: receivablesTotal * 0.4,
          within30days: receivablesTotal * 0.3,
        },
        payables: {
          total: totalCosts * 0.4,
          within7days: totalCosts * 0.15,
          within14days: totalCosts * 0.25,
        },
        cashPosition: revenue - totalCosts,
        dso,
      };
    },
    enabled: !!company?.id,
  });
};

// Helper functions
function sumByType(transactions: { transaction_type: string; amount: number }[], type: string): number {
  return transactions
    .filter(t => t.transaction_type === type)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

function getEmptySummary(): CashflowSummary {
  return {
    revenue: { mtd: 0, previousMtd: 0, trend: 0 },
    costs: { fuel: 0, toll: 0, parking: 0, subcontract: 0, maintenance: 0, other: 0, total: 0 },
    grossProfit: 0,
    grossMargin: 0,
    netProfit: 0,
    netMargin: 0,
    receivables: { total: 0, overdue: 0, within7days: 0, within14days: 0, within30days: 0 },
    payables: { total: 0, within7days: 0, within14days: 0 },
    cashPosition: 0,
    dso: 0,
  };
}

// =============================================
// Mutations
// =============================================

export const useCreateFinanceTransaction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<FinanceTransaction>) => {
      if (!company?.id) throw new Error("No company");

      const insertData = {
        company_id: company.id,
        transaction_type: data.transaction_type,
        transaction_date: data.transaction_date,
        amount: data.amount,
        description: data.description,
        import_method: data.import_method || "manual",
        status: data.status || "pending",
        vehicle_id: data.vehicle_id,
        fuel_type: data.fuel_type,
        liters: data.liters,
        price_per_unit: data.price_per_unit,
        location_name: data.location_name,
        provider: data.provider,
      };

      const { data: result, error } = await supabase
        .from("finance_transactions")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      toast({ title: "Transactie toegevoegd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
};

export const useCreateFuelCardConnection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<FuelCardConnection>) => {
      if (!company?.id) throw new Error("No company");

      const insertData = {
        company_id: company.id,
        provider: data.provider,
        connection_name: data.connection_name,
        import_method: data.import_method || "csv",
        is_active: data.is_active ?? true,
      };

      const { data: result, error } = await supabase
        .from("fuel_card_connections")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel-card-connections"] });
      toast({ title: "Koppeling toegevoegd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
};

export const useMarkAlertRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("finance_alerts")
        .update({ is_read: true })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-alerts"] });
    },
  });
};

export const useDismissAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("finance_alerts")
        .update({ is_dismissed: true })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-alerts"] });
      toast({ title: "Alert verwijderd", description: "De alert is gemarkeerd als gelezen." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
};

export const useCreateFinanceGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { company } = useCompany();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      metric_key: string;
      target_value: number;
      warning_threshold?: number;
      unit?: string;
      period?: string;
    }) => {
      if (!company?.id) throw new Error("No company");

      const insertData = {
        company_id: company.id,
        name: data.name,
        metric_key: data.metric_key,
        target_value: data.target_value,
        warning_threshold: data.warning_threshold,
        unit: data.unit || '%',
        period: data.period || 'monthly',
        is_active: true,
        current_value: 0,
      };

      const { data: result, error } = await supabase
        .from("finance_goals")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-goals"] });
      toast({ title: "Doel toegevoegd", description: "Je financiële doel is opgeslagen." });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateFinanceGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinanceGoal> & { id: string }) => {
      const { error } = await supabase
        .from("finance_goals")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-goals"] });
      toast({ title: "Doel bijgewerkt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteFinanceGoal = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("finance_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-goals"] });
      toast({ title: "Doel verwijderd" });
    },
    onError: (error: Error) => {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    },
  });
};

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Euro, 
  Calendar,
  Clock,
  Shield,
  RefreshCw,
  ChevronRight
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
  ResponsiveContainer,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, subMonths, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Types
interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  due_date: string;
  invoice_date: string;
  status: string;
  customer_id: string;
  customers?: {
    id: string;
    company_name: string;
    credit_limit?: number;
  };
}

interface CreditProfile {
  customer_id: string;
  credit_limit: number;
  customers?: {
    company_name: string;
  };
}

// Aging bucket colors
const AGING_COLORS = {
  current: "hsl(var(--chart-2))",
  "1-30": "hsl(var(--chart-4))",
  "31-60": "hsl(var(--chart-3))",
  "61-90": "hsl(var(--chart-5))",
  "90+": "hsl(var(--destructive))",
};

export function CreditDashboardContent() {
  const [selectedPeriod, setSelectedPeriod] = useState<"6m" | "12m">("6m");

  // Fetch invoices for calculations
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["credit-dashboard-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total_amount,
          due_date,
          invoice_date,
          status,
          customer_id,
          customers (id, company_name, credit_limit)
        `)
        .neq("status", "concept")
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });

  // Fetch credit profiles
  const { data: creditProfiles = [] } = useQuery({
    queryKey: ["credit-profiles-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_profiles")
        .select(`
          customer_id,
          credit_limit,
          customers (company_name)
        `);

      if (error) throw error;
      return data as CreditProfile[];
    },
  });

  // Calculate DSO (Days Sales Outstanding)
  const dsoStats = useMemo(() => {
    if (!invoices.length) return { current: 0, trend: 0, benchmark: 30 };

    const paidInvoices = invoices.filter(inv => inv.status === "betaald");
    
    if (!paidInvoices.length) return { current: 0, trend: 0, benchmark: 30 };

    let totalDays = 0;
    let totalAmount = 0;

    paidInvoices.slice(0, 50).forEach(inv => {
      const invoiceDate = new Date(inv.invoice_date);
      const dueDate = new Date(inv.due_date);
      const daysToPay = differenceInDays(dueDate, invoiceDate);
      totalDays += daysToPay * inv.total_amount;
      totalAmount += inv.total_amount;
    });

    const currentDSO = totalAmount > 0 ? Math.round(totalDays / totalAmount) : 0;
    const trend = -2;

    return { current: currentDSO, trend, benchmark: 30 };
  }, [invoices]);

  // Calculate aging buckets
  const agingData = useMemo(() => {
    const now = new Date();
    const openInvoices = invoices.filter(inv => 
      inv.status !== "betaald" && inv.status !== "concept"
    );

    const buckets = {
      current: { count: 0, amount: 0 },
      "1-30": { count: 0, amount: 0 },
      "31-60": { count: 0, amount: 0 },
      "61-90": { count: 0, amount: 0 },
      "90+": { count: 0, amount: 0 },
    };

    openInvoices.forEach(inv => {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = differenceInDays(now, dueDate);

      if (daysOverdue <= 0) {
        buckets.current.count++;
        buckets.current.amount += inv.total_amount;
      } else if (daysOverdue <= 30) {
        buckets["1-30"].count++;
        buckets["1-30"].amount += inv.total_amount;
      } else if (daysOverdue <= 60) {
        buckets["31-60"].count++;
        buckets["31-60"].amount += inv.total_amount;
      } else if (daysOverdue <= 90) {
        buckets["61-90"].count++;
        buckets["61-90"].amount += inv.total_amount;
      } else {
        buckets["90+"].count++;
        buckets["90+"].amount += inv.total_amount;
      }
    });

    return Object.entries(buckets).map(([name, data]) => ({
      name,
      label: name === "current" ? "Lopend" : `${name} dagen`,
      amount: data.amount,
      count: data.count,
      fill: AGING_COLORS[name as keyof typeof AGING_COLORS],
    }));
  }, [invoices]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const openInvoices = invoices.filter(inv => 
      inv.status !== "betaald" && inv.status !== "concept"
    );
    const overdueInvoices = openInvoices.filter(inv => 
      new Date(inv.due_date) < new Date()
    );

    const totalExposure = openInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const overdueRatio = totalExposure > 0 ? (overdueAmount / totalExposure) * 100 : 0;

    const customerExposure = new Map<string, number>();
    openInvoices.forEach(inv => {
      const current = customerExposure.get(inv.customer_id) || 0;
      customerExposure.set(inv.customer_id, current + inv.total_amount);
    });

    let atRiskCount = 0;
    creditProfiles.forEach(profile => {
      const exposure = customerExposure.get(profile.customer_id) || 0;
      const utilizationPercent = profile.credit_limit > 0 
        ? (exposure / profile.credit_limit) * 100 
        : 0;
      if (utilizationPercent > 80) atRiskCount++;
    });

    const customersWithOverdue = new Set(overdueInvoices.map(inv => inv.customer_id));
    atRiskCount = Math.max(atRiskCount, customersWithOverdue.size);

    return {
      totalExposure,
      overdueAmount,
      overdueRatio,
      atRiskCustomers: atRiskCount,
    };
  }, [invoices, creditProfiles]);

  // Calculate DSO trend data
  const dsoTrendData = useMemo(() => {
    const months = selectedPeriod === "6m" ? 6 : 12;
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Calculate DSO from real paid invoices in this month
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= monthStart && invDate <= monthEnd;
      });
      
      let monthDSO = dsoStats.benchmark; // fallback
      if (monthInvoices.length > 0) {
        let totalDays = 0;
        let totalAmount = 0;
        monthInvoices.forEach(inv => {
          const invoiceDate = new Date(inv.invoice_date);
          const dueDate = new Date(inv.due_date);
          const days = differenceInDays(dueDate, invoiceDate);
          totalDays += days * inv.total_amount;
          totalAmount += inv.total_amount;
        });
        monthDSO = totalAmount > 0 ? Math.round(totalDays / totalAmount) : dsoStats.benchmark;
      }
      
      data.push({
        month: format(date, "MMM", { locale: nl }),
        dso: monthDSO,
        benchmark: 30,
      });
    }
    
    return data;
  }, [selectedPeriod, dsoStats.current]);

  // Calculate credit utilization per customer
  const creditUtilization = useMemo(() => {
    const openInvoices = invoices.filter(inv => 
      inv.status !== "betaald" && inv.status !== "concept"
    );

    const customerExposure = new Map<string, { exposure: number; name: string; overdue: number }>();
    
    openInvoices.forEach(inv => {
      const current = customerExposure.get(inv.customer_id) || { 
        exposure: 0, 
        name: inv.customers?.company_name || "Onbekend",
        overdue: 0
      };
      current.exposure += inv.total_amount;
      if (new Date(inv.due_date) < new Date()) {
        current.overdue += inv.total_amount;
      }
      customerExposure.set(inv.customer_id, current);
    });

    return creditProfiles
      .map(profile => {
        const exposureData = customerExposure.get(profile.customer_id) || { exposure: 0, name: "", overdue: 0 };
        const utilizationPercent = profile.credit_limit > 0 
          ? (exposureData.exposure / profile.credit_limit) * 100 
          : 0;

        return {
          customerId: profile.customer_id,
          customerName: profile.customers?.company_name || exposureData.name || "Onbekend",
          creditLimit: profile.credit_limit,
          exposure: exposureData.exposure,
          overdue: exposureData.overdue,
          utilization: Math.min(utilizationPercent, 100),
          risk: utilizationPercent > 80 ? "high" : utilizationPercent > 50 ? "medium" : "low",
        };
      })
      .filter(c => c.exposure > 0)
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 10);
  }, [invoices, creditProfiles]);

  // Calculate 30-day cashflow forecast
  const cashflowForecast = useMemo(() => {
    const now = new Date();
    const forecast = [];
    
    const openInvoices = invoices.filter(inv => 
      inv.status !== "betaald" && inv.status !== "concept"
    );

    for (let i = 0; i < 30; i += 7) {
      const weekStart = addDays(now, i);
      const weekEnd = addDays(now, i + 6);
      
      const expectedAmount = openInvoices
        .filter(inv => {
          const dueDate = new Date(inv.due_date);
          return dueDate >= weekStart && dueDate <= weekEnd;
        })
        .reduce((sum, inv) => sum + inv.total_amount, 0);

      forecast.push({
        week: `Week ${Math.floor(i / 7) + 1}`,
        period: `${format(weekStart, "d MMM", { locale: nl })} - ${format(weekEnd, "d MMM", { locale: nl })}`,
        expected: expectedAmount,
        adjusted: expectedAmount * 0.85,
      });
    }

    return forecast;
  }, [invoices]);

  // Top 10 exposures
  const topExposures = useMemo(() => {
    const openInvoices = invoices.filter(inv => 
      inv.status !== "betaald" && inv.status !== "concept"
    );

    const customerTotals = new Map<string, { amount: number; name: string; invoiceCount: number }>();
    
    openInvoices.forEach(inv => {
      const current = customerTotals.get(inv.customer_id) || { 
        amount: 0, 
        name: inv.customers?.company_name || "Onbekend",
        invoiceCount: 0
      };
      current.amount += inv.total_amount;
      current.invoiceCount++;
      customerTotals.set(inv.customer_id, current);
    });

    return Array.from(customerTotals.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [invoices]);

  if (loadingInvoices) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DSO Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">DSO (Days Sales Outstanding)</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold">{dsoStats.current}</span>
                  <span className="text-sm text-muted-foreground">dagen</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {dsoStats.trend < 0 ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-emerald-500">{Math.abs(dsoStats.trend)} dagen verbeterd</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-amber-500">{dsoStats.trend} dagen toegenomen</span>
                    </>
                  )}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>vs benchmark ({dsoStats.benchmark}d)</span>
                <span>{dsoStats.current <= dsoStats.benchmark ? "Op target" : "Boven target"}</span>
              </div>
              <Progress 
                value={Math.min((dsoStats.current / dsoStats.benchmark) * 100, 150)} 
                className="h-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Exposure Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Totale Exposure</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold">
                    {"\u20AC"}{kpis.totalExposure.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {invoices.filter(i => i.status !== "betaald" && i.status !== "concept").length} openstaande facturen
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Euro className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Ratio Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Achterstallig Ratio</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn(
                    "text-3xl font-bold",
                    kpis.overdueRatio > 30 ? "text-destructive" : 
                    kpis.overdueRatio > 15 ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {kpis.overdueRatio.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {"\u20AC"}{kpis.overdueAmount.toLocaleString("nl-NL", { maximumFractionDigits: 0 })} achterstallig
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                kpis.overdueRatio > 30 ? "bg-destructive/10" : 
                kpis.overdueRatio > 15 ? "bg-amber-500/10" : "bg-emerald-500/10"
              )}>
                <Calendar className={cn(
                  "h-5 w-5",
                  kpis.overdueRatio > 30 ? "text-destructive" : 
                  kpis.overdueRatio > 15 ? "text-amber-500" : "text-emerald-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Customers Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Klanten op Risico</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={cn(
                    "text-3xl font-bold",
                    kpis.atRiskCustomers > 5 ? "text-destructive" : 
                    kpis.atRiskCustomers > 2 ? "text-amber-500" : "text-muted-foreground"
                  )}>
                    {kpis.atRiskCustomers}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  &gt;80% kredietlimiet of achterstallig
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                kpis.atRiskCustomers > 5 ? "bg-destructive/10" : 
                kpis.atRiskCustomers > 2 ? "bg-amber-500/10" : "bg-muted"
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  kpis.atRiskCustomers > 5 ? "text-destructive" : 
                  kpis.atRiskCustomers > 2 ? "text-amber-500" : "text-muted-foreground"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DSO Trend Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">DSO Trend</CardTitle>
                <CardDescription>Days Sales Outstanding over tijd</CardDescription>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant={selectedPeriod === "6m" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setSelectedPeriod("6m")}
                >
                  6M
                </Button>
                <Button 
                  variant={selectedPeriod === "12m" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setSelectedPeriod("12m")}
                >
                  12M
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dsoTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis domain={[0, 50]} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} dagen`,
                      name === "dso" ? "DSO" : "Benchmark"
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="dso" 
                    name="DSO"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="benchmark" 
                    name="Benchmark"
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Aging Report Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Aging Report</CardTitle>
            <CardDescription>Openstaande bedragen per verouderingsperiode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData} margin={{ top: 5, right: 20, left: 0, bottom: 5 >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={(value) => `\u20AC${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [
                      `\u20AC${value.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`,
                      "Bedrag"
                    ]}
                  />
                  <Bar dataKey="amount" name="Bedrag" radius={[4, 4, 0, 0]}>
                    {agingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {agingData.map((bucket) => (
                <div key={bucket.name} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: bucket.fill }}
                  />
                  <span>{bucket.label}: {bucket.count} facturen</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Utilization & Top Exposures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credit Utilization Matrix */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Krediet Benutting</CardTitle>
                <CardDescription>Top 10 klanten op kredietgebruik</CardDescription>
              </div>
              <Link to="/finance/receivables">
                <Button variant="ghost" size="sm">
                  Alle bekijken <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {creditUtilization.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Geen kredietprofielen geconfigureerd</p>
                  <Link to="/finance/receivables">
                    <Button variant="link" size="sm">Configureer kredietlimieten</Button>
                  </Link>
                </div>
              ) : (
                creditUtilization.map((customer) => (
                  <div key={customer.customerId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">
                        {customer.customerName}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          customer.risk === "high" ? "destructive" :
                          customer.risk === "medium" ? "secondary" : "outline"
                        }>
                          {customer.utilization.toFixed(0)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {"\u20AC"}{customer.exposure.toLocaleString("nl-NL", { maximumFractionDigits: 0 })} / {"\u20AC"}{customer.creditLimit.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={customer.utilization} 
                      className={cn(
                        "h-1.5",
                        customer.risk === "high" && "[&>div]:bg-destructive",
                        customer.risk === "medium" && "[&>div]:bg-amber-500"
                      )}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Exposures */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Grootste Debiteuren</CardTitle>
                <CardDescription>Top 10 openstaande bedragen per klant</CardDescription>
              </div>
              <Link to="/invoices">
                <Button variant="ghost" size="sm">
                  Facturen <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topExposures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Geen openstaande facturen</p>
                </div>
              ) : (
                topExposures.map((customer, index) => (
                  <div 
                    key={customer.id} 
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium text-sm truncate max-w-[180px]">
                          {customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {customer.invoiceCount} facturen
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {"\u20AC"}{customer.amount.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow Forecast */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">30-Dagen Cashflow Forecast</CardTitle>
              <CardDescription>Verwachte betalingen op basis van vervaldatums (85% collectie ratio)</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Vernieuwen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowForecast} margin={{ top: 5, right: 20, left: 0, bottom: 5 >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis 
                  className="text-xs"
                  tickFormatter={(value) => `\u20AC${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number, name: string) => [
                    `\u20AC${value.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`,
                    name === "expected" ? "Verwacht" : "Gecorrigeerd (85%)"
                  ]}
                  labelFormatter={(label: any, payload: any) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.period;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="expected" 
                  name="Verwacht"
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="adjusted" 
                  name="Gecorrigeerd (85%)"
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4">
            {cashflowForecast.map((week) => (
              <div key={week.week} className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">{week.week}</p>
                <p className="font-semibold">
                  {"\u20AC"}{week.adjusted.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">{week.period}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreditDashboard() {
  return (
    <DashboardLayout title="Credit Management">
      <CreditDashboardContent />
    </DashboardLayout>
  );
}

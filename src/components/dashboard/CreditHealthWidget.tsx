import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  Euro
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CreditHealthWidgetProps {
  className?: string;
}

export function CreditHealthWidget({ className }: CreditHealthWidgetProps) {
  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["credit-health-widget-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          total_amount,
          due_date,
          invoice_date,
          status,
          customer_id
        `)
        .neq("status", "concept")
        .neq("status", "betaald");

      if (error) throw error;
      return data;
    },
  });

  // Fetch credit profiles
  const { data: creditProfiles = [] } = useQuery({
    queryKey: ["credit-health-widget-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_profiles")
        .select("customer_id, credit_limit");

      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = new Date();
    
    // Calculate DSO (simplified)
    let dso = 0;
    if (invoices.length > 0) {
      let totalDays = 0;
      let totalAmount = 0;
      invoices.forEach(inv => {
        const invoiceDate = new Date(inv.invoice_date);
        const dueDate = new Date(inv.due_date);
        const daysToPay = differenceInDays(dueDate, invoiceDate);
        totalDays += daysToPay * inv.total_amount;
        totalAmount += inv.total_amount;
      });
      dso = totalAmount > 0 ? Math.round(totalDays / totalAmount) : 0;
    }

    // Calculate overdue
    const overdueInvoices = invoices.filter(inv => new Date(inv.due_date) < now);
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalExposure = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const overdueRatio = totalExposure > 0 ? (overdueAmount / totalExposure) * 100 : 0;

    // Calculate at-risk customers
    const customerExposure = new Map<string, number>();
    invoices.forEach(inv => {
      if (!inv.customer_id) return;
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

    // Add overdue customers
    const customersWithOverdue = new Set(overdueInvoices.map(inv => inv.customer_id).filter((id): id is string => id !== null));
    atRiskCount = Math.max(atRiskCount, customersWithOverdue.size);

    return {
      dso,
      dsoBenchmark: 30,
      dsoTrend: -2, // Placeholder
      overdueAmount,
      overdueRatio,
      atRiskCustomers: atRiskCount,
      totalExposure,
    };
  }, [invoices, creditProfiles]);

  if (isLoading) {
    return (
      <Card className={cn("glass-card h-full", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Credit Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass-card h-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Credit Health
          </CardTitle>
          <Link to="/finance/receivables">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Dashboard <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* DSO Metric */}
        <div className="p-3 rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">DSO</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{metrics.dso}</span>
              <span className="text-xs text-muted-foreground">dagen</span>
              {metrics.dsoTrend < 0 ? (
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
          <Progress 
            value={Math.min((metrics.dso / metrics.dsoBenchmark) * 100, 150)} 
            className="h-1.5"
          />
          <p className="text-xs text-muted-foreground">
            Benchmark: {metrics.dsoBenchmark} dagen
          </p>
        </div>

        {/* Overdue Amount */}
        <div className="p-3 rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Achterstallig</span>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-xl font-bold",
                metrics.overdueRatio > 30 ? "text-destructive" : 
                metrics.overdueRatio > 15 ? "text-amber-500" : "text-emerald-500"
              )}>
                €{metrics.overdueAmount.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.overdueRatio.toFixed(1)}% van exposure
              </p>
            </div>
          </div>
        </div>

        {/* At-Risk Customers */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-4 w-4",
                metrics.atRiskCustomers > 5 ? "text-destructive" : 
                metrics.atRiskCustomers > 2 ? "text-amber-500" : "text-muted-foreground"
              )} />
              <span className="text-sm font-medium">Klanten op Risico</span>
            </div>
            <Badge variant={
              metrics.atRiskCustomers > 5 ? "destructive" : 
              metrics.atRiskCustomers > 2 ? "warning" : "outline"
            }>
              {metrics.atRiskCustomers} klanten
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            &gt;80% kredietlimiet of achterstallig
          </p>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-border/50">
          <Link to="/finance/receivables">
            <Button variant="outline" size="sm" className="w-full">
              Bekijk Incasso Cases
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default CreditHealthWidget;

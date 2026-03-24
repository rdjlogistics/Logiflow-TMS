import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Target, AlertTriangle, TrendingUp, TrendingDown, CheckCircle, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SLAMonitor = () => {
  const { user } = useAuth();

  const { data: customerStats = [], isLoading } = useQuery({
    queryKey: ["sla-monitor", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      // Get customers with their trip stats
      const { data: customers } = await supabase
        .from("customers")
        .select("id, company_name")
        .eq("tenant_id", companyId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .limit(20);

      if (!customers?.length) return [];

      // Get trip stats per customer (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = [];
      for (const cust of customers) {
        const { data: trips } = await supabase
          .from("trips")
          .select("id, status, trip_date")
          .eq("company_id", companyId)
          .eq("customer_id", cust.id)
          .gte("trip_date", thirtyDaysAgo.toISOString().split("T")[0])
          .is("deleted_at", null);

        if (!trips?.length) continue;

        const total = trips.length;
        const delivered = trips.filter(t => ["afgeleverd", "afgerond", "gecontroleerd", "gefactureerd"].includes(t.status)).length;
        const otif = total > 0 ? (delivered / total) * 100 : 0;
        const target = 95; // Default SLA target

        stats.push({
          name: cust.company_name,
          otif: Math.round(otif * 10) / 10,
          orders: total,
          delivered,
          breaches: Math.max(0, Math.round((total * (100 - otif)) / 100)),
          target,
          trend: otif >= target ? "up" as const : "down" as const,
        });
      }

      return stats.sort((a, b) => b.orders - a.orders);
    },
    enabled: !!user,
  });

  const avgOtif = customerStats.length > 0
    ? customerStats.reduce((sum, c) => sum + c.otif, 0) / customerStats.length
    : 0;
  const totalBreaches = customerStats.reduce((sum, c) => sum + c.breaches, 0);
  const onTarget = customerStats.filter(c => c.otif >= c.target).length;
  const atRisk = customerStats.filter(c => c.otif < c.target).length;

  const handleExport = () => {
    const csv = `Klant,OTIF %,Orders,Afgeleverd,Breaches,Target %\n${customerStats
      .map(c => `${c.name},${c.otif},${c.orders},${c.delivered},${c.breaches},${c.target}`)
      .join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sla-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Rapport gedownload ✓" });
  };

  return (
    <DashboardLayout title="SLA Monitor">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Gem. OTIF</p><p className="text-2xl font-bold">{avgOtif.toFixed(1)}%</p></div><Target className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">SLA Breaches</p><p className="text-2xl font-bold text-destructive">{totalBreaches}</p></div><AlertTriangle className="h-8 w-8 text-destructive" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Op Target</p><p className="text-2xl font-bold">{onTarget}/{customerStats.length}</p></div><CheckCircle className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Risico klanten</p><p className="text-2xl font-bold text-amber-600">{atRisk}</p></div><TrendingDown className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>SLA Performance per Klant</CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={customerStats.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Export Rapport
              </Button>
            </div>
            <CardDescription>OTIF monitoring berekend op basis van orders (laatste 30 dagen)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : customerStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Geen SLA data beschikbaar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerStats.map((customer) => (
                  <div key={customer.name} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${customer.otif < customer.target ? "border-destructive/30" : ""}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{customer.name}</span>
                          {customer.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                          {customer.trend === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                          {customer.breaches > 0 && <Badge variant="destructive">{customer.breaches} breach(es)</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{customer.orders} orders • Target: {customer.target}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">OTIF</p>
                        <p className={`text-lg font-bold ${customer.otif >= customer.target ? "text-emerald-600" : "text-destructive"}`}>
                          {customer.otif}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Afgeleverd</p>
                        <p className="text-lg font-medium">{customer.delivered}/{customer.orders}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SLAMonitor;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettlementApprovalDialog } from "@/components/enterprise/SettlementApprovalDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileSpreadsheet, AlertTriangle, Package, BadgeCheck, Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { nl } from "date-fns/locale";

interface Settlement {
  carrierId: string;
  carrierName: string;
  period: string;
  orders: number;
  grossAmount: number;
  netAmount: number;
  status: string;
}

const FreightSettlements = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [approvalSettlement, setApprovalSettlement] = useState<any>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ["freight-settlements", user?.id, selectedPeriod],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const now = new Date();
      const periodStart = selectedPeriod === "current"
        ? startOfMonth(now)
        : startOfMonth(subMonths(now, 1));
      const periodEnd = selectedPeriod === "current"
        ? endOfMonth(now)
        : endOfMonth(subMonths(now, 1));

      // Get purchase invoices grouped by carrier
      const { data: invoices } = await supabase
        .from("purchase_invoices")
        .select("id, carrier_id, subtotal, total_amount, status, carriers(company_name)")
        .eq("company_id", companyId)
        .gte("invoice_date", format(periodStart, "yyyy-MM-dd"))
        .lte("invoice_date", format(periodEnd, "yyyy-MM-dd"))
        .order("created_at", { ascending: false });

      if (!invoices?.length) return [];

      // Group by carrier
      const byCarrier = new Map<string, Settlement>();
      for (const inv of invoices) {
        const key = inv.carrier_id ?? "unknown";
        const existing = byCarrier.get(key);
        if (existing) {
          existing.orders++;
          existing.grossAmount += inv.subtotal ?? 0;
          existing.netAmount += inv.total_amount ?? 0;
        } else {
          byCarrier.set(key, {
            carrierId: key,
            carrierName: (inv.carriers as any)?.company_name ?? "Onbekend",
            period: format(periodStart, "yyyy-MM"),
            orders: 1,
            grossAmount: inv.subtotal ?? 0,
            netAmount: inv.total_amount ?? 0,
            status: inv.status ?? "concept",
          });
        }
      }

      return Array.from(byCarrier.values());
    },
    enabled: !!user,
  });

  const totals = settlements.reduce(
    (acc, s) => ({ gross: acc.gross + s.grossAmount, net: acc.net + s.netAmount, orders: acc.orders + s.orders }),
    { gross: 0, net: 0, orders: 0 }
  );
  const deductions = totals.gross - totals.net;

  const handleExport = () => {
    const csv = `Charter,Periode,Orders,Bruto,Netto,Status\n${settlements
      .map((s) => `${s.carrierName},${s.period},${s.orders},€${s.grossAmount.toFixed(2)},€${s.netAmount.toFixed(2)},${s.status}`)
      .join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settlements-${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export voltooid ✓" });
  };

  return (
    <DashboardLayout title="Settlement Statements">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Totaal orders</p><p className="text-2xl font-bold">{totals.orders}</p></div><Package className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Bruto bedrag</p><p className="text-2xl font-bold">€{totals.gross.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p></div><FileSpreadsheet className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">BTW/Aftrek</p><p className="text-2xl font-bold text-rose-600">€{Math.abs(deductions).toFixed(2)}</p></div><AlertTriangle className="h-8 w-8 text-rose-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Netto te betalen</p><p className="text-2xl font-bold text-emerald-600">€{totals.net.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</p></div><BadgeCheck className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-rose-500" />
                <CardTitle>Settlement Statements</CardTitle>
              </div>
              <div className="flex gap-2">
                <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="px-3 py-1 border rounded-md text-sm bg-background">
                  <option value="current">Deze maand</option>
                  <option value="previous">Vorige maand</option>
                </select>
                <Button size="sm" variant="outline" onClick={handleExport} disabled={settlements.length === 0}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </div>
            <CardDescription>Periodieke afrekeningen per charter</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : settlements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Geen settlements voor deze periode</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((s) => (
                  <div key={s.carrierId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => {
                    setApprovalSettlement({
                      id: `SET-${s.period}-${s.carrierId.slice(0, 4)}`,
                      carrier: s.carrierName,
                      period: s.period,
                      orders: s.orders,
                      grossAmount: s.grossAmount,
                      deductions: s.grossAmount - s.netAmount,
                      netAmount: s.netAmount,
                      status: s.status === "concept" ? "pending" : s.status,
                      dueDate: "30 dagen na goedkeuring",
                    });
                    setApprovalOpen(true);
                  }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{s.carrierName}</span>
                        <Badge variant="outline">{s.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Periode: {s.period} • {s.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Bruto: €{s.grossAmount.toFixed(2)}</p>
                      <p className="font-semibold text-emerald-600">Netto: €{s.netAmount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SettlementApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        settlement={approvalSettlement}
        onApprove={async (settlement) => {
          const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
          if (!companyId || !settlement) return;
          const carrierId = settlements.find(s => s.carrierName === settlement.carrier)?.carrierId;
          if (carrierId) {
            await supabase
              .from("purchase_invoices")
              .update({ status: "approved" })
              .eq("company_id", companyId)
              .eq("carrier_id", carrierId);
          }
          toast({ title: "Settlement goedgekeurd ✓", description: `${settlement.carrier} is goedgekeurd voor betaling.` });
        }}
      />
    </DashboardLayout>
  );
};

export default FreightSettlements;

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Scale, Landmark, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Period = "month" | "quarter" | "year";
const eur = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n || 0);

const periodStart = (p: Period) => {
  const d = new Date();
  if (p === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
  if (p === "quarter") return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  return new Date(d.getFullYear(), 0, 1);
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

const useCompanyId = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["accounting-company", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_companies").select("company_id").eq("user_id", user!.id).eq("is_primary", true).maybeSingle();
      return data?.company_id ?? null;
    },
  });
};

export default function Accounting() {
  const [period, setPeriod] = useState<Period>("month");
  const from = useMemo(() => iso(periodStart(period)), [period]);
  const { data: companyId } = useCompanyId();

  const { data, isLoading } = useQuery({
    queryKey: ["accounting", companyId, from],
    enabled: !!companyId,
    queryFn: async () => {
      const [inv, ftx, pinv, bank, runs] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, invoice_date, subtotal, vat_amount, total_amount, amount_paid, status").eq("company_id", companyId!).gte("invoice_date", from),
        supabase.from("finance_transactions").select("id, transaction_type, status, transaction_date, description, amount, vat_amount, trip_id").eq("company_id", companyId!).gte("transaction_date", from).order("transaction_date", { ascending: false }).limit(500),
        supabase.from("purchase_invoices").select("id, total_amount, vat_amount, invoice_date, status").eq("company_id", companyId!).gte("invoice_date", from),
        supabase.from("bank_transactions").select("amount, is_matched").eq("company_id", companyId!),
        supabase.from("workflow_automations").select("id, name, is_active, run_count, last_run_at").eq("tenant_id", companyId!).eq("trigger_type", "system_accounting"),
      ]);
      return { inv: inv.data ?? [], ftx: ftx.data ?? [], pinv: pinv.data ?? [], bank: bank.data ?? [], runs: runs.data ?? [] };
    },
  });

  const totals = useMemo(() => {
    if (!data) return null;
    const invoiced = data.inv.filter((i) => i.status !== "concept").reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
    const draft = data.inv.filter((i) => i.status === "concept").reduce((s, i) => s + Number(i.subtotal ?? 0), 0);
    const received = data.inv.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
    const outstanding = data.inv.filter((i) => i.status !== "concept").reduce((s, i) => s + Math.max(Number(i.total_amount ?? 0) - Number(i.amount_paid ?? 0), 0), 0);
    const costs = data.ftx.filter((t) => t.transaction_type !== "revenue" && t.status !== "rejected").reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const purchase = data.pinv.reduce((s, p) => s + Number(p.total_amount ?? 0) - Number(p.vat_amount ?? 0), 0);
    const expenses = costs + purchase;
    const income = invoiced;
    const vatOut = data.inv.filter((i) => i.status !== "concept").reduce((s, i) => s + Number(i.vat_amount ?? 0), 0);
    const vatIn = data.ftx.filter((t) => t.transaction_type !== "revenue").reduce((s, t) => s + Number(t.vat_amount ?? 0), 0) + data.pinv.reduce((s, p) => s + Number(p.vat_amount ?? 0), 0);
    const bankBalance = data.bank.reduce((s, b) => s + Number(b.amount ?? 0), 0);
    const unmatched = data.bank.filter((b) => !b.is_matched && Number(b.amount) > 0).length;
    return { invoiced, draft, received, outstanding, expenses, income, result: income - expenses, vatDue: vatOut - vatIn, bankBalance, unmatched };
  }, [data]);

  const kpis = totals ? [
    { label: "Inkomsten (gefactureerd)", value: totals.income, sub: `${eur(totals.draft)} in concept`, icon: TrendingUp },
    { label: "Uitgaven", value: totals.expenses, sub: "Kosten + inkoopfacturen, excl. btw", icon: TrendingDown },
    { label: "Resultaat", value: totals.result, sub: `Af te dragen btw: ${eur(totals.vatDue)}`, icon: Scale },
    { label: "Banksaldo (geïmporteerd)", value: totals.bankBalance, sub: `${totals.unmatched} onverwerkte betalingen`, icon: Landmark },
  ] : [];

  return (
    <DashboardLayout title="Boekhouding" description="Inkomsten, uitgaven en balans — automatisch bijgehouden vanuit je orders">
      <div className="space-y-6">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="month">Deze maand</TabsTrigger>
            <TabsTrigger value="quarter">Dit kwartaal</TabsTrigger>
            <TabsTrigger value="year">Dit jaar</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading || !totals ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map((k) => (
                <Card key={k.label}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{k.label}</span><k.icon className="h-4 w-4" /></div>
                    <div className={`mt-2 text-2xl font-semibold tabular-nums ${k.value < 0 ? "text-destructive" : ""}`}>{eur(k.value)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Balans debiteuren</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Gefactureerd (excl. btw)</span><span className="tabular-nums">{eur(totals.invoiced)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ontvangen op de bank</span><span className="tabular-nums">{eur(totals.received)}</span></div>
                  <div className="flex justify-between font-medium border-t border-border/50 pt-2"><span>Nog te ontvangen (incl. btw)</span><span className="tabular-nums">{eur(totals.outstanding)}</span></div>
                  <Link to="/finance/receivables" className="text-xs text-primary">Naar debiteuren →</Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" />Automatische boekingen</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {data!.runs.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <div>
                        <div>{r.name.replace("Boekhouding: ", "")}</div>
                        <div className="text-xs text-muted-foreground">{r.run_count ?? 0}× uitgevoerd{r.last_run_at ? ` · laatst ${new Date(r.last_run_at).toLocaleString("nl-NL")}` : ""}</div>
                      </div>
                      <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Aan" : "Uit"}</Badge>
                    </div>
                  ))}
                  <Link to="/admin/workflows" className="text-xs text-primary">Beheren →</Link>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Laatste boekingen</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Omschrijving</TableHead><TableHead>Soort</TableHead><TableHead className="text-right">Bedrag</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data!.ftx.slice(0, 25).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">{new Date(t.transaction_date).toLocaleDateString("nl-NL")}</TableCell>
                        <TableCell className="max-w-[320px] truncate">{t.description}</TableCell>
                        <TableCell><Badge variant={t.transaction_type === "revenue" ? "default" : "secondary"}>{t.transaction_type === "revenue" ? (t.status === "approved" ? "Omzet" : t.status === "rejected" ? "Vervallen" : "Verwacht") : "Kosten"}</Badge></TableCell>
                        <TableCell className={`text-right tabular-nums ${t.transaction_type === "revenue" ? "" : "text-destructive"}`}>{t.transaction_type === "revenue" ? "" : "−"}{eur(Number(t.amount))}</TableCell>
                      </TableRow>
                    ))}
                    {data!.ftx.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nog geen boekingen in deze periode</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

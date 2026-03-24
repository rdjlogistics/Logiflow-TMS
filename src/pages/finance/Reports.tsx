import { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useExport } from "@/hooks/useExport";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator, FileText, FileSpreadsheet, Download, Loader2, TrendingUp, Receipt,
} from "lucide-react";
import { format, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";
import { nl } from "date-fns/locale";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v);

const Reports = () => {
  const { company } = useCompany();
  const { exportToCSV } = useExport();
  const { toast } = useToast();

  // Fetch invoices for BTW calculation
  const { data: salesInvoices = [], isLoading: loadingSales } = useQuery({
    queryKey: ["btw-sales-invoices", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, subtotal, vat_amount, total_amount, status")
        .eq("company_id", company.id)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Fetch purchase invoices for BTW
  const { data: purchaseInvoices = [], isLoading: loadingPurchase } = useQuery({
    queryKey: ["btw-purchase-invoices", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select("id, invoice_number, invoice_date, subtotal, vat_amount, total_amount, status")
        .eq("company_id", company.id)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const isLoading = loadingSales || loadingPurchase;

  // Calculate quarterly BTW data from real invoices
  const quarterlyVAT = useMemo(() => {
    const now = new Date();
    const quarters = [];

    for (let i = 0; i < 4; i++) {
      const qStart = startOfQuarter(subQuarters(now, i));
      const qEnd = endOfQuarter(subQuarters(now, i));
      const qLabel = `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear()}`;

      const salesVAT = salesInvoices
        .filter((inv) => {
          const d = new Date(inv.invoice_date);
          return d >= qStart && d <= qEnd;
        })
        .reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);

      const purchaseVAT = purchaseInvoices
        .filter((inv) => {
          const d = new Date(inv.invoice_date);
          return d >= qStart && d <= qEnd;
        })
        .reduce((sum, inv) => sum + (inv.vat_amount || 0), 0);

      const balance = salesVAT - purchaseVAT;
      const isPaid = i > 0; // Current quarter is open, previous quarters assumed paid

      quarters.push({
        period: qLabel,
        salesVat: salesVAT,
        purchaseVat: purchaseVAT,
        balance,
        status: i === 0 ? "open" : "betaald",
      });
    }

    return quarters;
  }, [salesInvoices, purchaseInvoices]);

  // Revenue summary by month (last 6 months)
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = format(monthStart, "MMM yyyy", { locale: nl });

      const salesTotal = salesInvoices
        .filter((inv) => {
          const d = new Date(inv.invoice_date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      const salesCount = salesInvoices.filter((inv) => {
        const d = new Date(inv.invoice_date);
        return d >= monthStart && d <= monthEnd;
      }).length;

      months.push({ month: label, revenue: salesTotal, invoiceCount: salesCount });
    }

    return months;
  }, [salesInvoices]);

  const handleExportVAT = () => {
    exportToCSV({
      filename: "btw-overzicht",
      columns: [
        { key: "period", header: "Periode" },
        { key: "salesVat", header: "Verkoop BTW", format: (v) => Number(v).toFixed(2) },
        { key: "purchaseVat", header: "Inkoop BTW", format: (v) => Number(v).toFixed(2) },
        { key: "balance", header: "Te betalen", format: (v) => Number(v).toFixed(2) },
        { key: "status", header: "Status" },
      ],
      data: quarterlyVAT as unknown as Record<string, unknown>[],
    });
    toast({ title: "Geëxporteerd", description: "BTW overzicht gedownload als CSV" });
  };

  const handleExportRevenue = () => {
    exportToCSV({
      filename: "omzet-per-maand",
      columns: [
        { key: "month", header: "Maand" },
        { key: "revenue", header: "Omzet", format: (v) => Number(v).toFixed(2) },
        { key: "invoiceCount", header: "Facturen" },
      ],
      data: monthlySummary as unknown as Record<string, unknown>[],
    });
    toast({ title: "Geëxporteerd", description: "Omzetrapportage gedownload als CSV" });
  };

  return (
    <DashboardLayout title="BTW & Rapportages" description="BTW overzichten en exports voor boekhouder">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* BTW Overview */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <CardTitle>BTW Overzicht</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportVAT}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Verkoop BTW</TableHead>
                    <TableHead className="text-right">Inkoop BTW</TableHead>
                    <TableHead className="text-right">Te betalen</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quarterlyVAT.length === 0 ? (
                    <TableEmpty colSpan={5} title="Geen factuurgegevens gevonden" />
                  ) : (
                    quarterlyVAT.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{q.period}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(q.salesVat)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCurrency(q.purchaseVat)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(q.balance)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.status === "betaald" ? "outline" : "default"}>
                            {q.status === "betaald" ? "Betaald" : "Open"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Monthly Revenue Report */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Omzet per Maand</CardTitle>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportRevenue}>
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlySummary.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium capitalize">{m.month}</p>
                        <p className="text-sm text-muted-foreground">
                          {m.invoiceCount} facturen
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold tabular-nums">
                      {formatCurrency(m.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Totals */}
          <Card variant="glass" className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <CardTitle>Facturatieoverzicht</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Verkoopfacturen</p>
                  <p className="text-2xl font-bold tabular-nums">{salesInvoices.length}</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Verkoop totaal</p>
                  <p className="text-2xl font-bold tabular-nums text-success">
                    {formatCurrency(salesInvoices.reduce((s, i) => s + (i.total_amount || 0), 0))}
                  </p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Inkoopfacturen</p>
                  <p className="text-2xl font-bold tabular-nums">{purchaseInvoices.length}</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Inkoop totaal</p>
                  <p className="text-2xl font-bold tabular-nums text-destructive">
                    {formatCurrency(purchaseInvoices.reduce((s, i) => s + (i.total_amount || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Reports;

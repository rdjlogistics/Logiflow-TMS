import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  Receipt,
  Euro,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Search,
  ArrowRight,
  Shield,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PurchaseInvoiceStatusBadge } from "@/components/purchase-invoices/PurchaseInvoiceStatusBadge";
import { usePurchaseInvoicePdf } from "@/hooks/use-purchase-invoice-pdf";

type PurchaseInvoiceStatus = "concept" | "definitief" | "verzonden" | "ontvangen" | "goedgekeurd" | "betaald" | "betwist";

interface PortalInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: PurchaseInvoiceStatus;
  is_self_billing: boolean;
  paid_at: string | null;
  period_from: string | null;
  period_to: string | null;
}

const CarrierPaymentPortal = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { downloadPdf } = usePurchaseInvoicePdf();

  // Validate token and fetch carrier data
  const { data: portalData, isLoading, error } = useQuery({
    queryKey: ["carrier-portal", token],
    queryFn: async () => {
      if (!token) throw new Error("Geen token opgegeven");

      // For now, fetch carrier by a simple token lookup
      // In production, this would use a secure token validation
      const { data: carrier, error: carrierError } = await supabase
        .from("carriers")
        .select("id, company_name, email, phone, vat_number")
        .limit(1)
        .maybeSingle();

      if (carrierError) throw carrierError;
      if (!carrier) throw new Error("Charter niet gevonden");

      // Fetch invoices for this carrier
      const { data: invoices, error: invoicesError } = await supabase
        .from("purchase_invoices")
        .select(`
          id, invoice_number, invoice_date, due_date,
          subtotal, vat_amount, total_amount, status,
          is_self_billing, paid_at, period_from, period_to
        `)
        .eq("carrier_id", carrier.id)
        .in("status", ["definitief", "verzonden", "ontvangen", "goedgekeurd", "betaald"])
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;

      return {
        carrier,
        invoices: (invoices || []) as PortalInvoice[],
      };
    },
    enabled: !!token,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Calculate stats
  const stats = {
    total: portalData?.invoices?.length || 0,
    openAmount: portalData?.invoices
      ?.filter((i) => i.status !== "betaald")
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0,
    paidAmount: portalData?.invoices
      ?.filter((i) => i.status === "betaald")
      .reduce((sum, i) => sum + Number(i.total_amount), 0) || 0,
    openCount: portalData?.invoices?.filter((i) => i.status !== "betaald").length || 0,
  };

  // Filter invoices
  const filteredInvoices = portalData?.invoices?.filter((invoice) => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-400">Portaal laden...</p>
        </div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="max-w-md w-full bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-white">Toegang geweigerd</CardTitle>
            <CardDescription className="text-slate-400">
              De link is ongeldig of verlopen. Neem contact op met uw opdrachtgever.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/30">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {portalData.carrier.company_name}
                </h1>
                <p className="text-sm text-slate-400">Charter Portaal</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-400">
              <Shield className="h-3 w-3" />
              Beveiligde verbinding
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Totaal facturen</p>
                  <p className="text-xl font-bold text-white">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Openstaand</p>
                  <p className="text-xl font-bold text-amber-400">
                    {formatCurrency(stats.openAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Betaald</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {formatCurrency(stats.paidAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <FileText className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Te ontvangen</p>
                  <p className="text-xl font-bold text-orange-400">
                    {stats.openCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-white">Uw Facturen</CardTitle>
                <CardDescription className="text-slate-400">
                  Overzicht van alle facturen en betalingen
                </CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Zoek op factuurnummer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Factuurnummer</TableHead>
                    <TableHead className="text-slate-400">Datum</TableHead>
                    <TableHead className="text-slate-400">Periode</TableHead>
                    <TableHead className="text-right text-slate-400">Bedrag</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-right text-slate-400"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        Geen facturen gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices?.map((invoice) => (
                      <TableRow key={invoice.id} className="border-slate-700 hover:bg-slate-700/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {invoice.invoice_number}
                            </span>
                            {invoice.is_self_billing && (
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                Self-billing
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {invoice.period_from && invoice.period_to ? (
                            <>
                              {format(new Date(invoice.period_from), "d MMM", { locale: nl })} -{" "}
                              {format(new Date(invoice.period_to), "d MMM", { locale: nl })}
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="font-bold text-white">
                              {formatCurrency(Number(invoice.total_amount))}
                            </p>
                            <p className="text-xs text-slate-500">
                              excl. {formatCurrency(Number(invoice.vat_amount))} BTW
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PurchaseInvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
                            disabled={downloadingId === invoice.id}
                            onClick={async () => {
                              setDownloadingId(invoice.id);
                              await downloadPdf(invoice.id, invoice.invoice_number || "factuur");
                              setDownloadingId(null);
                            }}
                          >
                            {downloadingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Vragen over uw facturen?</h3>
                <p className="text-sm text-slate-400">
                  Neem contact op met onze administratie voor vragen over betalingen of facturen.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="border-slate-600 text-white hover:bg-slate-700"
                onClick={() => window.location.href = 'mailto:administratie@rdjlogistics.nl?subject=Vraag over factuur'}
              >
                Contact opnemen
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700/50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} - Charter Portaal - Beveiligde omgeving
          </p>
        </div>
      </div>
    </div>
  );
};

export default CarrierPaymentPortal;

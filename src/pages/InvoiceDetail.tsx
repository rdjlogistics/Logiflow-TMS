import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  FileText,
  Download,
  Mail,
  CreditCard,
  Bell,
  Loader2,
  Building2,
  Calendar,
  Receipt,
  CheckCircle2,
  Clock,
  Send,
  MapPin,
  Phone,
  AtSign,
  Hash,
  Printer,
} from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoiceAgingBadge } from "@/components/invoices/InvoiceAgingBadge";
import { PaymentRegistrationModal } from "@/components/invoices/PaymentRegistrationModal";
import { SendReminderDialog } from "@/components/invoices/SendReminderDialog";
import { MolliePaymentButton } from "@/components/invoices/MolliePaymentButton";
import { InvoiceReminderHistory } from "@/components/invoices/InvoiceReminderHistory";
import { cn } from "@/lib/utils";
import { 
  PremiumGlassCard, 
  SectionHeader, 
  DataRow,
  containerVariants, 
  itemVariants 
} from "@/components/purchase-invoices/detail/PremiumGlassCard";

// Status timeline steps for sales invoices
const STATUS_STEPS = [
  { key: "concept", label: "Concept", icon: FileText },
  { key: "verzonden", label: "Verzonden", icon: Send },
  { key: "betaald", label: "Betaald", icon: CheckCircle2 },
];

const statusOrder = ["concept", "verzonden", "betaald"];

const StatusTimeline = ({ currentStatus }: { currentStatus: string }) => {
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
      {STATUS_STEPS.map((step, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = step.key === currentStatus;
        const StepIcon = step.icon;

        return (
          <div key={step.key} className="flex items-center gap-1 sm:gap-2">
            <div
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all duration-500",
                isActive
                  ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/10"
                  : "bg-muted/30 border-border/30 text-muted-foreground"
              )} : {}}}
            >
              <StepIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < STATUS_STEPS.length - 1 && (
              <div className={cn(
                "w-6 sm:w-10 h-0.5 rounded-full transition-colors duration-500",
                index < currentIndex ? "bg-primary/50" : "bg-border/40"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Premium Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-8">
    <div className="relative overflow-hidden rounded-2xl bg-card/50 border border-border/30 p-6">
      <div className="flex items-center gap-5">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-40 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
    <div className="flex justify-center gap-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-2xl" />
          {i < 3 && <Skeleton className="h-1 w-12 rounded-full" />}
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Skeleton className="h-96 rounded-2xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  </div>
);

// Not Found State
const NotFoundState = () => (
  <div}}
    className="flex flex-col items-center justify-center py-32"
  >
    <div 
      className="relative mb-8"}}}
    >
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center shadow-xl">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl" />
    </div>
    <p className="text-2xl font-bold text-foreground mb-2">Factuur niet gevonden</p>
    <p className="text-muted-foreground mb-8">Deze factuur bestaat niet of is verwijderd.</p>
    <Button asChild className="gap-2 h-11 px-6">
      <Link to="/invoices">
        <ArrowLeft className="h-4 w-4" />
        Terug naar overzicht
      </Link>
    </Button>
  </div>
);

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  // Fetch invoice
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch lines
  const { data: lines } = useQuery({
    queryKey: ["invoice-lines", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", id!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoiceId: invoice.id },
      });
      if (error) throw error;
      if (!data?.pdf) throw new Error("Geen PDF data");

      const binaryString = atob(data.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Factuur-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("PDF error:", error);
      const isNetwork = error?.message?.includes("Failed to fetch") || error?.message?.includes("NetworkError");
      toast({
        title: "PDF genereren mislukt",
        description: isNetwork
          ? "Geen internetverbinding. Controleer je netwerk en probeer het opnieuw."
          : "Er ging iets mis bij het genereren van de PDF. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isOverdue = invoice && invoice.status !== "betaald" && new Date(invoice.due_date) < new Date();

  if (isLoading) {
    return (
      <DashboardLayout title="Factuur">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Factuur">
        <NotFoundState />
      </DashboardLayout>
    );
  }

  const customer = invoice.customers as any;
  const subtotal = Number(invoice.subtotal) || 0;
  const vatAmount = Number(invoice.vat_amount) || 0;
  const totalAmount = Number(invoice.total_amount) || 0;

  return (
    <DashboardLayout title="Factuur">
      {/* Premium animated background mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 print:hidden">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/8 via-primary/4 to-transparent blur-3xl"}}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-accent/6 via-accent/3 to-transparent blur-3xl"}}
        />
      </div>

      <div
        className="space-y-6 print:block print:shadow-none"
      >
        {/* Premium Header */}
        <div
          className="relative rounded-2xl bg-gradient-to-br from-card/90 via-card/80 to-primary/5 backdrop-blur-2xl border border-border/40 shadow-2xl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-30%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/30 via-transparent to-transparent" />
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"}}}
          />

          <div className="relative p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-5">
                <div>
                  <Button 
                    variant="ghost" size="icon" 
                    onClick={() => navigate("/invoices")}
                    className="flex-shrink-0 w-12 h-12 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all duration-300"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h1 
                      className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent tracking-tight"}}}
                    >
                      {invoice.invoice_number}
                    </h1>
                    <InvoiceStatusBadge
                      status={invoice.status}
                      sentAt={invoice.sent_at}
                      isManual={invoice.is_manual ?? false}
                      isOverdue={!!isOverdue}
                    />
                    <InvoiceAgingBadge dueDate={invoice.due_date} status={invoice.status} />
                  </div>
                  <p 
                    className="text-muted-foreground text-base sm:text-lg"}}}
                  >
                    Factuur voor <span className="font-semibold text-foreground">{customer?.company_name || "–"}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div 
                className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full lg:w-auto"}}}
              >
                {/* Primary actions group */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    className="gap-2.5 h-11 px-5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                    onClick={() => navigate(`/invoices/${invoice.id}/send`)}
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">E-mailen</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2.5 h-11 px-5 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                    onClick={handleDownloadPdf}
                    disabled={isGenerating}
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="hidden sm:inline">PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2.5 h-11 px-5 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 print:hidden"
                    onClick={() => {
                      const printContent = document.getElementById('invoice-print-area');
                      if (printContent) {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html><head><title>Factuur Afdrukken</title>
                            <style>body{font-family:system-ui,sans-serif;padding:2rem;}</style>
                            </head><body>${printContent.innerHTML}</body></html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                          printWindow.close();
                        }
                      } else {
                        window.print();
                      }
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Afdrukken</span>
                  </Button>
                </div>

                {/* Payment actions group */}
                {invoice.status !== "betaald" && (
                  <div className="flex flex-wrap gap-2 sm:border-l sm:border-border/40 sm:pl-3">
                    <Button 
                      variant="outline"
                      className="gap-2.5 h-11 px-5 border-border/60 hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-600 transition-all duration-300"
                      onClick={() => setShowReminderDialog(true)}
                    >
                      <Bell className="h-4 w-4" />
                      <span className="hidden sm:inline">Herinnering</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2.5 h-11 px-5 border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600 transition-all duration-300"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="hidden sm:inline">Betaling</span>
                    </Button>
                    <MolliePaymentButton
                      invoiceId={invoice.id}
                      invoiceNumber={invoice.invoice_number}
                      totalAmount={Number(invoice.total_amount)}
                      amountPaid={Number(invoice.amount_paid || 0)}
                      existingPaymentLink={(invoice as Record<string, unknown>).payment_link as string | null}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <StatusTimeline currentStatus={invoice.status} />

        {/* Overdue Banner */}
        {isOverdue && (
          <div
            className="relative overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/5 backdrop-blur-xl p-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--destructive)/0.1),transparent)] pointer-events-none" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-destructive/10">
                  <Clock className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">Factuur is verlopen</p>
                  <p className="text-sm text-muted-foreground">
                    Vervaldatum was {new Date(invoice.due_date).toLocaleDateString("nl-NL")}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="gap-2 bg-destructive hover:bg-destructive/90"
                onClick={() => setShowPaymentModal(true)}
              >
                <CreditCard className="h-4 w-4" />
                Betaling registreren
              </Button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Invoice Lines */}
          <div className="lg:col-span-2">
            <PremiumGlassCard variant="default">
              <SectionHeader icon={Receipt} title="Factuurregels" />
              <div className="px-6 pb-6">
                <div className="rounded-xl border border-border/30 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="text-right">Aantal</TableHead>
                        <TableHead className="text-right">Prijs</TableHead>
                        <TableHead className="text-right">BTW</TableHead>
                        <TableHead className="text-right">Totaal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!lines || lines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                            Geen factuurregels gevonden
                          </TableCell>
                        </TableRow>
                      ) : (
                        lines.map((line) => (
                          <TableRow key={line.id} className="hover:bg-primary/[0.02]">
                            <TableCell className="text-sm font-medium">{line.description}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{line.quantity}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{formatCurrency(Number(line.unit_price))}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{line.vat_percentage ?? 21}%</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-sm">{formatCurrency(Number(line.total_price))}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </PremiumGlassCard>
          </div>

          {/* Right Column - Summary Cards */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <PremiumGlassCard variant="premium" glow>
              <SectionHeader icon={Receipt} title="Financieel overzicht" />
              <div className="px-6 pb-6 space-y-1">
                <DataRow label="Subtotaal" value={formatCurrency(subtotal)} />
                <DataRow 
                  label={`BTW (${invoice.vat_percentage ?? 21}%)`} 
                  value={formatCurrency(vatAmount)} 
                />
                <div className="border-t border-border/30 pt-3 mt-3">
                  <DataRow label="Totaal" value={formatCurrency(totalAmount)} highlight />
                </div>
                {invoice.sent_at && (
                  <div className="pt-2">
                    <DataRow 
                      label="Verzonden op" 
                      value={new Date(invoice.sent_at).toLocaleDateString("nl-NL")} 
                      icon={Send}
                    />
                  </div>
                )}
                {invoice.paid_at && (
                  <DataRow 
                    label="Betaald op" 
                    value={new Date(invoice.paid_at).toLocaleDateString("nl-NL")} 
                    icon={CheckCircle2}
                    valueClassName="text-emerald-600 dark:text-emerald-400"
                  />
                )}
              </div>
            </PremiumGlassCard>

            {/* Customer Info */}
            {customer && (
              <PremiumGlassCard variant="crystal">
                <SectionHeader icon={Building2} title="Klantinformatie" />
                <div className="px-6 pb-6 space-y-1">
                  <DataRow label="Bedrijfsnaam" value={customer.company_name} icon={Building2} />
                  {customer.contact_name && (
                    <DataRow label="Contactpersoon" value={customer.contact_name} />
                  )}
                  {customer.email && (
                    <DataRow label="E-mail" value={customer.email} icon={AtSign} />
                  )}
                  {customer.phone && (
                    <DataRow label="Telefoon" value={customer.phone} icon={Phone} />
                  )}
                  {customer.address && (
                    <DataRow 
                      label="Adres" 
                      value={`${customer.address}, ${customer.postal_code || ""} ${customer.city || ""}`} 
                      icon={MapPin}
                    />
                  )}
                  {customer.vat_number && (
                    <DataRow label="BTW-nummer" value={customer.vat_number} icon={Hash} />
                  )}
                </div>
              </PremiumGlassCard>
            )}

            {/* Invoice Dates */}
            <PremiumGlassCard variant="default">
              <SectionHeader icon={Calendar} title="Datumgegevens" />
              <div className="px-6 pb-6 space-y-1">
                <DataRow 
                  label="Factuurdatum" 
                  value={new Date(invoice.invoice_date).toLocaleDateString("nl-NL")} 
                  icon={Calendar}
                />
                <DataRow 
                  label="Vervaldatum" 
                  value={new Date(invoice.due_date).toLocaleDateString("nl-NL")} 
                  icon={Clock}
                  valueClassName={isOverdue ? "text-destructive font-bold" : ""}
                />
                {(invoice as any).period_start && (
                  <DataRow 
                    label="Periode" 
                    value={`${new Date((invoice as any).period_start).toLocaleDateString("nl-NL")} - ${(invoice as any).period_end ? new Date((invoice as any).period_end).toLocaleDateString("nl-NL") : "–"}`}
                  />
                )}
              </div>
            </PremiumGlassCard>

            {/* Reminder History */}
            {invoice.status !== "concept" && (
              <PremiumGlassCard variant="default">
                <SectionHeader icon={Bell} title="Herinneringen" />
                <InvoiceReminderHistory invoiceId={invoice.id} />
              </PremiumGlassCard>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {invoice.status !== "betaald" && (
        <PaymentRegistrationModal
          invoice={{
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            total_amount: Number(invoice.total_amount),
            customer_id: invoice.customer_id || "",
          }}
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["invoice-detail", id] });
          }}
        />
      )}

      {/* Reminder Dialog */}
      <SendReminderDialog
        invoice={invoice.status !== "betaald" ? {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: Number(invoice.total_amount),
          due_date: invoice.due_date,
          status: invoice.status,
          reminder_count: invoice.reminder_count ?? undefined,
          customers: customer ? {
            company_name: customer.company_name ?? undefined,
            email: customer.email ?? undefined,
            phone: customer.phone ?? undefined,
          } : undefined,
        } : null}
        open={showReminderDialog}
        onOpenChange={setShowReminderDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["invoice-detail", id] });
        }}
      />
    </DashboardLayout>
  );
};

export default InvoiceDetail;

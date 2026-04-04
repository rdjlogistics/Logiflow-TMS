import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePurchaseInvoicePdf } from "@/hooks/use-purchase-invoice-pdf";
import { isInvoiceOverdue, getPaymentStatusColor } from "@/lib/purchase-invoice-helpers";
import { ExternalInvoiceMatchModal } from "@/components/purchase-invoices/ExternalInvoiceMatchModal";
import { PaymentRegistrationModal } from "@/components/purchase-invoices/PaymentRegistrationModal";

// Refactored components
import { containerVariants, itemVariants } from "@/components/purchase-invoices/detail/PremiumGlassCard";
import { InvoiceHeader } from "@/components/purchase-invoices/detail/InvoiceHeader";
import { StatusTimeline } from "@/components/purchase-invoices/detail/StatusTimeline";
import { OverdueBanner, DifferenceBanner } from "@/components/purchase-invoices/detail/AlertBanners";
import { InvoiceLinesCard } from "@/components/purchase-invoices/detail/InvoiceLinesCard";
import { ExternalInvoiceCard } from "@/components/purchase-invoices/detail/ExternalInvoiceCard";
import { FinancialSummaryCard } from "@/components/purchase-invoices/detail/FinancialSummaryCard";
import { CarrierInfoCard } from "@/components/purchase-invoices/detail/CarrierInfoCard";
import { InvoiceDatesCard } from "@/components/purchase-invoices/detail/InvoiceDatesCard";

type PurchaseInvoiceStatus = "concept" | "definitief" | "verzonden" | "ontvangen" | "goedgekeurd" | "betaald" | "betwist";

// Premium Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-8">
    {/* Header Skeleton */}
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
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
    
    {/* Timeline Skeleton */}
    <div className="flex justify-center gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-2xl" />
          {i < 4 && <Skeleton className="h-1 w-12 rounded-full" />}
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
  <div
    className="flex flex-col items-center justify-center py-32"
  >
    <div 
      className="relative mb-8"
    >
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center shadow-xl">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl" />
    </div>
    <p className="text-2xl font-bold text-foreground mb-2">Inkoopfactuur niet gevonden</p>
    <p className="text-muted-foreground mb-8">Deze factuur bestaat niet of is verwijderd.</p>
    <Button asChild className="gap-2 h-11 px-6">
      <Link to="/purchase-invoices">
        <ArrowLeft className="h-4 w-4" />
        Terug naar overzicht
      </Link>
    </Button>
  </div>
);

const PurchaseInvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { isGenerating, downloadPdf } = usePurchaseInvoicePdf();

  // Fetch invoice details
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["purchase-invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select(`
          *,
          carriers(id, company_name, contact_name, email, phone, address, city, postal_code, vat_number, iban)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch invoice lines
  const { data: lines } = useQuery({
    queryKey: ["purchase-invoice-lines", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoice_lines")
        .select(`
          *,
          trips(id, order_number, pickup_city, delivery_city, trip_date)
        `)
        .eq("purchase_invoice_id", id!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: PurchaseInvoiceStatus) => {
      const { error } = await supabase
        .from("purchase_invoices")
        .update({ status: newStatus })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice", id] });
      toast.success("Status bijgewerkt");
    },
    onError: () => {
      toast.error("Kon status niet bijwerken");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Inkoopfactuur">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Not found state
  if (!invoice) {
    return (
      <DashboardLayout title="Inkoopfactuur">
        <NotFoundState />
      </DashboardLayout>
    );
  }

  const carrier = invoice.carriers as any;
  const inv = invoice as any;
  const hasDifference = invoice.amount_difference && Math.abs(Number(invoice.amount_difference)) > 0;
  const invoiceIsOverdue = isInvoiceOverdue({ status: inv.status, due_date: inv.due_date });
  const paymentColor = getPaymentStatusColor({ status: inv.status, due_date: inv.due_date });

  return (
    <DashboardLayout title="Inkoopfactuur">
      {/* Premium animated background mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/8 via-primary/4 to-transparent blur-3xl"
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-accent/6 via-accent/3 to-transparent blur-3xl"
        />
      </div>

      <div
        className="space-y-6"
      >
        {/* Premium Header */}
        <InvoiceHeader
          invoice={{
            id: inv.id,
            invoice_number: inv.invoice_number,
            status: inv.status,
            is_self_billing: inv.is_self_billing,
            due_date: inv.due_date,
          }}
          carrier={{ company_name: carrier.company_name }}
          isOverdue={invoiceIsOverdue}
          isGenerating={isGenerating}
          onBack={() => navigate("/purchase-invoices")}
          onDownloadPdf={() => downloadPdf(inv.id, inv.invoice_number)}
          onShowMatchModal={() => setShowMatchModal(true)}
          onShowPaymentModal={() => setShowPaymentModal(true)}
        />

        {/* Status Timeline */}
        <StatusTimeline currentStatus={inv.status} />

        {/* Alert Banners */}
        <OverdueBanner
          isOverdue={invoiceIsOverdue}
          dueDate={inv.due_date}
          onPaymentClick={() => setShowPaymentModal(true)}
        />
        
        <DifferenceBanner
          hasDifference={!!hasDifference}
          differenceAmount={Number(invoice.amount_difference)}
          formatCurrency={formatCurrency}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Invoice Lines */}
          <div className="lg:col-span-2 space-y-6">
            <InvoiceLinesCard
              lines={lines as any}
              formatCurrency={formatCurrency}
            />

            {/* External Invoice Matching */}
            {invoice.external_invoice_number && (
              <ExternalInvoiceCard
                invoice={{
                  external_invoice_number: invoice.external_invoice_number,
                  external_invoice_date: invoice.external_invoice_date,
                  external_invoice_amount: invoice.external_invoice_amount,
                  amount_difference: invoice.amount_difference,
                }}
                formatCurrency={formatCurrency}
              />
            )}
          </div>

          {/* Right Column - Summary Cards */}
          <div className="space-y-6">
            <FinancialSummaryCard
              invoice={{
                subtotal: Number(inv.subtotal),
                vat_percentage: inv.vat_percentage,
                vat_amount: Number(inv.vat_amount),
                total_amount: Number(inv.total_amount),
                sent_at: inv.sent_at,
                paid_at: inv.paid_at,
              }}
              formatCurrency={formatCurrency}
            />

            <CarrierInfoCard
              carrier={{
                id: carrier.id,
                company_name: carrier.company_name,
                contact_name: carrier.contact_name,
                address: carrier.address,
                city: carrier.city,
                postal_code: carrier.postal_code,
                vat_number: carrier.vat_number,
                iban: carrier.iban,
              }}
            />

            <InvoiceDatesCard
              invoice={{
                invoice_date: invoice.invoice_date,
                due_date: invoice.due_date,
                period_from: invoice.period_from,
                period_to: invoice.period_to,
              }}
              paymentColor={paymentColor}
            />

            {/* Quick Action Button */}
            {invoice.status === "concept" && (
              <div>
                <Button
                  className="w-full h-14 text-base font-semibold gap-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-500"
                  onClick={() => updateStatusMutation.mutate("definitief")}
                  disabled={updateStatusMutation.isPending}
                >
                  <div
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  Markeer als definitief
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExternalInvoiceMatchModal
        open={showMatchModal}
        onOpenChange={setShowMatchModal}
        invoiceId={id!}
        expectedAmount={Number(invoice.total_amount)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-invoice", id] });
        }}
      />

      <PaymentRegistrationModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        invoiceId={id!}
        totalAmount={Number(invoice.total_amount)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-invoice", id] });
        }}
      />
    </DashboardLayout>
  );
};

export default PurchaseInvoiceDetail;

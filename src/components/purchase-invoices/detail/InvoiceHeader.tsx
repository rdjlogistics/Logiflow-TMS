import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FileText, 
  CreditCard, 
  Link2, 
  Mail, 
  Loader2,
  Download,
  Sparkles,
} from "lucide-react";
import { PurchaseInvoiceStatusBadge } from "@/components/purchase-invoices/PurchaseInvoiceStatusBadge";
import { itemVariants } from "./PremiumGlassCard";

type PurchaseInvoiceStatus = "concept" | "definitief" | "verzonden" | "ontvangen" | "goedgekeurd" | "betaald" | "betwist";

interface InvoiceHeaderProps {
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
    is_self_billing?: boolean;
    due_date?: string | null;
  };
  carrier: {
    company_name: string;
  };
  isOverdue: boolean;
  isGenerating: boolean;
  onBack: () => void;
  onDownloadPdf: () => void;
  onShowMatchModal: () => void;
  onShowPaymentModal: () => void;
}

export const InvoiceHeader = ({
  invoice,
  carrier,
  isOverdue,
  isGenerating,
  onBack,
  onDownloadPdf,
  onShowMatchModal,
  onShowPaymentModal,
}: InvoiceHeaderProps) => {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/90 via-card/80 to-primary/5 backdrop-blur-2xl border border-border/40 shadow-2xl"
    >
      {/* Multi-layer gradient effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-30%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-primary/30 via-transparent to-transparent" />
      
      {/* Animated shine effect */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"}
      />
      
      <div className="relative p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Back + Info */}
          <div className="flex items-start gap-5">
            <div}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent tracking-tight"}
                >
                  {invoice.invoice_number}
                </h1>
                <PurchaseInvoiceStatusBadge 
                  status={invoice.status as PurchaseInvoiceStatus} 
                  isOverdue={isOverdue}
                  dueDate={invoice.due_date}
                />
                {invoice.is_self_billing && (
                  <Badge 
                    variant="outline" 
                    className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/30 text-accent-foreground gap-1.5"
                  >
                    <Sparkles className="h-3 w-3 text-accent" />
                    Self-billing
                  </Badge>
                )}
              </div>
              <p 
                className="text-muted-foreground text-base sm:text-lg"}
              >
                Inkoopfactuur van <span className="font-semibold text-foreground">{carrier.company_name}</span>
              </p>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div 
            className="flex flex-wrap gap-3 pl-17 lg:pl-0"}
          >
            <Button 
              asChild 
              className="gap-2.5 h-11 px-5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            >
              <Link to={`/purchase-invoices/${invoice.id}/send`}>
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Verstuur naar Charter</span>
                <span className="sm:hidden">Versturen</span>
              </Link>
            </Button>
            <div}>
              <Button 
                variant="outline" 
                className="gap-2.5 h-11 px-5 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                onClick={onDownloadPdf}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
            <div}>
              <Button 
                variant="outline" 
                className="gap-2.5 h-11 px-5 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
                onClick={onShowMatchModal}
              >
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Factuur koppelen</span>
                <span className="sm:hidden">Koppelen</span>
              </Button>
            </div>
            {invoice.status !== "betaald" && (
              <div}>
                <Button 
                  variant="outline" 
                  className="gap-2.5 h-11 px-5 border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-600 transition-all duration-300"
                  onClick={onShowPaymentModal}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Betaling registreren</span>
                  <span className="sm:hidden">Betaling</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

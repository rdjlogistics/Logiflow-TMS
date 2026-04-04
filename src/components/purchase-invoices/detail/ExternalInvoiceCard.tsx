import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Link2, AlertTriangle, CheckCircle2, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { PremiumGlassCard, SectionHeader } from "./PremiumGlassCard";
import { cn } from "@/lib/utils";

interface ExternalInvoiceCardProps {
  invoice: {
    external_invoice_number: string;
    external_invoice_date?: string | null;
    external_invoice_amount?: number | null;
    amount_difference?: number | null;
  };
  formatCurrency: (amount: number) => string;
}

export const ExternalInvoiceCard = ({ invoice, formatCurrency }: ExternalInvoiceCardProps) => {
  const hasDifference = invoice.amount_difference && Math.abs(Number(invoice.amount_difference)) > 0;

  return (
    <PremiumGlassCard variant={hasDifference ? "warning" : "success"} glow>
      <SectionHeader 
        icon={Link2} 
        title="Gekoppelde Factuur"
        badge={
          hasDifference ? (
            <Badge 
              variant="outline" 
              className="bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-600 border-amber-500/30 gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Verschil
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-600 border-emerald-500/30 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Match
            </Badge>
          )
        }
      />
      
      <div className="p-6 pt-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <motion.div 
            className="space-y-1.5"
            initial={{ opacity: 0, y: 10 }}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              Factuurnummer
            </p>
            <p className="font-bold text-foreground text-lg">{invoice.external_invoice_number}</p>
          </motion.div>
          
          <motion.div 
            className="space-y-1.5"
            initial={{ opacity: 0, y: 10 }}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Factuurdatum</p>
            <p className="font-semibold text-foreground">
              {invoice.external_invoice_date
                ? format(new Date(invoice.external_invoice_date), "d MMM yyyy", { locale: nl })
                : "-"}
            </p>
          </motion.div>
          
          <motion.div 
            className="space-y-1.5"
            initial={{ opacity: 0, y: 10 }}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Bedrag</p>
            <p className="font-bold text-foreground text-lg">
              {invoice.external_invoice_amount
                ? formatCurrency(Number(invoice.external_invoice_amount))
                : "-"}
            </p>
          </motion.div>
          
          <motion.div 
            className="space-y-1.5"
            initial={{ opacity: 0, y: 10 }}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Verschil</p>
            <p className={cn(
              "font-bold text-lg",
              hasDifference ? "text-amber-600" : "text-emerald-600"
            )}>
              {hasDifference 
                ? formatCurrency(Math.abs(Number(invoice.amount_difference)))
                : "€ 0,00"
              }
            </p>
          </motion.div>
        </div>
      </div>
    </PremiumGlassCard>
  );
};

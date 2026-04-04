import { Badge } from "@/components/ui/badge";
import { Euro, Mail, CheckCircle2, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { PremiumGlassCard, SectionHeader, DataRow } from "./PremiumGlassCard";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  invoice: {
    subtotal: number;
    vat_percentage: number;
    vat_amount: number;
    total_amount: number;
    sent_at?: string | null;
    paid_at?: string | null;
  };
  formatCurrency: (amount: number) => string;
}

export const FinancialSummaryCard = ({ invoice, formatCurrency }: FinancialSummaryCardProps) => {
  return (
    <PremiumGlassCard variant="premium" glow>
      <SectionHeader icon={Euro} title="Overzicht" />
      
      <div className="p-6 pt-2 space-y-1">
        <DataRow 
          label="Subtotaal" 
          value={formatCurrency(Number(invoice.subtotal))} 
        />
        <DataRow 
          label={`BTW (${invoice.vat_percentage}%)`}
          value={formatCurrency(Number(invoice.vat_amount))} 
        />
        
        {/* Total with premium styling */}
        <div className="pt-4 mt-4 border-t border-border/50">
          <div 
            className="flex items-center justify-between py-3 px-4 -mx-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"}
          >
            <span className="text-base font-semibold flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              Totaal
            </span>
            <span 
              className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary-glow bg-clip-text text-transparent"}
            >
              {formatCurrency(Number(invoice.total_amount))}
            </span>
          </div>
        </div>
        
        {/* Sent status */}
        {invoice.sent_at && (
          <div 
            className="pt-4 mt-4 border-t border-border/50"}
          >
            <div className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4" />
                Verstuurd op
              </span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {format(new Date(invoice.sent_at), "d MMM yyyy", { locale: nl })}
              </span>
            </div>
          </div>
        )}
        
        {/* Paid status */}
        {invoice.paid_at && (
          <div 
            className={cn(!invoice.sent_at && "pt-4 mt-4 border-t border-border/50")
          >
            <div className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Betaald op
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {format(new Date(invoice.paid_at), "d MMM yyyy", { locale: nl })}
              </span>
            </div>
          </div>
        )}
      </div>
    </PremiumGlassCard>
  );
};

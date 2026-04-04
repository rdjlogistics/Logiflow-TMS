import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarClock, Clock } from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { PremiumGlassCard, SectionHeader, DataRow } from "./PremiumGlassCard";
import { cn } from "@/lib/utils";

type PaymentColor = "green" | "amber" | "red";

const getDueDateClasses = (color: PaymentColor): string => {
  switch (color) {
    case "green":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25";
    case "amber":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25";
    case "red":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25";
    default:
      return "bg-muted text-muted-foreground";
  }
};

interface InvoiceDatesCardProps {
  invoice: {
    invoice_date: string;
    due_date?: string | null;
    period_from?: string | null;
    period_to?: string | null;
  };
  paymentColor: PaymentColor;
}

export const InvoiceDatesCard = ({ invoice, paymentColor }: InvoiceDatesCardProps) => {
  return (
    <PremiumGlassCard variant="default">
      <SectionHeader icon={Calendar} title="Data" />
      
      <div className="p-6 pt-2 space-y-2">
        <DataRow 
          label="Factuurdatum" 
          value={format(new Date(invoice.invoice_date), "d MMMM yyyy", { locale: nl })} 
        />
        
        {/* Due date with status coloring */}
        {invoice.due_date ? (
          <motion.div 
            className="flex items-center justify-between py-3 group"
            initial={{ opacity: 0, x: -8 }}
          >
            <span className="text-sm flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground/80 transition-colors">
              <CalendarClock className="h-4 w-4" />
              Vervaldatum
            </span>
            <span className={cn(
              "inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold transition-all",
              getDueDateClasses(paymentColor)
            )}>
              {format(new Date(invoice.due_date), "d MMMM yyyy", { locale: nl })}
            </span>
          </motion.div>
        ) : (
          <DataRow label="Vervaldatum" value="-" />
        )}
        
        {/* Period with week badges */}
        {invoice.period_from && invoice.period_to && (
          <motion.div 
            className="flex items-center justify-between py-3 pt-4 mt-2 border-t border-border/40"
            initial={{ opacity: 0, x: -8 }}
          >
            <span className="text-sm flex items-center gap-2.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Periode
            </span>
            <div className="flex items-center gap-2.5">
              <Badge 
                variant="outline" 
                className="text-[10px] px-2 py-0.5 font-bold bg-gradient-to-r from-primary/10 to-primary/5 border-primary/25 text-primary"
              >
                W{getISOWeek(new Date(invoice.period_from))}
                {getISOWeek(new Date(invoice.period_from)) !== getISOWeek(new Date(invoice.period_to)) && 
                  `-${getISOWeek(new Date(invoice.period_to))}`}
              </Badge>
              <span className="text-sm font-medium">
                {format(new Date(invoice.period_from), "d MMM", { locale: nl })} -{" "}
                {format(new Date(invoice.period_to), "d MMM yyyy", { locale: nl })}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </PremiumGlassCard>
  );
};

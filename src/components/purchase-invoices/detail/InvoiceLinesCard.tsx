import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, ArrowRight, Package, ExternalLink } from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { PremiumGlassCard, SectionHeader, tableRowVariants } from "./PremiumGlassCard";

interface InvoiceLine {
  id: string;
  total_price: number;
  description?: string | null;
  trips?: {
    id: string;
    order_number: string;
    pickup_city: string;
    delivery_city: string;
    trip_date: string;
  } | null;
}

interface InvoiceLinesCardProps {
  lines: InvoiceLine[] | undefined;
  formatCurrency: (amount: number) => string;
}

export const InvoiceLinesCard = ({ lines, formatCurrency }: InvoiceLinesCardProps) => {
  return (
    <PremiumGlassCard variant="default" glow>
      <SectionHeader 
        icon={Receipt} 
        title="Orderregels" 
        description={lines?.length ? `${lines.length} ${lines.length === 1 ? 'regel' : 'regels'}` : undefined}
      />
      
      <div className="p-6 pt-4">
        {lines && lines.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/20">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground py-4">
                    Order
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground py-4">
                    Route
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground py-4">
                    Datum
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground py-4 text-right">
                    Bedrag
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <motion.tr
                    key={line.id}
                    initial="hidden"
                    animate="visible"
                    className="border-border/30 hover:bg-primary/5 transition-all duration-300 group"
                  >
                    <TableCell className="py-5">
                      {line.trips ? (
                        <Link
                          to={`/orders/edit/${line.trips.id}`}
                          className="inline-flex items-center gap-2 font-semibold text-primary hover:text-primary/80 transition-colors group/link"
                        >
                          <Package className="h-4 w-4 opacity-50 group-hover/link:opacity-100 transition-opacity" />
                          {line.trips.order_number}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-5">
                      {line.trips ? (
                        <div className="flex items-center gap-2.5 text-sm">
                          <span className="font-medium text-foreground">{line.trips.pickup_city}</span>
                          <motion.div
                          >
                            <ArrowRight className="h-4 w-4 text-primary" />
                          </motion.div>
                          <span className="font-medium text-foreground">{line.trips.delivery_city}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{line.description || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-5">
                      {line.trips?.trip_date ? (
                        <div className="flex items-center gap-2.5">
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-2 py-0.5 font-bold bg-gradient-to-r from-primary/10 to-primary/5 border-primary/25 text-primary"
                          >
                            W{getISOWeek(new Date(line.trips.trip_date))}
                          </Badge>
                          <span className="text-sm font-medium">
                            {format(new Date(line.trips.trip_date), "d MMM", { locale: nl })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-5 text-right">
                      <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {formatCurrency(Number(line.total_price))}
                      </span>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <motion.div 
            className="flex flex-col items-center justify-center py-16 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center shadow-lg">
                <Receipt className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">Geen orderregels gevonden</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Voeg orders toe om regels te zien</p>
          </motion.div>
        )}
      </div>
    </PremiumGlassCard>
  );
};

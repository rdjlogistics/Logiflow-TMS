import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarClock, AlertTriangle, CreditCard, Zap } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface OverdueBannerProps {
  isOverdue: boolean;
  dueDate?: string | null;
  onPaymentClick: () => void;
}

export const OverdueBanner = ({ isOverdue, dueDate, onPaymentClick }: OverdueBannerProps) => {
  return (
    <AnimatePresence>
      {isOverdue && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent backdrop-blur-2xl shadow-xl shadow-red-500/10">
            {/* Animated gradient border effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent"
            />
            
            <div className="relative p-5 flex items-center gap-5">
              <motion.div 
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center shadow-lg shadow-red-500/20"
              >
                <CalendarClock className="h-7 w-7 text-red-500" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-red-700 dark:text-red-400">
                  Factuur is verlopen
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  De vervaldatum was{" "}
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {dueDate ? format(new Date(dueDate), "d MMMM yyyy", { locale: nl }) : "-"}
                  </span>
                  . Betaling is te laat.
                </p>
              </div>
              <motion.div

              >
                <Button 
                  className="h-11 px-5 gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25"
                  onClick={onPaymentClick}
                >
                  <Zap className="h-4 w-4" />
                  Nu betalen
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface DifferenceBannerProps {
  hasDifference: boolean;
  differenceAmount: number;
  formatCurrency: (amount: number) => string;
}

export const DifferenceBanner = ({ hasDifference, differenceAmount, formatCurrency }: DifferenceBannerProps) => {
  return (
    <AnimatePresence>
      {hasDifference && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent backdrop-blur-2xl shadow-xl shadow-amber-500/10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
            
            <div className="relative p-5 flex items-center gap-5">
              <motion.div 
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center"
              >
                <AlertTriangle className="h-7 w-7 text-amber-500" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-amber-700 dark:text-amber-400">
                  Bedragsverschil gedetecteerd
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  De factuur van de charter wijkt{" "}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(Math.abs(differenceAmount))}
                  </span>
                  {" "}af van onze berekening.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  FileText, 
  Download, 
  ArrowRight,
  Loader2,
  Sparkles,
  PartyPopper
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreatedInvoice {
  id: string;
  invoice_number: string;
  carrier_name: string;
  total_amount: number;
}

interface Step3ConfirmationSectionProps {
  createdInvoices: CreatedInvoice[];
  formatCurrency: (amount: number) => string;
  onGoToOverview: () => void;
  onDownloadPdfs: () => void;
  isDownloading: boolean;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    } 
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.3 + i * 0.08,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  })
};

export const Step3ConfirmationSection = ({
  createdInvoices,
  formatCurrency,
  onGoToOverview,
  onDownloadPdfs,
  isDownloading,
}: Step3ConfirmationSectionProps) => {
  const totalAmount = createdInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6"
    >
      {/* Success Header */}
      <motion.div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-transparent backdrop-blur-2xl border border-emerald-500/30 p-6 sm:p-8 text-center"
      >
        {/* Shimmer */}
        <motion.div
          initial={{ x: '-100%' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
        />
        
        {/* Mesh gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(142_76%_36%/0.15),transparent)] pointer-events-none" />
        
        <div className="relative space-y-3 sm:space-y-4">
          {/* Animated Success Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            className="mx-auto relative"
          >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
              {/* Glow rings */}
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500/20"
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-emerald-500/20"
              />
              
              {/* Icon container */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Success Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            className="space-y-1.5 sm:space-y-2"
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              <PartyPopper className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 flex-shrink-0" />
              <h2 className="text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 dark:from-emerald-400 dark:via-emerald-300 dark:to-emerald-200 bg-clip-text text-transparent">
                {createdInvoices.length} {createdInvoices.length === 1 ? "Factuur" : "Facturen"} Aangemaakt!
              </h2>
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 animate-pulse flex-shrink-0" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Alle facturen zijn succesvol gegenereerd
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Created Invoices List */}
      <motion.div
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-card/95 via-card/90 to-muted/30 backdrop-blur-xl border border-border/40"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        
        <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
          {createdInvoices.map((invoice, idx) => (
            <motion.div
              key={invoice.id}
              custom={idx}
              initial="hidden"
              animate="visible"
              className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-r from-muted/60 to-muted/30 border border-border/30 hover:border-emerald-500/30 transition-all gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <motion.div 
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{invoice.invoice_number}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{invoice.carrier_name}</p>
                </div>
              </div>
              <span className="text-sm sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex-shrink-0">
                {formatCurrency(invoice.total_amount)}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Total Summary */}
      <motion.div
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-transparent backdrop-blur-xl border border-emerald-500/30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(142_76%_36%/0.12),transparent)] pointer-events-none" />
        
        <div className="relative p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <motion.div 
                className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
              >
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm sm:text-base">Totaal aangemaakt</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {createdInvoices.length} factuur{createdInvoices.length !== 1 ? 'en' : ''}
                </div>
              </div>
            </div>
            
            <motion.div 
              initial={{ scale: 0.8 }}
              className="text-xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 dark:from-emerald-400 dark:via-emerald-300 dark:to-emerald-200 bg-clip-text text-transparent flex-shrink-0"
            >
              {formatCurrency(totalAmount)}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pb-safe"
      >
        <Button
          variant="outline"
          onClick={onGoToOverview}
          className="h-12 sm:h-14 rounded-xl gap-2 text-sm sm:text-base touch-manipulation"
        >
          Naar overzicht
          <ArrowRight className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={onDownloadPdfs}
          disabled={isDownloading}
          className="h-12 sm:h-14 rounded-xl gap-2 text-sm sm:text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all touch-manipulation"
        >
          {isDownloading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              Download PDFs
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
};

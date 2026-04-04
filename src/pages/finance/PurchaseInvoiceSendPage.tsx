import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Calendar, 
  Truck,
  Sparkles
} from "lucide-react";
import { PurchaseInvoiceContentPreview } from "@/components/purchase-invoices/PurchaseInvoiceContentPreview";
import { PurchaseInvoiceEmailComposer } from "@/components/purchase-invoices/PurchaseInvoiceEmailComposer";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { hapticSuccess } from "@/lib/haptics";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } 
  }
};

const successVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1, 
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 20 
    } 
  }
};

const PurchaseInvoiceSendPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch invoice for header info
  const { data: invoice } = useQuery({
    queryKey: ["purchase-invoice-header", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices")
        .select(`
          *,
          carriers(id, company_name)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleSuccess = useCallback(() => {
    hapticSuccess();
    setShowSuccess(true);
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["purchase-invoice", id] });
    queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    
    // Navigate back after success animation
    setTimeout(() => {
      navigate(`/purchase-invoices/${id}`);
    }, 1500);
  }, [id, navigate, queryClient]);

  // Keyboard shortcut handler is in the EmailComposer component

  if (!id) {
    return (
      <DashboardLayout title="Inkoopfactuur versturen">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Geen factuur ID opgegeven</p>
        </div>
      </DashboardLayout>
    );
  }

  const carrier = invoice?.carriers as any;
  const statusColor = invoice?.status === "verzonden" 
    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
    : invoice?.status === "definitief"
    ? "bg-primary/10 text-primary border-primary/20"
    : "bg-muted text-muted-foreground border-border";

  return (
    <DashboardLayout title="Inkoopfactuur versturen">
      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
             
             
              className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-card border border-border shadow-2xl"
            >
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </motion.div>
              </div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg font-semibold text-foreground"
              >
                E-mail succesvol verstuurd!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
       
       
        className="space-y-6"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Premium Header */}
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl shadow-primary/5"
        >
          {/* Gradient highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Back Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)}
                className="self-start w-10 h-10 rounded-xl hover:bg-muted/80 touch-manipulation active:scale-[0.97] transition-transform"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              {/* Invoice Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span>Inkoopfacturen</span>
                  <span className="text-muted-foreground/50">›</span>
                  <span>{invoice?.invoice_number || "..."}</span>
                  <span className="text-muted-foreground/50">›</span>
                  <span className="text-foreground font-medium">Versturen</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  Inkoopfactuur versturen
                </h1>
                
                {invoice && (
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {/* Invoice Number */}
                    <div className="flex items-center gap-1.5 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{invoice.invoice_number}</span>
                    </div>
                    
                    {/* Carrier */}
                    {carrier && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Truck className="h-4 w-4" />
                        <span>{carrier.company_name}</span>
                      </div>
                    )}
                    
                    {/* Period */}
                    {invoice.period_from && invoice.period_to && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(invoice.period_from), "d MMM", { locale: nl })} - {format(new Date(invoice.period_to), "d MMM", { locale: nl })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Status Badge & Amount */}
              <div className="flex flex-col items-end gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "px-3 py-1 font-medium capitalize transition-all hover:scale-105",
                    statusColor
                  )}
                >
                  {invoice?.status || "concept"}
                </Badge>
                {invoice && (
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(Number(invoice.total_amount))}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Timeline - Swipeable on mobile */}
        <motion.div
          className="relative w-full"
        >
          {/* Fade edges on mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none sm:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none sm:hidden" />
          
          {/* Scrollable container */}
          <div 
            className="flex items-center gap-2 px-4 sm:justify-center overflow-x-auto scrollbar-none touch-pan-x scroll-smooth"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Spacer for mobile scroll padding */}
            <div className="flex-shrink-0 w-2 sm:hidden" />
            
            {["concept", "definitief", "verzonden", "betaald"].map((status, idx, arr) => {
              const isActive = status === invoice?.status;
              const isPast = arr.indexOf(invoice?.status || "concept") > idx;
              
              return (
                <div key={status} className="flex items-center gap-2 flex-shrink-0">
                  <motion.div 

                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap touch-manipulation",
                      isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                      isPast && "bg-emerald-500/10 text-emerald-600",
                      !isActive && !isPast && "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {isPast && <CheckCircle2 className="h-3 w-3 flex-shrink-0" />}
                    {isActive && <Sparkles className="h-3 w-3 flex-shrink-0" />}
                    <span className="capitalize">{status}</span>
                  </motion.div>
                  {idx < arr.length - 1 && (
                    <div className={cn(
                      "w-6 sm:w-8 h-0.5 rounded-full flex-shrink-0",
                      isPast ? "bg-emerald-500/30" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
            
            {/* Spacer for mobile scroll padding */}
            <div className="flex-shrink-0 w-2 sm:hidden" />
          </div>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Invoice Content Preview */}
          <motion.div>
            <PurchaseInvoiceContentPreview invoiceId={id} />
          </motion.div>

          {/* Right: Email Composer */}
          <motion.div>
            <PurchaseInvoiceEmailComposer
              invoiceId={id}
              onSuccess={handleSuccess}
            />
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default PurchaseInvoiceSendPage;

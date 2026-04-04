import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  X,
  CreditCard,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  Mail,
  Landmark,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PaymentRegistrationModal } from "./PaymentRegistrationModal";
import { SEPAExportModal } from "./SEPAExportModal";

type PurchaseInvoiceStatus = "concept" | "definitief" | "verzonden" | "ontvangen" | "goedgekeurd" | "betaald" | "betwist";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: PurchaseInvoiceStatus;
  carrier_id: string;
  carriers: {
    id: string;
    company_name: string;
    email?: string;
    iban?: string | null;
    bic?: string | null;
  };
}

interface PurchaseInvoiceBulkActionsProps {
  selectedInvoices: PurchaseInvoice[];
  onClearSelection: () => void;
}

export const PurchaseInvoiceBulkActions = ({
  selectedInvoices,
  onClearSelection,
}: PurchaseInvoiceBulkActionsProps) => {
  const queryClient = useQueryClient();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSepaModal, setShowSepaModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState(0);
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);

  const totalAmount = selectedInvoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async (newStatus: PurchaseInvoiceStatus) => {
      const ids = selectedInvoices.map((i) => i.id);
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === "betaald") {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("purchase_invoices")
        .update(updateData)
        .in("id", ids);

      if (error) throw error;
      return { count: ids.length, status: newStatus };
    },
    onSuccess: ({ count, status }) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast({
        title: "Status bijgewerkt",
        description: `${count} facturen gewijzigd naar ${status}`,
      });
      onClearSelection();
      setBulkStatus("");
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken",
        variant: "destructive",
      });
    },
  });

  // Bulk payment mutation
  const bulkPaymentMutation = useMutation({
    mutationFn: async (paymentRef: string) => {
      const ids = selectedInvoices
        .filter((i) => i.status !== "betaald")
        .map((i) => i.id);

      if (ids.length === 0) return { count: 0 };

      const { error } = await supabase
        .from("purchase_invoices")
        .update({
          status: "betaald",
          paid_at: new Date().toISOString(),
          payment_reference: paymentRef,
        })
        .in("id", ids);

      if (error) throw error;
      return { count: ids.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast({
        title: "Betalingen geregistreerd",
        description: `${count} facturen als betaald gemarkeerd`,
      });
      onClearSelection();
      setShowPaymentModal(false);
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon betalingen niet registreren",
        variant: "destructive",
      });
    },
  });

  // Bulk email sending
  const handleBulkEmailSend = async () => {
    setIsSendingBulkEmail(true);
    setBulkEmailProgress(0);
    
    const invoicesWithEmail = selectedInvoices.filter(inv => inv.carriers.email);
    
    if (invoicesWithEmail.length === 0) {
      toast({
        title: "Geen e-mailadressen",
        description: "Geen van de geselecteerde facturen heeft een charter met e-mailadres.",
        variant: "destructive",
      });
      setIsSendingBulkEmail(false);
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < invoicesWithEmail.length; i++) {
      const inv = invoicesWithEmail[i];
      
      try {
        const { error } = await supabase.functions.invoke("send-purchase-invoice-email", {
          body: {
            purchase_invoice_id: inv.id,
            recipient_emails: [inv.carriers.email],
            email_subject: `Inkoopfactuur ${inv.invoice_number}`,
            email_body: `Geachte ${inv.carriers.company_name},\n\nBijgevoegd vindt u de inkoopfactuur ${inv.invoice_number}.\n\nMet vriendelijke groet`,
            include_pdf: true,
          },
        });
        
        if (error) {
          console.error(`Failed to send ${inv.invoice_number}:`, error);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error sending ${inv.invoice_number}:`, err);
        failCount++;
      }
      
      setBulkEmailProgress(Math.round(((i + 1) / invoicesWithEmail.length) * 100));
    }
    
    setIsSendingBulkEmail(false);
    setShowBulkEmailModal(false);
    queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    
    if (successCount > 0 && failCount === 0) {
      toast({
        title: "E-mails verzonden",
        description: `${successCount} facturen succesvol verzonden`,
      });
    } else if (successCount > 0) {
      toast({
        title: "Deels verzonden",
        description: `${successCount} succesvol, ${failCount} mislukt`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verzenden mislukt",
        description: "Kon geen e-mails verzenden",
        variant: "destructive",
      });
    }
    
    onClearSelection();
  };

  const handleExportExcel = () => {
    // Generate CSV export
    const headers = ["Factuurnummer", "Charter", "Bedrag", "Status"];
    const rows = selectedInvoices.map((inv) => [
      inv.invoice_number,
      inv.carriers.company_name,
      inv.total_amount.toString(),
      inv.status,
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.join(";")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inkoopfacturen_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export gedownload",
      description: `${selectedInvoices.length} facturen geëxporteerd`,
    });
  };

  const handleBulkStatusChange = (status: string) => {
    setBulkStatus(status);
    if (status) {
      bulkStatusMutation.mutate(status as PurchaseInvoiceStatus);
    }
  };

  if (selectedInvoices.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] md:max-w-2xl"
        >
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 md:gap-4 px-3 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl overflow-x-auto scrollbar-none",
              "bg-background/95 backdrop-blur-xl border border-border/50",
            )}
          >
            {/* Selection info */}
            <div className="flex items-center gap-3 pr-4 border-r border-border">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <span className="text-lg font-bold text-primary">
                  {selectedInvoices.length}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">Geselecteerd</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-1">
              {/* Bulk status change */}
              <Select
                value={bulkStatus}
                onValueChange={handleBulkStatusChange}
                disabled={bulkStatusMutation.isPending}
              >
                <SelectTrigger className="w-[160px] h-9">
                  {bulkStatusMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SelectValue placeholder="Wijzig status" />
                  )}
                </SelectTrigger>
                <SelectContent className="z-[60] bg-background">
                  <SelectItem value="definitief">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                      Definitief
                    </div>
                  </SelectItem>
                  <SelectItem value="verzonden">
                    <div className="flex items-center gap-2">
                      <Send className="h-3 w-3 text-indigo-500" />
                      Verzonden
                    </div>
                  </SelectItem>
                  <SelectItem value="goedgekeurd">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                      Goedgekeurd
                    </div>
                  </SelectItem>
                  <SelectItem value="betwist">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      Betwist
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Bulk payment */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaymentModal(true)}
                disabled={bulkPaymentMutation.isPending}
                className="gap-1.5"
              >
                {bulkPaymentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Betaling</span>
              </Button>

              {/* Bulk email */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkEmailModal(true)}
                disabled={isSendingBulkEmail}
                className="gap-1.5"
              >
                {isSendingBulkEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">E-mail</span>
              </Button>

              {/* SEPA Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSepaModal(true)}
                className="gap-1.5"
              >
                <Landmark className="h-4 w-4" />
                <span className="hidden sm:inline">SEPA</span>
              </Button>

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-1.5"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bulk Payment Modal */}
      <PaymentRegistrationModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        invoiceId=""
        invoiceNumber={`${selectedInvoices.length} facturen`}
        totalAmount={totalAmount}
        onPaymentRegistered={(ref) => {
          bulkPaymentMutation.mutate(ref);
        }}
        isBulk
      />

      {/* SEPA Export Modal */}
      <SEPAExportModal
        open={showSepaModal}
        onOpenChange={setShowSepaModal}
        invoices={selectedInvoices}
        onExportComplete={onClearSelection}
      />

      {/* Bulk Email Confirmation Modal */}
      <Dialog open={showBulkEmailModal} onOpenChange={setShowBulkEmailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Bulk e-mail verzenden
            </DialogTitle>
            <DialogDescription>
              {selectedInvoices.filter(inv => inv.carriers.email).length} van {selectedInvoices.length} facturen hebben een e-mailadres.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isSendingBulkEmail ? (
              <div className="space-y-4">
                <Progress value={bulkEmailProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Verzenden... {bulkEmailProgress}%
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">
                  De volgende facturen worden verzonden naar de gekoppelde charters:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {selectedInvoices.filter(inv => inv.carriers.email).map(inv => (
                    <div key={inv.id} className="flex justify-between text-sm py-1 px-2 rounded bg-muted/50">
                      <span className="font-medium">{inv.invoice_number}</span>
                      <span className="text-muted-foreground">{inv.carriers.company_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkEmailModal(false)} disabled={isSendingBulkEmail}>
              Annuleren
            </Button>
            <Button onClick={handleBulkEmailSend} disabled={isSendingBulkEmail} className="gap-2">
              {isSendingBulkEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Verzenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

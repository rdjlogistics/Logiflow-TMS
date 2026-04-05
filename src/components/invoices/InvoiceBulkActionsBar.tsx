import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Send, 
  Bell, 
  CheckCircle, 
  FileDown, 
  ChevronDown,
  Mail,
  MessageSquare,
  Phone,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number;
  customers?: {
    company_name?: string;
    email?: string;
    phone?: string;
  };
}

interface InvoiceBulkActionsBarProps {
  selectedInvoices: Invoice[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function InvoiceBulkActionsBar({
  selectedInvoices,
  onClearSelection,
  onRefresh,
}: InvoiceBulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const { isActive } = useSubscriptionPlan();

  const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const hasEmail = selectedInvoices.some(inv => inv.customers?.email);
  const hasPhone = selectedInvoices.some(inv => inv.customers?.phone);

  const handleSendReminder = async (channel: "email" | "whatsapp" | "sms" | "all") => {
    setIsProcessing(true);
    setProcessingAction(`reminder-${channel}`);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const invoice of selectedInvoices) {
        try {
          const response = await supabase.functions.invoke("send-invoice-reminder", {
            body: {
              invoiceId: invoice.id,
              channel,
              reminderType: "first",
            },
          });

          if (response.error) {
            errorCount++;
          } else if (response.data?.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} herinnering(en) verzonden`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} herinnering(en) mislukt`);
      }

      onRefresh();
      onClearSelection();
    } catch (error: any) {
      console.error("Bulk reminder error:", error);
      toast.error(`Fout bij verzenden herinneringen: ${error?.message || "Onbekende fout"}`);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsProcessing(true);
    setProcessingAction("mark-paid");

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "betaald" })
        .in("id", selectedInvoices.map(inv => inv.id));

      if (error) throw error;

      toast.success(`${selectedInvoices.length} facturen gemarkeerd als betaald`);
      onRefresh();
      onClearSelection();
    } catch (error: any) {
      console.error("Mark as paid error:", error);
      toast.error(`Fout bij markeren als betaald: ${error?.message || "Onbekende fout"}`);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleExport = async () => {
    if (!isActive) {
      toast.error("Upgrade je pakket om te exporteren");
      return;
    }
    setIsProcessing(true);
    setProcessingAction("export");

    try {
      // Create CSV content
      const headers = ["Factuurnummer", "Klant", "Bedrag", "Status", "Vervaldatum"];
      const rows = selectedInvoices.map(inv => [
        inv.invoice_number,
        inv.customers?.company_name || "",
        inv.total_amount.toFixed(2),
        inv.status,
        "", // Would need due_date in selected invoices
      ]);

      const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `facturen-export-${new Date().toISOString().split("T")[0]}.csv`);
      link.click();

      toast.success("Export gedownload");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Fout bij exporteren");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  if (selectedInvoices.length === 0) return null;

  return (
      <div
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] md:max-w-2xl animate-fade-in"
      >
        <div className="flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-4 py-3 bg-card border border-border shadow-xl rounded-xl backdrop-blur-lg overflow-x-auto scrollbar-none">
          {/* Selection Info */}
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            <Badge variant="secondary" className="font-mono">
              {selectedInvoices.length}
            </Badge>
            <span className="text-sm text-muted-foreground">
              geselecteerd
            </span>
            <span className="text-sm font-medium">
              €{totalAmount.toLocaleString("nl-NL", { minimumFractionDigits: 0 })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Send Reminder Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isProcessing}
                >
                  {processingAction?.startsWith("reminder") ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                   <Bell className="h-4 w-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">Herinnering</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem 
                  onClick={() => handleSendReminder("email")}
                  disabled={!hasEmail}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Via Email
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleSendReminder("whatsapp")}
                  disabled={!hasPhone}
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                  Via WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleSendReminder("sms")}
                  disabled={!hasPhone}
                >
                  <Phone className="h-4 w-4 mr-2 text-blue-500" />
                  Via SMS
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleSendReminder("all")}
                  disabled={!hasEmail && !hasPhone}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Alle kanalen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mark as Paid */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAsPaid}
              disabled={isProcessing}
            >
              {processingAction === "mark-paid" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
              )}
              <span className="hidden sm:inline">Betaald</span>
            </Button>

            {/* Export */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              disabled={isProcessing}
            >
              {processingAction === "export" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          {/* Clear Selection */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
  );
}

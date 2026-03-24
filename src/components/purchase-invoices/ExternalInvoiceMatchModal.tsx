import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExternalInvoiceMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  expectedAmount: number;
  onSuccess: () => void;
}

export const ExternalInvoiceMatchModal = ({
  open,
  onOpenChange,
  invoiceId,
  expectedAmount,
  onSuccess,
}: ExternalInvoiceMatchModalProps) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [amount, setAmount] = useState("");

  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;
  const difference = parsedAmount - expectedAmount;
  const hasDifference = Math.abs(difference) > 0.01;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("purchase_invoices")
        .update({
          external_invoice_number: invoiceNumber,
          external_invoice_date: invoiceDate || null,
          external_invoice_amount: parsedAmount,
          external_invoice_received_at: new Date().toISOString(),
          amount_difference: difference,
          status: hasDifference ? "betwist" : "ontvangen",
        })
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        hasDifference
          ? "Factuur gekoppeld - verschil gedetecteerd"
          : "Factuur gekoppeld en gematcht"
      );
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error("Kon factuur niet koppelen");
    },
  });

  const resetForm = () => {
    setInvoiceNumber("");
    setInvoiceDate("");
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Factuur van charter koppelen
          </DialogTitle>
          <DialogDescription>
            Vul de gegevens van de ontvangen factuur in om te matchen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-number">Factuurnummer</Label>
            <Input
              id="invoice-number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Bijv. INV-2025-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-date">Factuurdatum</Label>
            <Input
              id="invoice-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Bedrag (incl. BTW)</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </div>

          {/* Comparison */}
          {parsedAmount > 0 && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Onze berekening:</span>
                <span className="font-medium">{formatCurrency(expectedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hun factuur:</span>
                <span className="font-medium">{formatCurrency(parsedAmount)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="text-muted-foreground">Verschil:</span>
                {hasDifference ? (
                  <span className="font-medium text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {difference > 0 ? "+" : ""}
                    {formatCurrency(difference)}
                  </span>
                ) : (
                  <span className="font-medium text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Match
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={() => linkMutation.mutate()}
            disabled={!invoiceNumber || !amount || linkMutation.isPending}
          >
            {linkMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {hasDifference ? "Accepteren & Review" : "Koppelen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

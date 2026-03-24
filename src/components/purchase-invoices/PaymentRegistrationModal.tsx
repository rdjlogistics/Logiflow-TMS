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
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PaymentRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber?: string;
  totalAmount: number;
  onSuccess?: () => void;
  onPaymentRegistered?: (reference: string) => void;
  isBulk?: boolean;
}

export const PaymentRegistrationModal = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  totalAmount,
  onSuccess,
  onPaymentRegistered,
  isBulk = false,
}: PaymentRegistrationModalProps) => {
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState(totalAmount.toFixed(2).replace(".", ","));
  const [reference, setReference] = useState("");

  const parsedAmount = parseFloat(amount.replace(",", ".")) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (isBulk) {
        // Bulk payment is handled by parent component
        return;
      }

      const { error } = await supabase
        .from("purchase_invoices")
        .update({
          paid_at: paymentDate,
          paid_amount: parsedAmount,
          payment_reference: reference || null,
          status: "betaald",
        })
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (isBulk && onPaymentRegistered) {
        onPaymentRegistered(reference);
        return;
      }
      toast({
        title: "Betaling geregistreerd",
        description: "De factuur is als betaald gemarkeerd",
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon betaling niet registreren",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (isBulk && onPaymentRegistered) {
      onPaymentRegistered(reference);
    } else {
      paymentMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Betaling registreren
          </DialogTitle>
          <DialogDescription>
            {isBulk
              ? `Registreer betaling voor ${invoiceNumber}`
              : "Registreer de uitgevoerde betaling voor deze inkoopfactuur"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Te betalen</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-date">Betaaldatum</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          {!isBulk && (
            <div className="space-y-2">
              <Label htmlFor="paid-amount">Betaald bedrag</Label>
              <Input
                id="paid-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reference">Betalingskenmerk (optioneel)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bijv. bank transactie ID"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!paymentDate || (!isBulk && parsedAmount <= 0) || paymentMutation.isPending}
          >
            {paymentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Betaling registreren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

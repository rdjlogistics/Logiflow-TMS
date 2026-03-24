import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

interface PaymentRegistrationModalProps {
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    customer_id: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PaymentRegistrationModal({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: PaymentRegistrationModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: invoice.total_amount,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "bank_transfer",
    reference: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (formData.amount <= 0) {
      toast({ title: "Voer een geldig bedrag in", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {

      // Update invoice status to 'betaald' if fully paid
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "betaald",
          paid_at: formData.payment_date,
        })
        .eq("id", invoice.id);

      if (updateError) throw updateError;

      toast({ 
        title: "Betaling geregistreerd",
        description: `€${formData.amount.toFixed(2)} ontvangen voor factuur ${invoice.invoice_number}`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error registering payment:", error);
      toast({ title: "Fout bij registreren betaling", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Betaling Registreren
          </DialogTitle>
          <DialogDescription>
            Registreer een betaling voor factuur {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Factuurbedrag</span>
              <span className="font-semibold">€{invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ontvangen bedrag *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Betaaldatum</Label>
            <Input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Betaalwijze</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Overschrijving</SelectItem>
                <SelectItem value="direct_debit">Incasso</SelectItem>
                <SelectItem value="cash">Contant</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Referentie</Label>
            <Input
              placeholder="Betalingskenmerk..."
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notitie</Label>
            <Textarea
              placeholder="Optionele notitie..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? "Opslaan..." : "Betaling registreren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

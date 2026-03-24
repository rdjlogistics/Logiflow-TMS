import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CreditCard, Copy, ExternalLink, Loader2, CheckCircle } from "lucide-react";

interface MolliePaymentButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  existingPaymentLink?: string | null;
  onPaymentLinkCreated?: (url: string) => void;
}

export function MolliePaymentButton({
  invoiceId,
  invoiceNumber,
  totalAmount,
  amountPaid,
  existingPaymentLink,
  onPaymentLinkCreated,
}: MolliePaymentButtonProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(existingPaymentLink || null);
  const [copied, setCopied] = useState(false);

  const amountDue = totalAmount - (amountPaid || 0);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mollie-create-payment", {
        body: { invoice_id: invoiceId },
      });
      if (error) throw error;
      if (!data?.payment_url) throw new Error("Geen betaallink ontvangen");
      return data;
    },
    onSuccess: (data) => {
      setPaymentUrl(data.payment_url);
      setDialogOpen(true);
      onPaymentLinkCreated?.(data.payment_url);
      toast({
        title: "Betaallink aangemaakt",
        description: `iDEAL betaallink voor €${amountDue.toFixed(2)} is klaar.`,
      });
    },
    onError: (error: Error) => {
      const isMissingKey = error.message?.includes("MOLLIE_API_KEY");
      toast({
        title: isMissingKey ? "Mollie niet geconfigureerd" : "Fout bij aanmaken betaallink",
        description: isMissingKey
          ? "Mollie API-key is nog niet geconfigureerd. Neem contact op met de beheerder."
          : error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopy = async () => {
    if (!paymentUrl) return;
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Gekopieerd", description: "Betaallink staat in klembord." });
  };

  if (amountDue <= 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
        <CheckCircle className="h-4 w-4" />
        Volledig betaald
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {paymentUrl && (
          <Button
            variant="outline"
            className="gap-2.5 h-11 px-5 border-border/60 hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-600 transition-all duration-300"
            onClick={() => setDialogOpen(true)}
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Betaallink</span>
          </Button>
        )}
        <Button
          variant="outline"
          className="gap-2.5 h-11 px-5 border-border/60 hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-600 transition-all duration-300"
          onClick={() => createPaymentMutation.mutate()}
          disabled={createPaymentMutation.isPending}
        >
          {createPaymentMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{paymentUrl ? "Nieuwe link" : "iDEAL"}</span>
          <span className="sm:hidden">iDEAL</span>
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>iDEAL Betaallink</DialogTitle>
            <DialogDescription>
              Betaallink voor factuur {invoiceNumber} — €{amountDue.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          {paymentUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground break-all flex-1 font-mono">
                  {paymentUrl}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Gekopieerd!" : "Kopieer link"}
                </Button>
                <Button
                  className="flex-1"
                  variant="default"
                  onClick={() => window.open(paymentUrl, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Openen
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Deel deze link met de klant. Zodra betaald wordt de factuurstatus automatisch bijgewerkt.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

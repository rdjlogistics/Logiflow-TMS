import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { notifyCustomerStatusChange } from "@/lib/customerNotifications";
import { sendDeliveryConfirmation } from "@/lib/email";

interface OrderCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  customerId?: string | null;
  orderNumber?: string | null;
  onComplete: () => void;
}

const OrderCompleteDialog = ({ open, onOpenChange, orderId, customerId, orderNumber, onComplete }: OrderCompleteDialogProps) => {
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [perStop, setPerStop] = useState(false);
  const [extraRecipients, setExtraRecipients] = useState<string[]>([]);
  const { toast } = useToast();

  const [checkoutMode, setCheckoutMode] = useState<string>('to_planning');

  // Load customer delivery confirmation settings
  useEffect(() => {
    if (!open || !customerId) return;

    const loadSettings = async () => {
      const { data } = await supabase
        .from("customer_settings")
        .select("delivery_confirmation_enabled, delivery_confirmation_per_stop, delivery_confirmation_recipients, checkout_mode")
        .eq("customer_id", customerId)
        .limit(1)
        .maybeSingle();

      if (data) {
        setSendConfirmation((data as any).delivery_confirmation_enabled ?? true);
        setPerStop((data as any).delivery_confirmation_per_stop ?? false);
        setExtraRecipients((data as any).delivery_confirmation_recipients || []);
        setCheckoutMode((data as any).checkout_mode ?? 'to_planning');
      } else {
        // Fall back to tenant defaults
        const { data: tenant } = await supabase
          .from("tenant_settings")
          .select("default_delivery_confirmation_enabled, default_delivery_confirmation_per_stop")
          .limit(1)
          .maybeSingle();

        if (tenant) {
          setSendConfirmation((tenant as any).default_delivery_confirmation_enabled ?? true);
          setPerStop((tenant as any).default_delivery_confirmation_per_stop ?? false);
        }
      }
    };

    loadSettings();
  }, [open, customerId]);

  // Auto-checkout: if checkout_mode is direct_complete, skip dialog and complete immediately
  useEffect(() => {
    if (open && checkoutMode === 'direct_complete') {
      handleComplete();
    }
  }, [open, checkoutMode]);

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      // Validate current trip status — only allow checkout from valid pre-completion states
      const { data: tripData } = await supabase
        .from("trips")
        .select("status")
        .eq("id", orderId)
        .single();

      const validPreCheckoutStatuses = ['onderweg', 'afgeleverd'];
      if (tripData && !validPreCheckoutStatuses.includes(tripData.status)) {
        throw new Error(`Order kan niet worden afgemeld vanuit status "${tripData.status}"`);
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Update order status with checkout tracking
      const { error } = await supabase
        .from("trips")
        .update({ 
          status: "afgerond",
          actual_arrival: new Date().toISOString(),
          checkout_completed_at: new Date().toISOString(),
          checkout_completed_by: user?.id || null,
        } as any)
        .eq("id", orderId);

      if (error) throw error;

      // Log event with detailed payload
      await supabase.from("order_events").insert({
        order_id: orderId,
        event_type: "STATUS_UPDATED",
        actor_user_id: user?.id || null,
        payload: { 
          old_value: tripData?.status || "unknown",
          new_value: "afgerond",
          source: "order_complete_dialog",
          send_confirmation: sendConfirmation,
          per_stop: perStop,
          extra_recipients: extraRecipients,
        },
      });

      // Send delivery confirmation via queue if requested
      if (sendConfirmation) {
        // Fetch trip + customer data for the email
        const { data: tripWithCustomer } = await supabase
          .from("trips")
          .select("delivery_address, delivery_city, order_number, customers(company_name, contact_name, email)")
          .eq("id", orderId)
          .single();

        const customer = (tripWithCustomer as any)?.customers;
        const recipientEmails: string[] = [];
        if (customer?.email) recipientEmails.push(customer.email);
        if (extraRecipients.length > 0) recipientEmails.push(...extraRecipients);

        if (recipientEmails.length > 0) {
          for (const email of recipientEmails) {
            await sendDeliveryConfirmation({
              orderNumber: tripWithCustomer?.order_number || orderNumber || "",
              customerName: customer?.contact_name || customer?.company_name || "",
              recipientEmail: email,
              deliveryAddress: tripWithCustomer?.delivery_address || "",
              deliveryCity: tripWithCustomer?.delivery_city || "",
              deliveredAt: new Date().toLocaleString("nl-NL"),
            });
          }
        }
      }

      // Auto-send vrachtbrief if tenant setting enabled
      try {
        const { data: tenantSettings } = await supabase
          .from("tenant_settings")
          .select("auto_send_pod_email")
          .limit(1)
          .maybeSingle();
        if (tenantSettings?.auto_send_pod_email) {
          supabase.functions.invoke("auto-send-vrachtbrief", {
            body: { tripId: orderId },
          }).catch(err => console.error("Auto-send vrachtbrief error:", err));
        }
      } catch (err) {
        console.error("Error checking tenant settings:", err);
      }

      // Notify B2B customer of status change
      notifyCustomerStatusChange(customerId, orderId, "afgerond", orderNumber);

      toast({ title: "Order afgemeld", description: "De order is succesvol afgerond" });
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: "Fout bij afmelden", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Order afmelden</AlertDialogTitle>
          <AlertDialogDescription>
            Weet je zeker dat je deze order wilt afmelden? De status wordt gewijzigd naar "Afgerond".
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="sendConfirmation"
              checked={sendConfirmation}
              onCheckedChange={(checked) => setSendConfirmation(checked as boolean)}
            />
            <Label htmlFor="sendConfirmation" className="text-sm flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Stuur afleverbevestiging naar klant
            </Label>
          </div>

          {sendConfirmation && perStop && (
            <div className="ml-6 text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              E-mail wordt per bestemming verstuurd
            </div>
          )}

          {sendConfirmation && extraRecipients.length > 0 && (
            <div className="ml-6 flex flex-wrap gap-1">
              {extraRecipients.map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={handleComplete} disabled={isCompleting}>
            {isCompleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Afmelden...
              </>
            ) : (
              "Afmelden"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default OrderCompleteDialog;

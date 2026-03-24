import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Mail, Send, Clock, User, Loader2, CheckCircle2 } from "lucide-react";

interface DeliveryConfirmationHeaderProps {
  tripId: string;
  checkoutCompletedAt: string | null;
  checkoutCompletedBy: string | null;
  deliveryConfirmationSentAt: string | null;
  completedByName?: string | null;
  onResend?: () => void;
}

const DeliveryConfirmationHeader = ({
  tripId,
  checkoutCompletedAt,
  checkoutCompletedBy,
  deliveryConfirmationSentAt,
  completedByName,
}: DeliveryConfirmationHeaderProps) => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  if (!checkoutCompletedAt) return null;

  const handleResend = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-delivery-confirmation", {
        body: { tripId },
      });

      if (error) throw error;

      if (data?.emailSent) {
        toast({ title: "Afleverbevestiging verstuurd", description: `Verstuurd naar ${data.recipientCount || 1} ontvanger(s)` });
      } else {
        toast({ title: "Niet verstuurd", description: data?.reason === "customer_disabled" ? "Klant heeft bevestigingen uitgeschakeld" : "Geen ontvangers geconfigureerd", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Fout bij versturen", description: error.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return format(new Date(iso), "dd-MM-yyyy HH:mm", { locale: nl });
    } catch {
      return "-";
    }
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Order afgemeld
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(checkoutCompletedAt)}
              </span>
              {completedByName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {completedByName}
                </span>
              )}
              {deliveryConfirmationSentAt && (
                <Badge variant="outline" className="text-[10px] gap-1 border-blue-300 text-blue-700 dark:text-blue-400 dark:border-blue-700">
                  <Mail className="h-2.5 w-2.5" />
                  Bevestiging verstuurd {formatDateTime(deliveryConfirmationSentAt)}
                </Badge>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resending}
            className="shrink-0"
          >
            {resending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            {deliveryConfirmationSentAt ? "Opnieuw versturen" : "Bevestiging versturen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeliveryConfirmationHeader;

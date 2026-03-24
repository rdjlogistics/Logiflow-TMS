import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { sendSms, smsTemplates } from "@/lib/sms";

interface DriverSmsButtonProps {
  driverName: string;
  driverPhone: string | null;
  tripId?: string;
  driverId?: string;
  orderNumber?: string;
  pickupAddress?: string;
  pickupTime?: string;
  variant?: "icon" | "button";
}

export function DriverSmsButton({
  driverName,
  driverPhone,
  tripId,
  driverId,
  orderNumber,
  pickupAddress,
  pickupTime,
  variant = "button",
}: DriverSmsButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    orderNumber && pickupAddress && pickupTime
      ? smsTemplates.tripAssigned(driverName, orderNumber, pickupAddress, pickupTime)
      : `Hallo ${driverName}, je hebt een nieuwe opdracht. Bekijk de details in de LogiFlow app.`
  );

  const smsMutation = useMutation({
    mutationFn: async () => {
      if (!driverPhone) throw new Error("Geen telefoonnummer bekend voor deze chauffeur");
      return sendSms({ to: driverPhone, message, trip_id: tripId, driver_id: driverId, type: "dispatch" });
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "SMS verzonden", description: `Bericht verzonden naar ${driverName}` });
        setOpen(false);
      } else {
        toast({ title: "SMS fout", description: result.error || "Verzenden mislukt", variant: "destructive" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "SMS fout", description: err.message, variant: "destructive" });
    },
  });

  if (!driverPhone) return null;

  return (
    <>
      {variant === "icon" ? (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(true)} title="SMS sturen">
          <MessageSquare className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          SMS sturen
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>SMS naar {driverName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Naar: {driverPhone}</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Bericht</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none text-sm"
                maxLength={1600}
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/1600</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuleren</Button>
            <Button
              onClick={() => smsMutation.mutate()}
              disabled={smsMutation.isPending || !message.trim()}
              className="gap-2"
            >
              {smsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

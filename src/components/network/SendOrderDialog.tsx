import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface SendOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCompany: { id: string; name: string } | null;
}

interface Order {
  id: string;
  order_number: string;
  pickup_city: string;
  delivery_city: string;
  trip_date: string;
  status: string;
}

export const SendOrderDialog = ({ open, onOpenChange, targetCompany }: SendOrderDialogProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      fetchOrders();
    }
  }, [open]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("id, order_number, pickup_city, delivery_city, trip_date, status")
      .in("status", ["gepland", "onderweg"])
      .is("deleted_at", null)
      .order("trip_date", { ascending: true })
      .limit(20);
    
    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!selectedOrderId || !targetCompany) {
      toast.error("Selecteer een order");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: `Opdracht verzonden: ${selectedOrder?.order_number}`,
        message: message || `Order ${selectedOrder?.order_number} (${selectedOrder?.pickup_city} → ${selectedOrder?.delivery_city}) is naar ${targetCompany.name} gestuurd.`,
        type: "order_sent",
        channel: "push",
        metadata: {
          order_id: selectedOrderId,
          target_company_id: targetCompany.id,
          target_company_name: targetCompany.name,
          order_number: selectedOrder?.order_number,
        },
      });
      if (error) throw error;
      
      toast.success("Opdracht verzonden", {
        description: `Order is verstuurd naar ${targetCompany.name}. Ze ontvangen een notificatie.`
      });
      onOpenChange(false);
      setSelectedOrderId("");
      setMessage("");
    } catch (err: any) {
      toast.error("Fout bij verzenden", { description: err.message });
    }
    setSending(false);
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Opdracht versturen
          </DialogTitle>
          <DialogDescription>
            Stuur een opdracht naar {targetCompany?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Selecteer order</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Geen beschikbare orders</p>
              </div>
            ) : (
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kies een order..." />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{order.order_number}</span>
                        <span className="text-muted-foreground">
                          {order.pickup_city} → {order.delivery_city}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedOrder && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedOrder.order_number}</span>
                <Badge variant="secondary">{selectedOrder.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedOrder.pickup_city} → {selectedOrder.delivery_city}
              </p>
              <p className="text-sm text-muted-foreground">
                Datum: {new Date(selectedOrder.trip_date).toLocaleDateString('nl-NL')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Bericht (optioneel)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Voeg een bericht toe voor de ontvanger..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!selectedOrderId || sending}
            className="gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Versturen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

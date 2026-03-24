import { useState } from "react";
import type { TripStatus } from "@/types/supabase-helpers";
import { NavigationChooser } from "@/components/shared/NavigationChooser";
import { useNavigate } from "react-router-dom";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { notifyCustomerStatusChange } from "@/lib/customerNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Map,
  MessageSquare,
  UserPlus,
  Shield,
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import OrderStatusBadge from "./OrderStatusBadge";
import { cn } from "@/lib/utils";

interface RouteStop {
  id: string;
  stop_order: number;
  stop_type: string;
  address: string;
  city: string | null;
}

interface OrderCompactRowProps {
  trip: {
    id: string;
    order_number: string | null;
    trip_date: string;
    status: string;
    driver_id: string | null;
    carrier_id: string | null;
    customer_id: string | null;
    vehicle_id: string | null;
    pickup_city: string | null;
    delivery_city: string | null;
    sales_total: number | null;
    purchase_total: number | null;
    gross_profit: number | null;
    profit_margin_pct: number | null;
    customers?: { company_name: string } | null;
    carriers?: { company_name: string } | null;
    vehicles?: { license_plate: string } | null;
  };
  stops: RouteStop[];
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenDrawer: () => void;
}

const OrderCompactRow = ({
  trip,
  stops,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  onOpenDrawer,
}: OrderCompactRowProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const needsDriver = !trip.driver_id && !trip.carrier_id;
  const computedProfit = (trip.sales_total || 0) - (trip.purchase_total || 0);
  const computedMarginPct = (trip.sales_total || 0) > 0
    ? (computedProfit / (trip.sales_total || 1)) * 100
    : 0;
  const marginClass = computedProfit > 0 ? "text-success" : "text-destructive";
  const fmtCurrency = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const rowStatusClass = trip.status === "aanvraag"
    ? "bg-amber-500/8 hover:bg-amber-500/15 border-l-4 border-l-amber-500"
    : needsDriver
      ? "bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive"
      : trip.status === "afgerond"
        ? "bg-blue-800/5 hover:bg-blue-800/10 border-l-4 border-l-blue-800"
        : trip.status === "afgeleverd"
          ? "bg-green-500/5 hover:bg-green-500/10 border-l-4 border-l-green-500"
          : trip.status === "gecontroleerd"
            ? "bg-purple-500/5 hover:bg-purple-500/10 border-l-4 border-l-purple-500"
            : trip.status === "onderweg"
              ? "bg-blue-500/5 hover:bg-blue-500/10 border-l-4 border-l-blue-500"
              : "hover:bg-muted/50 border-l-4 border-l-transparent";

  // Get route summary
  const pickupStop = stops.find(s => s.stop_type === 'pickup') || stops[0];
  const deliveryStop = stops.find(s => s.stop_type === 'delivery') || stops[stops.length - 1];
  const routeFrom = pickupStop?.city || trip.pickup_city || '-';
  const routeTo = deliveryStop?.city || trip.delivery_city || '-';

  // Proof chips - check from actual order data
  const hasPOD = stops.some(s => (s as any).pod_signature || (s as any).pod_photo_url);
  const hasWaitingTime = (trip as any).wait_time_minutes > 0;
  const hasHold = (trip as any).has_hold || false;
  const hasInvoice = trip.status === 'gefactureerd';

  const handleAcceptAanvraag = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'gepland' satisfies TripStatus })
        .eq('id', trip.id);
      if (error) throw error;

      // Notify B2B customer
      notifyCustomerStatusChange(trip.customer_id, trip.id, 'gepland', trip.order_number);

      // Log order event
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        await supabase.from('order_events').insert({
          order_id: trip.id,
          event_type: 'STATUS_UPDATED',
          payload: { old_value: 'aanvraag', new_value: 'gepland', source: 'compact_row_accept' },
          actor_user_id: userId,
        });
      } catch { /* event logging non-blocking */ }

      // Fetch customer info for confirmation email
      if (trip.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('email, company_name, contact_name')
          .eq('id', trip.customer_id)
          .single();

        if (customer?.email) {
          const pickupStop = stops.find(s => s.stop_type === 'pickup') || stops[0];
          const deliveryStop = stops.find(s => s.stop_type === 'delivery') || stops[stops.length - 1];
          try {
            await supabase.functions.invoke('send-order-confirmation', {
              body: {
                tripId: trip.id,
                customerEmail: customer.email,
                customerName: customer.contact_name || customer.company_name,
                orderNumber: trip.order_number || '-',
                pickupAddress: pickupStop?.address || '',
                pickupCity: pickupStop?.city || trip.pickup_city || '',
                pickupDate: trip.trip_date,
                pickupTimeWindow: null,
                deliveryAddress: deliveryStop?.address || '',
                deliveryCity: deliveryStop?.city || trip.delivery_city || '',
                deliveryDate: null,
                deliveryTimeWindow: null,
                specialInstructions: null,
              },
            });
          } catch { /* email non-blocking */ }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({ title: "Aanvraag geaccepteerd", description: `Order ${trip.order_number} is ingepland en bevestigingsmail verstuurd.` });
    } catch {
      toast({ title: "Fout", description: "Kon aanvraag niet accepteren.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectAanvraag = async () => {
    if (!rejectReason.trim()) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'geannuleerd' satisfies TripStatus })
        .eq('id', trip.id);
      if (error) throw error;

      // Notify B2B customer
      notifyCustomerStatusChange(trip.customer_id, trip.id, 'geannuleerd', trip.order_number);

      // Log order event
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        await supabase.from('order_events').insert({
          order_id: trip.id,
          event_type: 'STATUS_UPDATED',
          payload: { old_value: 'aanvraag', new_value: 'geannuleerd', source: 'compact_row_reject' },
          actor_user_id: userId,
        });
      } catch { /* event logging non-blocking */ }

      // Send rejection email
      if (trip.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('email, company_name, contact_name')
          .eq('id', trip.customer_id)
          .single();

        if (customer?.email) {
          try {
            await supabase.functions.invoke('send-order-rejection', {
              body: {
                customerEmail: customer.email,
                customerName: customer.contact_name || customer.company_name,
                orderNumber: trip.order_number || '-',
                rejectionReason: rejectReason,
              },
            });
          } catch { /* email non-blocking */ }
        }
      }

      setShowRejectDialog(false);
      setRejectReason("");
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({ title: "Aanvraag afgewezen", description: `Order ${trip.order_number} is geannuleerd en afwijzingsmail verstuurd.` });
    } catch {
      toast({ title: "Fout", description: "Kon aanvraag niet afwijzen.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <TableRow
      className={cn(rowStatusClass, "cursor-pointer transition-colors")}
      onClick={() => navigate(`/orders/edit/${trip.id}`)}
    >
      <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(!!checked)}
        />
      </TableCell>

      {/* Order nr + Status */}
      <TableCell className="min-w-[120px]">
        <div className="space-y-1">
          <span className="font-semibold text-sm">{trip.order_number || "Concept"}</span>
          <div>
            <OrderStatusBadge
              status={trip.status}
              driverId={trip.driver_id}
              carrierId={trip.carrier_id}
              size="sm"
            />
          </div>
        </div>
      </TableCell>

      {/* Klant + Referentie */}
      <TableCell className="min-w-[150px]">
        <div className="space-y-0.5">
          <span className="font-medium text-sm truncate block max-w-[150px]">
            {trip.customers?.company_name || "-"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(trip.trip_date), "EEE d MMM", { locale: nl })}
          </span>
        </div>
      </TableCell>

      {/* Route */}
      <TableCell className="min-w-[180px]">
        <div className="flex items-center gap-2 text-xs">
          <span className="truncate max-w-[120px]">{routeFrom}</span>
          <span className="text-muted-foreground">→</span>
          <span className="truncate max-w-[120px]">{routeTo}</span>
          {stops.length > 2 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              +{stops.length - 2}
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Eigen chauffeur/Voertuig */}
      <TableCell className="min-w-[120px]">
        {needsDriver ? (
          <span className="text-xs text-destructive font-medium">Nog toewijzen</span>
        ) : (
          <div className="text-xs">
            <span className="block truncate max-w-[100px]">
              {trip.carriers?.company_name || 'Eigen vervoer'}
            </span>
            {trip.vehicles?.license_plate && (
              <span className="text-muted-foreground">{trip.vehicles.license_plate}</span>
            )}
          </div>
        )}
      </TableCell>

      {/* Verkoop / Inkoop / Marge */}
      <TableCell className="text-right tabular-nums text-xs">
        {fmtCurrency(trip.sales_total || 0)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-xs">
        {fmtCurrency(trip.purchase_total || 0)}
      </TableCell>
      <TableCell className="text-right">
        <div className={cn("text-xs font-medium tabular-nums", marginClass)}>
          {fmtCurrency(computedProfit)}
          <span className="text-[10px] ml-0.5">
            ({computedMarginPct.toFixed(0)}%)
          </span>
        </div>
      </TableCell>

      {/* Proof chips */}
      <TableCell className="min-w-[100px]">
        <div className="flex items-center gap-1 flex-wrap">
          {hasPOD && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-success/10 border-success/30 text-success">
              POD
            </Badge>
          )}
          {hasWaitingTime && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-warning/10 border-warning/30 text-warning">
              Wacht
            </Badge>
          )}
          {hasHold && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-destructive/10 border-destructive/30 text-destructive">
              Hold
            </Badge>
          )}
          {hasInvoice && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted border-muted-foreground/30">
              Fact
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {trip.status === 'aanvraag' && (
              <>
                <DropdownMenuItem onClick={handleAcceptAanvraag} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />}
                  Accepteren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowRejectDialog(true)} className="text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Afwijzen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {needsDriver && (
              <DropdownMenuItem onClick={() => navigate(`/orders/edit/${trip.id}?step=2`)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Eigen chauffeur toewijzen
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate(`/orders/edit/${trip.id}`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Bewerken
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenDrawer}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Details openen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowMapDialog(true)}>
              <Map className="h-4 w-4 mr-2" />
              Kaart openen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/messenger?tripId=${trip.id}`)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat openen
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(trip.status === 'afgeleverd' || trip.status === 'afgerond') && (
              <DropdownMenuItem 
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    const { error } = await supabase
                      .from('trips')
                      .update({ status: 'gecontroleerd' satisfies TripStatus })
                      .eq('id', trip.id);
                    
                    if (error) throw error;

                    // Log audit event
                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.from('order_events').insert({
                      order_id: trip.id,
                      event_type: 'STATUS_UPDATED',
                      actor_user_id: user?.id,
                      payload: { old_value: trip.status, new_value: 'gecontroleerd', source: 'compact_row_verify' },
                    } as any);

                    // Notify B2B customer
                    notifyCustomerStatusChange(trip.customer_id, trip.id, 'gecontroleerd', trip.order_number);
                    
                    await queryClient.invalidateQueries({ queryKey: ['trips'] });
                    toast({ 
                      title: "Status bijgewerkt", 
                      description: `Order ${trip.order_number || trip.id} is gemarkeerd als gecontroleerd.` 
                    });
                  } catch (err) {
                    toast({ 
                      title: "Fout", 
                      description: "Kon status niet bijwerken.", 
                      variant: "destructive" 
                    });
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                Markeer gecontroleerd
              </DropdownMenuItem>
            )}
            {trip.status === 'gecontroleerd' && (
              <DropdownMenuItem onClick={() => navigate(`/invoices?create=true&tripId=${trip.id}`)}>
                <FileText className="h-4 w-4 mr-2" />
                Factuur maken
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Dupliceren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Verwijderen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Map Dialog */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Route: {routeFrom} → {routeTo}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] bg-muted/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
            <div className="text-center">
              <Map className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Route kaart voor order {trip.order_number}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {routeFrom} → {routeTo}
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/dir/${encodeURIComponent(routeFrom)}/${encodeURIComponent(routeTo)}`, '_blank')}>
                  🗺️ Google Maps
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://waze.com/ul?q=${encodeURIComponent(routeTo)}&navigate=yes`, '_blank')}>
                  👻 Waze
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`https://maps.apple.com/?daddr=${encodeURIComponent(routeTo)}`, '_blank')}>
                  🍎 Kaarten
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aanvraag afwijzen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Reden voor afwijzing</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Geef een reden op voor de klant..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Annuleren</Button>
              <Button variant="destructive" onClick={handleRejectAanvraag} disabled={isUpdating || !rejectReason.trim()}>
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Afwijzen & mail versturen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
};

export default OrderCompactRow;

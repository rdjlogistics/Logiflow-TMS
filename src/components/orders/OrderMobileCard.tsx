import { useState, useMemo } from "react";
import type { TripStatus } from "@/types/supabase-helpers";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  MapPin,
  ChevronRight,
  Truck,
  Map,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import React from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import OrderStatusBadge from "./OrderStatusBadge";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import { QuickAssignDriverButton } from "./QuickAssignDriverButton";

interface RouteStop {
  id: string;
  stop_order: number;
  stop_type: string;
  address: string;
  city: string | null;
  status?: string | null;
}

interface Driver {
  id: string;
  name: string;
}

interface OrderMobileCardProps {
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
  onDuplicate: () => void;
  onDelete: () => void;
  onShowMap?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  drivers?: Driver[];
  onAssigned?: () => void;
}

const OrderMobileCard = ({
  trip,
  stops,
  onDuplicate,
  onDelete,
  onShowMap,
  selectionMode = false,
  selected = false,
  onSelect,
  drivers = [],
  onAssigned,
}: OrderMobileCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, role } = useUserRole();
  const canEdit = isAdmin || role === 'medewerker';
  const [showActions, setShowActions] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [thresholdReached, setThresholdReached] = useState<'left' | 'right' | null>(null);
  
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const editOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);

  React.useEffect(() => {
    const unsubscribe = x.on('change', (latest) => {
      if (latest > 80 && thresholdReached !== 'right') {
        setThresholdReached('right');
      } else if (latest < -80 && thresholdReached !== 'left') {
        setThresholdReached('left');
      } else if (latest > -60 && latest < 60 && thresholdReached !== null) {
        setThresholdReached(null);
      }
    });
    return unsubscribe;
  }, [x, thresholdReached]);

  const needsDriver = !trip.driver_id && !trip.carrier_id;
  const computedProfit = (trip.sales_total || 0) - (trip.purchase_total || 0);
  const computedMarginPct = (trip.sales_total || 0) > 0
    ? (computedProfit / (trip.sales_total || 1)) * 100
    : 0;
  const marginClass = computedProfit > 0 ? "text-success" : "text-destructive";
  const fmtCurrency = (v: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const pickupStop = stops.find(s => s.stop_type === 'pickup') || stops[0];
  const deliveryStop = stops.find(s => s.stop_type === 'delivery') || stops[stops.length - 1];
  const routeFrom = pickupStop?.city || trip.pickup_city || '-';
  const routeTo = deliveryStop?.city || trip.delivery_city || '-';

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -80 && isAdmin) {
      haptic('medium');
      onDelete();
    } else if (info.offset.x > 80) {
      haptic('medium');
      navigate(`/orders/edit/${trip.id}`);
    }
    setShowActions(false);
  };

  const firstPickupCompleted = stops[0]?.stop_type === 'pickup' && stops[0]?.status === 'completed';
  const isOnTheRoad = trip.status === "onderweg";
  
  const statusBorderConfig = trip.status === "aanvraag"
    ? { border: "border-l-[3px] border-l-amber-500", glow: "shadow-[inset_3px_0_8px_-4px_rgba(245,158,11,0.4)]" }
    : needsDriver
      ? { border: "border-l-[3px] border-l-destructive", glow: "shadow-[inset_3px_0_8px_-4px_hsl(var(--destructive)/0.4)]" }
      : trip.status === "afgerond" || trip.status === "afgeleverd"
        ? { border: "border-l-[3px] border-l-emerald-500", glow: "shadow-[inset_3px_0_8px_-4px_rgba(16,185,129,0.4)]" }
        : trip.status === "gecontroleerd"
          ? { border: "border-l-[3px] border-l-blue-800", glow: "shadow-[inset_3px_0_8px_-4px_rgba(30,64,175,0.4)]" }
          : trip.status === "onderweg"
            ? { border: "border-l-[3px] border-l-amber-500", glow: "shadow-[inset_3px_0_8px_-4px_rgba(245,158,11,0.4)]" }
            : trip.status === "geladen"
              ? { border: "border-l-[3px] border-l-orange-500", glow: "shadow-[inset_3px_0_8px_-4px_rgba(249,115,22,0.4)]" }
              : { border: "border-l-[3px] border-l-transparent", glow: "" };

  return (
    <>
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe background actions */}
      <div className="absolute inset-0 flex">
        <motion.div
          className={cn("flex-1 flex items-center pl-4", thresholdReached === 'right' ? "bg-primary/60" : "bg-primary/20")}
          style={{ opacity: editOpacity }}
          animate={{ opacity: thresholdReached === 'right' ? 1 : undefined }}
          transition={{ duration: 0.15 }}
        >
          <Pencil className="h-5 w-5 text-primary" />
        </motion.div>
        <motion.div
          className={cn("flex-1 flex items-center justify-end pr-4", thresholdReached === 'left' ? "bg-destructive/60" : "bg-destructive/20")}
          style={{ opacity: deleteOpacity }}
          animate={{ opacity: thresholdReached === 'left' ? 1 : undefined }}
          transition={{ duration: 0.15 }}
        >
          <Trash2 className="h-5 w-5 text-destructive" />
        </motion.div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={{ scale: thresholdReached ? 0.97 : 1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Card
          className={cn(
            "relative overflow-hidden bg-card/95 backdrop-blur-sm border-border/50 shadow-lg touch-manipulation",
            trip.status === 'aanvraag' && "bg-amber-500/8",
            statusBorderConfig.border,
            statusBorderConfig.glow,
            selected && "ring-2 ring-primary/50 bg-primary/5"
          )}
          onClick={() => {
            if (selectionMode && onSelect) {
              onSelect(trip.id);
            } else {
              navigate(`/orders/edit/${trip.id}`);
            }
          }}
        >
          <CardContent className="p-4">
            {/* Header: Order number + Status */}
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-1 flex items-center gap-2">
                {selectionMode && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => onSelect?.(trip.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 w-5"
                    />
                  </motion.div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{trip.order_number || "Concept"}</span>
                  <OrderStatusBadge
                    status={trip.status}
                    driverId={trip.driver_id}
                    carrierId={trip.carrier_id}
                    size="sm"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(trip.trip_date), "EEEE d MMM", { locale: nl })}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 -mt-1 -mr-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canEdit && trip.status === 'aanvraag' && (
                    <>
                      <DropdownMenuItem onClick={async (e) => {
                        e.stopPropagation();
                        setIsUpdating(true);
                        try {
                          await supabase.from('trips').update({ status: 'gepland' satisfies TripStatus }).eq('id', trip.id);
                          notifyCustomerStatusChange(trip.customer_id, trip.id, 'gepland', trip.order_number);
                          // Log order event
                          try { const uid = (await supabase.auth.getUser()).data.user?.id; await supabase.from('order_events').insert({ order_id: trip.id, event_type: 'STATUS_UPDATED', payload: { old_value: 'aanvraag', new_value: 'gepland', source: 'mobile_card_accept' }, actor_user_id: uid }); } catch {}
                          if (trip.customer_id) {
                            const { data: customer } = await supabase.from('customers').select('email, company_name, contact_name').eq('id', trip.customer_id).single();
                            if (customer?.email) {
                              const ps = stops.find(s => s.stop_type === 'pickup') || stops[0];
                              const ds = stops.find(s => s.stop_type === 'delivery') || stops[stops.length - 1];
                              try { await supabase.functions.invoke('send-order-confirmation', { body: { tripId: trip.id, customerEmail: customer.email, customerName: customer.contact_name || customer.company_name, orderNumber: trip.order_number || '-', pickupAddress: ps?.address || '', pickupCity: ps?.city || trip.pickup_city || '', pickupDate: trip.trip_date, pickupTimeWindow: null, deliveryAddress: ds?.address || '', deliveryCity: ds?.city || trip.delivery_city || '', deliveryDate: null, deliveryTimeWindow: null, specialInstructions: null } }); } catch (e) { console.warn('Bevestigingsmail verzenden mislukt:', e); }
                            }
                          }
                          await queryClient.invalidateQueries({ queryKey: ['trips'] });
                          toast({ title: "Aanvraag geaccepteerd", description: `Order ${trip.order_number} is ingepland.` });
                        } catch { toast({ title: "Fout", description: "Kon aanvraag niet accepteren.", variant: "destructive" }); }
                        finally { setIsUpdating(false); }
                      }} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />}
                        Accepteren
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowRejectDialog(true); }} className="text-destructive">
                        <XCircle className="h-4 w-4 mr-2" />
                        Afwijzen
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/orders/edit/${trip.id}`); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Bewerken
                  </DropdownMenuItem>
                  {onShowMap && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShowMap(); }}>
                      <Map className="h-4 w-4 mr-2" />
                      Route bekijken
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Dupliceren
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Customer */}
            <div className="text-sm font-medium mb-3 truncate">
              {trip.customers?.company_name || "-"}
            </div>

            {/* Route visualization */}
            <div className="flex items-center gap-2 mb-3 text-sm">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="h-2.5 w-2.5 rounded-full bg-success flex-shrink-0" />
                <span className="truncate">{routeFrom}</span>
                {firstPickupCompleted && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 font-semibold flex-shrink-0">
                    Afgehaald
                  </Badge>
                )}
              </div>
              <motion.div
                animate={isOnTheRoad ? { opacity: [0.4, 1, 0.4] } : {}}
                transition={isOnTheRoad ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : {}}
              >
                <ChevronRight className={cn("h-4 w-4 flex-shrink-0", isOnTheRoad ? "text-amber-500" : "text-muted-foreground")} />
              </motion.div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive flex-shrink-0" />
                <span className="truncate">{routeTo}</span>
              </div>
              {stops.length > 2 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex-shrink-0">
                  +{stops.length - 2}
                </Badge>
              )}
            </div>

            {/* Carrier/Driver */}
            {needsDriver ? (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <Truck className="h-3.5 w-3.5" />
                  Chauffeur nog toewijzen
                </div>
                {drivers.length > 0 && (
                  <QuickAssignDriverButton
                    tripId={trip.id}
                    orderNumber={trip.order_number}
                    currentStatus={trip.status}
                    customerId={trip.customer_id}
                    drivers={drivers}
                    onAssigned={onAssigned}
                    size="xs"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Truck className="h-3.5 w-3.5" />
                {trip.carriers?.company_name || 'Eigen vervoer'}
                {trip.vehicles?.license_plate && ` • ${trip.vehicles.license_plate}`}
              </div>
            )}

            {/* Financial footer */}
            <div className="flex items-center gap-2 pt-3 border-t border-border/50">
              <div className="grid grid-cols-3 gap-2 flex-1 min-w-0">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Verkoop</span>
                  <span className="font-semibold text-sm tabular-nums">{fmtCurrency(trip.sales_total || 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Inkoop</span>
                  <span className="font-semibold text-sm tabular-nums">{fmtCurrency(trip.purchase_total || 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Marge</span>
                  <span className={cn("font-semibold text-sm tabular-nums", marginClass)}>
                    {fmtCurrency(computedProfit)}
                    <span className="text-[10px] font-normal ml-0.5">
                      ({computedMarginPct.toFixed(0)}%)
                    </span>
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>

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
            <Button variant="destructive" onClick={async () => {
              if (!rejectReason.trim()) return;
              setIsUpdating(true);
              try {
                await supabase.from('trips').update({ status: 'geannuleerd' satisfies TripStatus }).eq('id', trip.id);
                notifyCustomerStatusChange(trip.customer_id, trip.id, 'geannuleerd', trip.order_number);
                // Log order event
                try { const uid = (await supabase.auth.getUser()).data.user?.id; await supabase.from('order_events').insert({ order_id: trip.id, event_type: 'STATUS_UPDATED', payload: { old_value: 'aanvraag', new_value: 'geannuleerd', source: 'mobile_card_reject' }, actor_user_id: uid }); } catch {}
                if (trip.customer_id) {
                  const { data: customer } = await supabase.from('customers').select('email, company_name, contact_name').eq('id', trip.customer_id).single();
                  if (customer?.email) {
                    try { await supabase.functions.invoke('send-order-rejection', { body: { customerEmail: customer.email, customerName: customer.contact_name || customer.company_name, orderNumber: trip.order_number || '-', rejectionReason: rejectReason } }); } catch (e) { console.warn('Afwijzingsmail verzenden mislukt:', e); }
                  }
                }
                setShowRejectDialog(false);
                setRejectReason("");
                await queryClient.invalidateQueries({ queryKey: ['trips'] });
                toast({ title: "Aanvraag afgewezen", description: `Order ${trip.order_number} is geannuleerd.` });
              } catch { toast({ title: "Fout", description: "Kon aanvraag niet afwijzen.", variant: "destructive" }); }
              finally { setIsUpdating(false); }
            }} disabled={isUpdating || !rejectReason.trim()}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Afwijzen & mail versturen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default OrderMobileCard;

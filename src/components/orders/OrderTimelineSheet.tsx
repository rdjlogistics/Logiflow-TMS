import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  FileText,
  Truck,
  MapPin,
  CheckCircle,
  Clock,
  Edit,
  Plus,
  AlertCircle,
  Euro,
  MessageSquare,
  UserCheck,
  PackageCheck,
  Timer,
  CalendarClock,
  ArrowRight,
  Loader2,
  ClipboardCheck,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowSize } from "@/hooks/useWindowSize";
import { ORDER_STATUS_CONFIG, type OrderStatus } from "@/types/orderStatus";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────

interface TimelineEntry {
  id: string;
  timestamp: string;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  variant: "completed" | "info" | "pending" | "warning";
}

interface TripData {
  order_number: string | null;
  status: string;
  created_at: string;
  trip_date: string | null;
  pickup_city: string | null;
  delivery_city: string | null;
  actual_departure: string | null;
  delivered_at: string | null;
  checkout_completed_at: string | null;
  pickup_time_from: string | null;
  pickup_time_to: string | null;
  delivery_time_from: string | null;
  delivery_time_to: string | null;
  driver_id: string | null;
  carrier_id: string | null;
}

interface StopData {
  id: string;
  stop_order: number;
  stop_type: string | null;
  city: string | null;
  company_name: string | null;
  actual_arrival: string | null;
  waiting_minutes: number | null;
  driver_remarks: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  status: string | null;
}

interface EventData {
  id: string;
  event_type: string;
  created_at: string;
  payload: any;
}

interface OrderTimelineSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
}

// ── Helpers ──────────────────────────────────────────────

const variantStyles: Record<TimelineEntry["variant"], { dot: string; line: string }> = {
  completed: {
    dot: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25",
    line: "from-emerald-500 to-emerald-400",
  },
  info: {
    dot: "bg-blue-500 text-white shadow-lg shadow-blue-500/25",
    line: "from-blue-500 to-blue-400",
  },
  pending: {
    dot: "bg-amber-500 text-white shadow-lg shadow-amber-500/25",
    line: "from-amber-500 to-amber-400",
  },
  warning: {
    dot: "bg-destructive text-white shadow-lg shadow-destructive/25",
    line: "from-destructive to-destructive/70",
  },
};

function getStatusLabel(status: string): string {
  const config = ORDER_STATUS_CONFIG[status as OrderStatus];
  return config?.label ?? status;
}

function timeWindow(from: string | null, to: string | null): string | null {
  if (!from && !to) return null;
  if (from && to) return `${from.slice(0, 5)} – ${to.slice(0, 5)}`;
  return (from || to)!.slice(0, 5);
}

function formatTs(ts: string): string {
  return format(new Date(ts), "dd MMM HH:mm", { locale: nl });
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

// ── Build timeline entries ───────────────────────────────

function buildTimeline(
  trip: TripData | null,
  stops: StopData[],
  events: EventData[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (!trip) return entries;

  // 1. Order aangemaakt
  entries.push({
    id: "trip-created",
    timestamp: trip.created_at,
    icon: <Plus className="h-3.5 w-3.5" />,
    label: "Order aangemaakt",
    detail: trip.order_number ? `#${trip.order_number}` : undefined,
    variant: "completed",
  });

  // 2. Laadvenster
  const pw = timeWindow(trip.pickup_time_from, trip.pickup_time_to);
  if (pw && trip.trip_date) {
    entries.push({
      id: "pickup-window",
      timestamp: `${trip.trip_date}T${(trip.pickup_time_from || "00:00").slice(0, 5)}:00`,
      icon: <CalendarClock className="h-3.5 w-3.5" />,
      label: "Laadvenster",
      detail: `${pw}${trip.pickup_city ? ` · ${trip.pickup_city}` : ""}`,
      variant: "info",
    });
  }

  // 3. Losvenster
  const dw = timeWindow(trip.delivery_time_from, trip.delivery_time_to);
  if (dw && trip.trip_date) {
    entries.push({
      id: "delivery-window",
      timestamp: `${trip.trip_date}T${(trip.delivery_time_from || "23:59").slice(0, 5)}:00`,
      icon: <CalendarClock className="h-3.5 w-3.5" />,
      label: "Losvenster",
      detail: `${dw}${trip.delivery_city ? ` · ${trip.delivery_city}` : ""}`,
      variant: "info",
    });
  }

  // 4. Vertrokken
  if (trip.actual_departure) {
    entries.push({
      id: "departed",
      timestamp: trip.actual_departure,
      icon: <Truck className="h-3.5 w-3.5" />,
      label: "Vertrokken",
      detail: trip.pickup_city ? `Vanuit ${trip.pickup_city}` : undefined,
      variant: "completed",
    });
  }

  // 5. Route stops
  stops.forEach((stop) => {
    const loc = stop.company_name || stop.city || `Stop ${stop.stop_order}`;
    const typeLabel = stop.stop_type === "pickup" ? "Ophalen" : "Afleveren";

    if (stop.actual_arrival) {
      entries.push({
        id: `stop-arrival-${stop.id}`,
        timestamp: stop.actual_arrival,
        icon: <MapPin className="h-3.5 w-3.5" />,
        label: `Aangekomen · ${typeLabel}`,
        detail: loc,
        variant: "completed",
      });
    }

    if (stop.waiting_minutes && stop.waiting_minutes > 0) {
      const waitTs = stop.actual_arrival
        ? new Date(new Date(stop.actual_arrival).getTime() + 1000).toISOString()
        : trip.created_at;
      entries.push({
        id: `stop-wait-${stop.id}`,
        timestamp: waitTs,
        icon: <Timer className="h-3.5 w-3.5" />,
        label: "Wachttijd",
        detail: `${stop.waiting_minutes} min bij ${loc}`,
        variant: "pending",
      });
    }

    if (stop.driver_remarks) {
      const remarkTs = stop.actual_arrival
        ? new Date(new Date(stop.actual_arrival).getTime() + 2000).toISOString()
        : trip.created_at;
      entries.push({
        id: `stop-remark-${stop.id}`,
        timestamp: remarkTs,
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        label: "Opmerking chauffeur",
        detail: `"${stop.driver_remarks}" — ${loc}`,
        variant: "info",
      });
    }

    if (stop.status === "completed" && !stop.actual_arrival) {
      entries.push({
        id: `stop-complete-${stop.id}`,
        timestamp: trip.created_at,
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        label: `${typeLabel} voltooid`,
        detail: loc,
        variant: "completed",
      });
    }
  });

  // 6. Order events (skip ones we already covered from trips/stops)
  const skipTypes = new Set(["CREATED", "created"]);
  events.forEach((ev) => {
    if (skipTypes.has(ev.event_type)) return;

    const label = eventLabel(ev.event_type);
    const detail = formatPayload(ev.event_type, ev.payload);
    const variant = eventVariant(ev.event_type, ev.payload);

    entries.push({
      id: `event-${ev.id}`,
      timestamp: ev.created_at,
      icon: eventIcon(ev.event_type),
      label,
      detail: detail || undefined,
      variant,
    });
  });

  // 7. Afgeleverd
  if (trip.delivered_at) {
    entries.push({
      id: "delivered",
      timestamp: trip.delivered_at,
      icon: <PackageCheck className="h-3.5 w-3.5" />,
      label: "Afgeleverd",
      detail: trip.delivery_city ? `In ${trip.delivery_city}` : undefined,
      variant: "completed",
    });
  }

  // 8. Checkout
  if (trip.checkout_completed_at) {
    entries.push({
      id: "checkout",
      timestamp: trip.checkout_completed_at,
      icon: <ClipboardCheck className="h-3.5 w-3.5" />,
      label: "Checkout afgerond",
      detail: "Chauffeur heeft rit afgemeld",
      variant: "completed",
    });
  }

  // Sort chronologically
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return entries;
}

// ── Event formatting ─────────────────────────────────────

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    STATUS_UPDATED: "Status gewijzigd",
    DOCUMENT_GENERATED: "Document aangemaakt",
    DRIVER_ASSIGNED: "Chauffeur toegewezen",
    CARRIER_ASSIGNED: "Charter toegewezen",
    NOTE_ADDED: "Notitie toegevoegd",
    PRICE_UPDATED: "Prijs bijgewerkt",
    UPDATED: "Order bijgewerkt",
    VEHICLE_ASSIGNED: "Voertuig toegewezen",
    STOP_COMPLETED: "Stop voltooid",
    POD_UPLOADED: "POD geüpload",
    INVOICE_CREATED: "Factuur aangemaakt",
    status_change: "Status gewijzigd",
    driver_assigned: "Chauffeur toegewezen",
    pickup_started: "Ophalen gestart",
    pickup_completed: "Ophalen voltooid",
    delivery_started: "Levering gestart",
    delivery_completed: "Levering voltooid",
    document_added: "Document toegevoegd",
    eta_updated: "ETA bijgewerkt",
    updated: "Order bijgewerkt",
  };
  return map[type] || type.replace(/_/g, " ");
}

function eventIcon(type: string): React.ReactNode {
  const map: Record<string, React.ReactNode> = {
    STATUS_UPDATED: <AlertCircle className="h-3.5 w-3.5" />,
    DOCUMENT_GENERATED: <FileText className="h-3.5 w-3.5" />,
    DRIVER_ASSIGNED: <UserCheck className="h-3.5 w-3.5" />,
    CARRIER_ASSIGNED: <Truck className="h-3.5 w-3.5" />,
    NOTE_ADDED: <MessageSquare className="h-3.5 w-3.5" />,
    PRICE_UPDATED: <Euro className="h-3.5 w-3.5" />,
    UPDATED: <Edit className="h-3.5 w-3.5" />,
    INVOICE_CREATED: <Receipt className="h-3.5 w-3.5" />,
    POD_UPLOADED: <FileText className="h-3.5 w-3.5" />,
    status_change: <AlertCircle className="h-3.5 w-3.5" />,
  };
  return map[type] || <Clock className="h-3.5 w-3.5" />;
}

function eventVariant(type: string, payload: any): TimelineEntry["variant"] {
  if (["DRIVER_ASSIGNED", "CARRIER_ASSIGNED", "driver_assigned"].includes(type)) return "info";
  if (["PRICE_UPDATED", "NOTE_ADDED"].includes(type)) return "info";
  if (["POD_UPLOADED", "STOP_COMPLETED", "delivery_completed", "pickup_completed"].includes(type)) return "completed";
  if (["INVOICE_CREATED"].includes(type)) return "completed";
  if (type === "STATUS_UPDATED" || type === "status_change") {
    const newVal = payload?.new_value || payload?.new_status;
    if (newVal === "geannuleerd") return "warning";
    if (["afgeleverd", "afgerond", "gecontroleerd", "gefactureerd"].includes(newVal)) return "completed";
    return "info";
  }
  return "info";
}

const sourceLabels: Record<string, string> = {
  driver_assigned_auto: "Automatisch",
  bulk_action: "Bulk actie",
  compact_row_accept: "Geaccepteerd",
  manual: "Handmatig",
  system: "Systeem",
  api: "Via API",
  portal: "Via portaal",
  driver_app: "Via chauffeur-app",
  auto_dispatch: "Auto-dispatch",
};

function formatPayload(type: string, payload: any): string | null {
  if (!payload || typeof payload !== "object") return null;
  const parts: string[] = [];

  if (payload.old_value && payload.new_value) {
    parts.push(`${getStatusLabel(String(payload.old_value))} → ${getStatusLabel(String(payload.new_value))}`);
  } else if (payload.new_value) {
    parts.push(getStatusLabel(String(payload.new_value)));
  }

  if (payload.source) parts.push(sourceLabels[payload.source] ?? payload.source);
  if (payload.note) parts.push(payload.note);
  if (payload.driver_name) parts.push(payload.driver_name);
  if (payload.carrier_name) parts.push(payload.carrier_name);
  if (payload.document_type) parts.push(`Type: ${payload.document_type}`);
  if (payload.price !== undefined) parts.push(`€${Number(payload.price).toFixed(2)}`);

  if (parts.length === 0) {
    const safe = Object.entries(payload).filter(
      ([k, v]) => v != null && v !== "" && !(typeof v === "string" && isUuid(v)) &&
        !["id", "trip_id", "order_id", "tenant_id", "company_id", "user_id", "actor_id", "driver_id", "carrier_id", "vehicle_id", "actor_user_id"].includes(k)
    );
    if (safe.length === 0) return null;
    return safe.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ");
  }

  return parts.join(" · ");
}

// ── Component ────────────────────────────────────────────

const OrderTimelineSheet = ({ open, onOpenChange, orderId }: OrderTimelineSheetProps) => {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isMobile } = useWindowSize();

  useEffect(() => {
    if (open && orderId) loadData();
  }, [open, orderId]);

  const loadData = async () => {
    setIsLoading(true);

    const [tripRes, stopsRes, eventsRes] = await Promise.all([
      supabase
        .from("trips")
        .select("order_number, status, created_at, trip_date, pickup_city, delivery_city, actual_departure, delivered_at, checkout_completed_at, pickup_time_from, pickup_time_to, delivery_time_from, delivery_time_to, driver_id, carrier_id")
        .eq("id", orderId)
        .maybeSingle(),
      supabase
        .from("route_stops")
        .select("id, stop_order, stop_type, city, company_name, actual_arrival, waiting_minutes, driver_remarks, time_window_start, time_window_end, status")
        .eq("trip_id", orderId)
        .order("stop_order", { ascending: true }),
      supabase
        .from("order_events")
        .select("id, event_type, created_at, payload")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    ]);

    const tripData = tripRes.data as TripData | null;
    setTrip(tripData);
    setEntries(buildTimeline(tripData, stopsRes.data || [], eventsRes.data || []));
    setIsLoading(false);
  };

  const statusConfig = trip ? ORDER_STATUS_CONFIG[trip.status as OrderStatus] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        showDragHandle={isMobile}
        className={cn(
          "w-full flex flex-col min-h-0",
          isMobile ? "h-[min(88dvh,calc(100dvh-1rem))]" : "sm:max-w-md"
        )}
      >
        <SheetHeader className="shrink-0 space-y-3">
          <SheetTitle className="text-base">Track & Trace</SheetTitle>

          {/* Header card */}
          {trip && (
            <div className="rounded-xl bg-card/60 backdrop-blur-xl border border-border/50 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">
                  {trip.order_number ? `#${trip.order_number}` : "Order"}
                </span>
                {statusConfig && (
                  <Badge variant="outline" className={cn("text-[11px] font-medium", statusConfig.color, statusConfig.bgColor)}>
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
              {(trip.pickup_city || trip.delivery_city) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{trip.pickup_city || "–"}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span>{trip.delivery_city || "–"}</span>
                </div>
              )}
              {trip.trip_date && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(trip.trip_date), "d MMMM yyyy", { locale: nl })}
                </p>
              )}
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="mt-4 flex-1 min-h-0 pr-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nog geen gebeurtenissen</p>
            </div>
          ) : (
            <div className="relative pb-4 pl-5">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border/60 to-transparent" />

              <div className="space-y-1">
                {entries.map((entry, i) => {
                  const styles = variantStyles[entry.variant];
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      transition={{
                        delay: i * 0.04,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="relative flex gap-3 group"
                    >
                      {/* Dot */}
                      <div
                        className={cn(
                          "relative z-10 mt-2.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full -ml-5",
                          styles.dot
                        )}
                      >
                        {entry.icon}
                      </div>

                      {/* Card */}
                      <div className="flex-1 rounded-lg border border-border/40 bg-card/40 backdrop-blur-sm p-3 transition-colors group-hover:bg-card/70">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-[13px] leading-snug">
                            {entry.label}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums pt-0.5">
                            {formatTs(entry.timestamp)}
                          </span>
                        </div>
                        {entry.detail && (
                          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                            {entry.detail}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default OrderTimelineSheet;

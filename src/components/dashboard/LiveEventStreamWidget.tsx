import React, { useState, useCallback, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Truck, Package, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface EventItem {
  id: string;
  time: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

const statusLabel: Record<string, string> = {
  gepland: "Gepland",
  onderweg: "Onderweg",
  geladen: "Geladen",
  afgeleverd: "Afgeleverd",
  afgerond: "Afgerond",
  geannuleerd: "Geannuleerd",
  gefactureerd: "Gefactureerd",
  aanvraag: "Aanvraag",
  offerte: "Offerte",
  draft: "Concept",
  gecontroleerd: "Gecontroleerd",
};

const eventConfig: Record<string, { dot: string; icon: React.ElementType }> = {
  success: { dot: "bg-success", icon: CheckCircle2 },
  error: { dot: "bg-destructive", icon: XCircle },
  info: { dot: "bg-primary", icon: Package },
  warning: { dot: "bg-warning", icon: AlertTriangle },
};

const LiveEventStreamWidget = () => {
  const [events, setEvents] = useState<EventItem[]>([]);

  const addEvent = useCallback((event: EventItem) => {
    setEvents((prev) => [event, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    const channelName = `live-events-widget-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trips" },
        (payload) => {
          const trip = payload.new as any;
          addEvent({
            id: `${Date.now()}-upd`,
            time: new Date().toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            message: `Rit ${trip.order_number} → ${statusLabel[trip.status] ?? trip.status}`,
            type:
              trip.status === "afgeleverd" || trip.status === "afgerond"
                ? "success"
                : trip.status === "geannuleerd"
                ? "error"
                : "info",
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trips" },
        (payload) => {
          const trip = payload.new as any;
          addEvent({
            id: `${Date.now()}-ins`,
            time: new Date().toLocaleTimeString("nl-NL", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            message: `Nieuwe rit: ${trip.order_number ?? "onbekend"}`,
            type: "info",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addEvent]);

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-sm font-bold text-foreground">Live Events</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
          {events.length} events
        </span>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[380px]">
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="p-3 rounded-2xl bg-muted/30">
                <Radio className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground">Wachten op events…</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Realtime updates verschijnen hier
                </p>
              </div>
            </div>
          ) : (
            events.map((ev) => {
              const config = eventConfig[ev.type];
              const Icon = config.icon;
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: 12, height: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl px-3 py-2.5",
                    "bg-card/60 border border-border/20 backdrop-blur-sm"
                  )}
                >
                  <div className={cn("mt-0.5 p-1 rounded-lg", `${config.dot}/15`)}>
                    <Icon className={cn("h-3 w-3", config.dot.replace("bg-", "text-"))} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground leading-snug font-medium">{ev.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {ev.time}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(LiveEventStreamWidget);

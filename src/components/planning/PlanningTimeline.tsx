import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { format, addHours, startOfDay, differenceInMinutes, parseISO, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Truck,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  avatar?: string;
  status: "available" | "busy" | "offline";
}

interface TimelineTrip {
  id: string;
  order_number: string | null;
  trip_date: string;
  pickup_city: string | null;
  delivery_city: string | null;
  pickup_time_from: string | null;
  pickup_time_to: string | null;
  delivery_time_from: string | null;
  delivery_time_to: string | null;
  status: string;
  driver_id: string | null;
  customer: { company_name: string } | null;
  price: number | null;
}


// Time slots (6:00 - 22:00)
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => i + 6);
const HOUR_WIDTH = 80; // pixels per hour

export const PlanningTimeline = ({ selectedDate }: { selectedDate: Date }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draggedTrip, setDraggedTrip] = useState<string | null>(null);

  // Fetch active drivers from database
  const { data: drivers = [] } = useQuery({
    queryKey: ["timeline-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name, status")
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map(d => ({
        id: d.id,
        name: d.name,
        status: "available" as const,
      })) as Driver[];
    },
  });

  // Fetch trips for the selected date
  const { data: trips, isLoading } = useQuery({
    queryKey: ["timeline-trips", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          id,
          order_number,
          trip_date,
          pickup_city,
          delivery_city,
          pickup_time_from,
          pickup_time_to,
          delivery_time_from,
          delivery_time_to,
          status,
          driver_id,
          price,
          customer:customers(company_name)
        `)
        .eq("trip_date", format(selectedDate, "yyyy-MM-dd"))
        .in("status", ["gepland", "onderweg"]);

      if (error) throw error;
      return data as TimelineTrip[];
    },
  });

  // Assign trip to driver mutation
  const assignMutation = useMutation({
    mutationFn: async ({ tripId, driverId }: { tripId: string; driverId: string | null }) => {
      const { error } = await supabase
        .from("trips")
        .update({ driver_id: driverId })
        .eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline-trips"] });
      toast({ title: "Chauffeur toegewezen", description: "Rit is bijgewerkt" });
    },
    onError: () => {
      toast({ title: "Toewijzing mislukt", description: "Probeer het opnieuw", variant: "destructive" });
    },
  });

  // Group trips by driver
  const tripsByDriver = useMemo(() => {
    const grouped: Record<string, TimelineTrip[]> = {};
    drivers.forEach((driver) => {
      grouped[driver.id] = [];
    });
    grouped["unassigned"] = [];

    trips?.forEach((trip) => {
      const driverId = trip.driver_id || "unassigned";
      if (!grouped[driverId]) grouped[driverId] = [];
      grouped[driverId].push(trip);
    });

    return grouped;
  }, [trips, drivers]);

  // Calculate trip position on timeline
  const getTripPosition = (trip: TimelineTrip) => {
    const startTime = trip.pickup_time_from || "08:00";
    const endTime = trip.delivery_time_to || trip.pickup_time_to || "10:00";
    
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startOffset = ((startHour - 6) * 60 + startMin) * (HOUR_WIDTH / 60);
    const duration = ((endHour - startHour) * 60 + (endMin - startMin)) * (HOUR_WIDTH / 60);

    return {
      left: Math.max(0, startOffset),
      width: Math.max(60, duration), // minimum width
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "onderweg":
        return "bg-blue-500";
      case "toegewezen":
        return "bg-emerald-500";
      case "gepland":
        return "bg-amber-500";
      default:
        return "bg-muted";
    }
  };

  const handleDragStart = (tripId: string) => {
    setDraggedTrip(tripId);
  };

  const handleDrop = (driverId: string) => {
    if (draggedTrip) {
      assignMutation.mutate({
        tripId: draggedTrip,
        driverId: driverId === "unassigned" ? null : driverId,
      });
      setDraggedTrip(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            Planning - {format(selectedDate, "EEEE d MMMM", { locale: nl })}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Truck className="h-3 w-3" />
            {trips?.length || 0} ritten
          </Badge>
          <Badge variant="outline" className="gap-1 text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            {trips?.filter((t) => t.driver_id).length || 0} toegewezen
          </Badge>
          <Badge variant="outline" className="gap-1 text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            {trips?.filter((t) => !t.driver_id).length || 0} open
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="min-w-[1400px]">
          {/* Time header */}
          <div className="flex border-b border-border/50 bg-muted/20 sticky top-0 z-10">
            <div className="w-48 shrink-0 p-3 border-r border-border/50">
              <span className="text-xs font-medium text-muted-foreground">Chauffeur</span>
            </div>
            <div className="flex">
              {TIME_SLOTS.map((hour) => (
                <div
                  key={hour}
                  className="border-r border-border/30 text-center"
                  style={{ width: HOUR_WIDTH }}
                >
                  <span className="text-xs text-muted-foreground">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Unassigned row */}
          <div
            className={cn(
              "flex border-b border-border/50 min-h-[60px] transition-colors",
              draggedTrip && "bg-amber-500/10"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop("unassigned")}
          >
            <div className="w-48 shrink-0 p-3 border-r border-border/50 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Niet toegewezen</p>
                <p className="text-xs text-muted-foreground">
                  {tripsByDriver["unassigned"]?.length || 0} ritten
                </p>
              </div>
            </div>
            <div className="relative flex-1" style={{ minWidth: TIME_SLOTS.length * HOUR_WIDTH }}>
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="border-r border-border/20"
                    style={{ width: HOUR_WIDTH }}
                  />
                ))}
              </div>
              {/* Trips */}
              <AnimatePresence>
                {tripsByDriver["unassigned"]?.map((trip) => {
                  const pos = getTripPosition(trip);
                  return (
                    <motion.div
                      key={trip.id}
                      layoutId={trip.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      draggable
                      onDragStart={() => handleDragStart(trip.id)}
                      className={cn(
                        "absolute top-2 h-10 rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing",
                        "flex items-center gap-1 text-xs font-medium text-white shadow-lg",
                        "hover:ring-2 hover:ring-primary/50 transition-shadow",
                        getStatusColor(trip.status)
                      )}
                      style={{
                        left: pos.left,
                        width: pos.width,
                      }}
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {trip.pickup_city} → {trip.delivery_city}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Driver rows */}
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className={cn(
                "flex border-b border-border/50 min-h-[60px] transition-colors",
                draggedTrip && "hover:bg-primary/5"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(driver.id)}
            >
              <div className="w-48 shrink-0 p-3 border-r border-border/50 flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {driver.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{driver.name}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1 py-0",
                      driver.status === "available" && "text-emerald-600 border-emerald-500/30",
                      driver.status === "busy" && "text-blue-600 border-blue-500/30",
                      driver.status === "offline" && "text-muted-foreground"
                    )}
                  >
                    {driver.status === "available"
                      ? "Beschikbaar"
                      : driver.status === "busy"
                      ? "Onderweg"
                      : "Offline"}
                  </Badge>
                </div>
              </div>
              <div className="relative flex-1" style={{ minWidth: TIME_SLOTS.length * HOUR_WIDTH }}>
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {TIME_SLOTS.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-border/20"
                      style={{ width: HOUR_WIDTH }}
                    />
                  ))}
                </div>
                {/* Trips */}
                <AnimatePresence>
                  {tripsByDriver[driver.id]?.map((trip) => {
                    const pos = getTripPosition(trip);
                    return (
                      <TooltipProvider key={trip.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div
                              layoutId={trip.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              draggable
                              onDragStart={() => handleDragStart(trip.id)}
                              className={cn(
                                "absolute top-2 h-10 rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing",
                                "flex items-center gap-1 text-xs font-medium text-white shadow-lg",
                                "hover:ring-2 hover:ring-primary/50 transition-shadow",
                                getStatusColor(trip.status)
                              )}
                              style={{
                                left: pos.left,
                                width: pos.width,
                              }}
                            >
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {trip.pickup_city} → {trip.delivery_city}
                              </span>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{trip.order_number || "Geen ordernr"}</p>
                              <p className="text-xs">{trip.customer?.company_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {trip.pickup_city} → {trip.delivery_city}
                              </p>
                              {trip.price && (
                                <p className="text-xs font-medium">€{trip.price.toFixed(2)}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Footer with legend */}
      <div className="p-3 border-t border-border/50 bg-muted/20 flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">Status:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Gepland</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Toegewezen</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Onderweg</span>
        </div>
        <span className="ml-auto text-muted-foreground">
          Sleep ritten naar een chauffeur om toe te wijzen
        </span>
      </div>
    </div>
  );
};

export default PlanningTimeline;

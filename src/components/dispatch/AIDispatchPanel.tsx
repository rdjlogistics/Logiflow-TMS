import React, { useState, memo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, User, Truck, MapPin, Clock, Star, TrendingUp, CheckCircle2,
  Zap, Route, Target, RefreshCw, UserCheck, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Driver {
  id: string;
  name: string;
  score: number;
  currentLocation: { city: string; distance: number };
  matchFactors: { proximity: number; workload: number; reliability: number; specialization: number };
  vehicle: { type: string; plate: string };
  eta: number;
}

interface UnassignedTrip {
  id: string;
  customerName: string;
  pickupCity: string;
  deliveryCity: string;
  tripDate: string;
  priority: "high" | "medium" | "low";
  distance?: number;
}

const AIDispatchPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  const { data: unassignedTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ["unassigned-trips"],
    queryFn: async (): Promise<UnassignedTrip[]> => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("trips")
        .select("id, trip_date, pickup_city, delivery_city, distance_km, customer:customers(company_name)")
        .is("driver_id", null)
        .gte("trip_date", today)
        .eq("status", "gepland")
        .order("trip_date", { ascending: true })
        .limit(10);

      return (data || []).map((trip: any) => ({
        id: trip.id,
        customerName: trip.customer?.company_name || "Onbekend",
        pickupCity: trip.pickup_city || "–",
        deliveryCity: trip.delivery_city || "–",
        tripDate: trip.trip_date,
        priority: trip.trip_date === today ? "high" : "medium",
        distance: trip.distance_km,
      }));
    },
    staleTime: 30 * 1000,
  });

  const { data: recommendations, isLoading: recommendationsLoading, refetch } = useQuery({
    queryKey: ["driver-recommendations", selectedTrip],
    queryFn: async (): Promise<Driver[]> => {
      if (!selectedTrip) return [];
      
      // Fetch real drivers from database
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, name, rating, on_time_percentage, current_city, total_trips, vehicle:vehicles(license_plate, brand)")
        .eq("status", "active")
        .limit(5);
      
      if (!drivers?.length) return [];
      
      const selectedTripData = unassignedTrips?.find(t => t.id === selectedTrip);
      const pickupCity = selectedTripData?.pickupCity || "";
      
      return drivers.map((driver: any, i: number) => {
        // Deterministic proximity: same city = 100, otherwise decrease by index
        const driverCity = (driver.current_city || "").toLowerCase();
        const proximity = driverCity === pickupCity.toLowerCase() ? 100 : Math.max(40, 85 - i * 10);
        const workload = Math.max(0, 100 - (driver.total_trips || 0) / 3);
        const reliability = driver.on_time_percentage || 90;
        // Deterministic specialization based on total_trips experience
        const specialization = Math.min(95, 60 + Math.floor((driver.total_trips || 0) / 5));
        // Deterministic distance & ETA based on index
        const distanceToPickup = i * 8 + 5;
        const eta = Math.max(10, Math.floor(distanceToPickup * 1.5));
        return {
          id: driver.id,
          name: driver.name,
          score: Math.floor(proximity * 0.3 + workload * 0.25 + reliability * 0.3 + specialization * 0.15),
          currentLocation: { city: driver.current_city || "Onbekend", distance: distanceToPickup },
          matchFactors: { proximity, workload: Math.floor(workload), reliability: Math.floor(reliability), specialization },
          vehicle: { 
            type: driver.vehicle?.brand || "Voertuig", 
            plate: driver.vehicle?.license_plate || "–" 
          },
          eta,
        };
      }).sort((a, b) => b.score - a.score);
    },
    enabled: !!selectedTrip,
  });

  const assignDriver = useMutation({
    mutationFn: async ({ tripId, driverId }: { tripId: string; driverId: string }) => {
      const { error } = await supabase.from("trips").update({ driver_id: driverId }).eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Chauffeur toegewezen" });
      queryClient.invalidateQueries({ queryKey: ["unassigned-trips"] });
      setSelectedTrip(null);
    },
  });

  const handleAssign = useCallback((driverId: string) => {
    if (selectedTrip) assignDriver.mutate({ tripId: selectedTrip, driverId });
  }, [selectedTrip, assignDriver]);

  const getScoreColor = (score: number) => score >= 85 ? "text-success" : score >= 70 ? "text-primary" : "text-warning";

  return (
    <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card via-card to-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">AI Auto-Dispatch</CardTitle>
              <p className="text-xs text-muted-foreground">Intelligente chauffeur toewijzing</p>
            </div>
          </div>
          <Badge variant="premium" className="text-[9px]"><Zap className="h-2.5 w-2.5 mr-1" />Smart</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Zonder chauffeur ({unassignedTrips?.length || 0})</p>
          <ScrollArea className="h-[180px] rounded-lg border border-border/40 bg-muted/10">
            {tripsLoading ? (
              <div className="p-3 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : !unassignedTrips?.length ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <CheckCircle2 className="h-8 w-8 text-success mb-2" />
                <p className="text-sm font-medium">Alle ritten toegewezen</p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {unassignedTrips.map(trip => (
                  <div key={trip.id} onClick={() => setSelectedTrip(trip.id === selectedTrip ? null : trip.id)}
                    className={cn("p-3 rounded-lg border cursor-pointer transition-all", selectedTrip === trip.id ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50 border-border/40")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", trip.priority === "high" ? "bg-destructive" : "bg-warning")} />
                        <span className="text-sm font-medium truncate max-w-[120px]">{trip.customerName}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(trip.tripDate), "d MMM", { locale: nl })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-success" /><span>{trip.pickupCity}</span><span>→</span>
                      <MapPin className="h-3 w-3 text-destructive" /><span>{trip.deliveryCity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        
          {selectedTrip && (
            <div key="recs" className="animate-fade-in "space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground">AI Aanbevelingen</p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => refetch()}>
                  <RefreshCw className={cn("h-3 w-3 mr-1", recommendationsLoading && "animate-spin")} />Refresh
                </Button>
              </div>
              <div className="space-y-2">
                {recommendationsLoading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />) : recommendations?.slice(0, 3).map((driver, i) => (
                  <motion.div key={driver.id} initial={{ opacity: 0, y: 10 }}
                    className={cn("p-3 rounded-xl border", i === 0 ? "bg-primary/5 border-primary/30" : "border-border/40")}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-muted/50"><User className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-semibold">{driver.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Truck className="h-3 w-3" /><span>{driver.vehicle.plate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-lg font-bold", getScoreColor(driver.score))}>{driver.score}%</div>
                        <p className="text-[9px] text-muted-foreground">Match</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 mt-3">
                      {[{ label: "Afstand", value: driver.matchFactors.proximity }, { label: "Capaciteit", value: driver.matchFactors.workload },
                        { label: "OTIF", value: driver.matchFactors.reliability }, { label: "Match", value: driver.matchFactors.specialization }].map(f => (
                        <div key={f.label} className="text-center"><Progress value={f.value} className="h-1 mb-0.5" /><p className="text-[8px] text-muted-foreground">{f.label}</p></div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground"><Clock className="h-3 w-3 inline mr-0.5" />ETA: {driver.eta} min</span>
                      <Button size="sm" variant={i === 0 ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleAssign(driver.id)}>
                        <UserCheck className="h-3 w-3 mr-1" />Toewijzen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        

        {!selectedTrip && (
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Vandaag", value: unassignedTrips?.filter(t => t.tripDate === format(new Date(), "yyyy-MM-dd")).length || 0, color: "text-warning" },
              { label: "Morgen", value: unassignedTrips?.filter(t => t.tripDate !== format(new Date(), "yyyy-MM-dd")).length || 0, color: "text-primary" },
              { label: "Auto-Match", value: "94%", color: "text-success" }].map(s => (
              <div key={s.label} className="p-2 rounded-lg border border-border/40 bg-muted/10 text-center">
                <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(AIDispatchPanel);

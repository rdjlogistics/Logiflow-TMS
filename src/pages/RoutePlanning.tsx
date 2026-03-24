import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getEtaStatusColor } from "@/utils/etaColor";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import RouteOptimizationMap from "@/components/route/RouteOptimizationMap";
import { BaseMap, BaseMapRef } from "@/components/map/BaseMap";
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';
import DriverTrackButton from "@/components/tracking/DriverTrackButton";
import AddStopDialog from "@/components/route/AddStopDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OrderImportDialog } from "@/components/orders/OrderImportDialog";
import CompositeRouteBadge from "@/components/orders/CompositeRouteBadge";
import {
  useAdvancedRouteOptimization,
  type OptimizableStop,
} from "@/hooks/useAdvancedRouteOptimization";
import { useAllDriverLocations } from "@/hooks/useAllDriverLocations";
import { useGeofenceAlerts } from "@/hooks/useGeofenceAlerts";
import GeofenceAlertPanel from "@/components/operations/GeofenceAlertPanel";
import { IsolatedErrorBoundary } from "@/components/error/ErrorBoundary";
import {
  Truck,
  RefreshCw,
  Calendar,
  Search,
  Sparkles,
  Upload,
  MapPin,
  User,
  Clock,
  Route,
  LayoutGrid,
  List,
  Zap,
  ExternalLink,
  Map,
  Radio,
  Phone,
  MessageCircle,
  
} from "lucide-react";
import { format, addDays, parseISO, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import PlanningTimeline from "@/components/planning/PlanningTimeline";
import BackhaulSuggestionsPanel from "@/components/route/BackhaulSuggestionsPanel";
import { useBackhaulSuggestions } from "@/hooks/useBackhaulSuggestions";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Trip {
  id: string;
  trip_date: string;
  pickup_address: string;
  pickup_postal_code: string | null;
  pickup_city: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_address: string;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  status: string;
  distance_km: number | null;
  driver_id: string | null;
  is_composite?: boolean;
  estimated_arrival: string | null;
  delivery_time_from: string | null;
  delivery_time_to: string | null;
  customer: { company_name: string } | null;
  vehicle: { license_plate: string; brand: string; model: string } | null;
}

const formatEta = (trip: Trip): string => {
  if (trip.estimated_arrival) {
    try {
      const d = new Date(trip.estimated_arrival);
      if (!isNaN(d.getTime())) return format(d, "HH:mm");
    } catch {}
  }
  const from = trip.delivery_time_from;
  const to = trip.delivery_time_to;
  if (from || to) {
    const fmt = (t: string | null) => t ? t.substring(0, 5) : null;
    const f = fmt(from);
    const t = fmt(to);
    if (f && t) return `${f}–${t}`;
    return f || t || "–";
  }
  return "–";
};

const RoutePlanning = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: tenantSettings } = useTenantSettings();

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [showAddStopDialog, setShowAddStopDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "live">("list");
  const [showMap, setShowMap] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const liveMapRef = React.useRef<BaseMapRef>(null);
  const liveMarkersRef = React.useRef<Record<string, mapboxgl.Marker>>({});
  const [liveMapLoaded, setLiveMapLoaded] = useState(false);

  const { optimizeRoute, isOptimizing: isAdvancedOptimizing } = useAdvancedRouteOptimization();
  const { suggestions: backhaulSuggestions, loading: backhaulLoading, fetchSuggestions: fetchBackhaul, assignDriver: assignBackhaulDriver } = useBackhaulSuggestions();
  const [selectedTripForBackhaul, setSelectedTripForBackhaul] = useState<Trip | null>(null);

  // Live driver locations
  const { locations: driverLocations, loading: driversLoading, activeCount, refetch: refetchDrivers } = useAllDriverLocations({
    refreshInterval: 15000,
    maxAgeMinutes: 60,
  });

  // Geofence & standstill alerts
  const {
    alerts: geofenceAlerts,
    alertCounts,
    newAlertCount,
    clearNewAlertCount,
    acknowledgeAlert,
    dismissAlert,
    driversWithAlerts,
  } = useGeofenceAlerts(driverLocations);

  // Sync driver markers onto BaseMap
  const hasFittedLiveRef = React.useRef(false);
  React.useEffect(() => {
    const map = liveMapRef.current?.map;
    if (!map || !liveMapLoaded) return;

    loadMapboxGL().then(mb => {
      const currentIds = new Set(driverLocations.map(l => l.driver_id));

      // Remove stale markers
      Object.keys(liveMarkersRef.current).forEach(id => {
        if (!currentIds.has(id)) {
          liveMarkersRef.current[id].remove();
          delete liveMarkersRef.current[id];
        }
      });

      // Add / update markers
      driverLocations.forEach(loc => {
        const isActive = new Date(loc.recorded_at).getTime() > Date.now() - 5 * 60 * 1000;
        const hasAlert = driversWithAlerts.has(loc.driver_id);
        const existing = liveMarkersRef.current[loc.driver_id];

        if (existing) {
          existing.setLngLat([loc.longitude, loc.latitude]);
        } else {
          const el = document.createElement("div");
          el.style.cursor = "pointer";
          const markerColor = hasAlert ? 'hsl(0,84%,60%)' : isActive ? 'hsl(217,91%,60%)' : 'hsl(215,16%,47%)';
          el.innerHTML = `
            <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
              background:${markerColor};
              border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);${hasAlert ? 'animation:pulse 1.5s infinite;' : ''}">
              <svg viewBox="0 0 24 24" fill="white" width="14" height="14" style="transform:rotate(${loc.heading ?? 0}deg);">
                <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
              </svg>
            </div>
            <div style="text-align:center;font-size:9px;font-weight:600;margin-top:2px;">
              ${loc.driver_name.split(' ')[0]}
            </div>
          `;
          el.addEventListener("click", () => {
            setSelectedDriverId(prev => prev === loc.driver_id ? null : loc.driver_id);
            liveMapRef.current?.flyTo([loc.longitude, loc.latitude], 14);
          });

          const marker = new mb.Marker({ element: el })
            .setLngLat([loc.longitude, loc.latitude])
            .addTo(map);
          liveMarkersRef.current[loc.driver_id] = marker;
        }
      });

      // Fit bounds once on first data load
      if (!hasFittedLiveRef.current && driverLocations.length >= 2) {
        hasFittedLiveRef.current = true;
        const bounds = new mb.LngLatBounds();
        driverLocations.forEach(l => bounds.extend([l.longitude, l.latitude]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 1000 });
      }
    });
  }, [driverLocations, liveMapLoaded, driversWithAlerts]);


  const dateOptions = [
    { value: format(new Date(), "yyyy-MM-dd"), label: "Vandaag" },
    { value: format(addDays(new Date(), 1), "yyyy-MM-dd"), label: "Morgen" },
    { value: format(addDays(new Date(), 2), "yyyy-MM-dd"), label: format(addDays(new Date(), 2), "EEEE", { locale: nl }) },
    { value: "all", label: "Alle ritten" },
  ];

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["trips-route-planning", selectedDate],
    queryFn: async () => {
      let query = supabase
        .from("trips")
        .select(`*, customer:customers(company_name), vehicle:vehicles(license_plate, brand, model)`)
        .in("status", ["gepland", "onderweg"])
        .is("deleted_at", null)
        .order("trip_date", { ascending: true });

      if (selectedDate !== "all") {
        query = query.eq("trip_date", selectedDate);
      } else {
        query = query.gte("trip_date", format(new Date(), "yyyy-MM-dd"));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Trip[];
    },
  });

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    if (!searchQuery.trim()) return trips;
    const q = searchQuery.toLowerCase();
    return trips.filter(
      (trip) =>
        trip.customer?.company_name?.toLowerCase().includes(q) ||
        trip.vehicle?.license_plate?.toLowerCase().includes(q) ||
        trip.pickup_city?.toLowerCase().includes(q) ||
        trip.delivery_city?.toLowerCase().includes(q)
    );
  }, [trips, searchQuery]);

  const activeTrips = filteredTrips.filter((t) => t.status === "onderweg");
  const plannedTrips = filteredTrips.filter((t) => t.status === "gepland");

  const mapStops: OptimizableStop[] = useMemo(() => {
    const stops: OptimizableStop[] = [];
    filteredTrips.forEach((trip) => {
      if (trip.pickup_latitude && trip.pickup_longitude) {
        stops.push({ id: `${trip.id}-pickup`, address: trip.pickup_address, city: trip.pickup_city || undefined, latitude: trip.pickup_latitude, longitude: trip.pickup_longitude, stopType: "pickup", companyName: trip.customer?.company_name });
      }
      if (trip.delivery_latitude && trip.delivery_longitude) {
        stops.push({ id: `${trip.id}-delivery`, address: trip.delivery_address, city: trip.delivery_city || undefined, latitude: trip.delivery_latitude, longitude: trip.delivery_longitude, stopType: "delivery", companyName: trip.customer?.company_name });
      }
    });
    return stops;
  }, [filteredTrips]);

  const hasMapData = mapStops.length > 0;

  const toggleTripSelection = (tripId: string) => {
    const newSet = new Set(selectedTrips);
    if (newSet.has(tripId)) newSet.delete(tripId); else newSet.add(tripId);
    setSelectedTrips(newSet);

    // Trigger backhaul for the clicked trip
    const trip = filteredTrips.find(t => t.id === tripId);
    if (trip && trip.delivery_latitude && trip.delivery_longitude) {
      setSelectedTripForBackhaul(trip);
      fetchBackhaul({
        delivery_latitude: trip.delivery_latitude,
        delivery_longitude: trip.delivery_longitude,
        delivery_city: trip.delivery_city,
        trip_date: trip.trip_date,
        current_trip_id: trip.id,
      });
    }
  };

  const handleOptimize = async () => {
    if (selectedTrips.size < 2) {
      toast({ title: "Selecteer minimaal 2 ritten om te optimaliseren", variant: "destructive" });
      return;
    }
    setIsOptimizing(true);
    try {
      const selectedStops: OptimizableStop[] = [];
      filteredTrips.filter((t) => selectedTrips.has(t.id)).forEach((trip) => {
        if (trip.pickup_latitude && trip.pickup_longitude) {
          selectedStops.push({ id: `${trip.id}-pickup`, address: trip.pickup_address, city: trip.pickup_city || undefined, latitude: trip.pickup_latitude, longitude: trip.pickup_longitude, stopType: "pickup", companyName: trip.customer?.company_name });
        }
        if (trip.delivery_latitude && trip.delivery_longitude) {
          selectedStops.push({ id: `${trip.id}-delivery`, address: trip.delivery_address, city: trip.delivery_city || undefined, latitude: trip.delivery_latitude, longitude: trip.delivery_longitude, stopType: "delivery", companyName: trip.customer?.company_name });
        }
      });
      const result = await optimizeRoute(selectedStops, { strategy: "fastest", respectTimeWindows: true, startTime: new Date() });
      if (result) {
        toast({ title: "Route geoptimaliseerd", description: `${result.totalDistance.toFixed(1)} km totaal` });
      }
    } catch (error: any) {
      toast({ title: "Optimalisatie mislukt", description: error.message, variant: "destructive" });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "onderweg": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">Onderweg</Badge>;
      case "gepland": return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Gepland</Badge>;
      default: return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{status}</Badge>;
    }
  };

  const activeProvider = tenantSettings?.route_optimization_provider || 'smartroute';
  const providerLabels: Record<string, string> = { smartroute: "SmartRoute", routexl: "RouteXL" };

  // Handle clicking an "onderweg" trip to fly to its driver on the live map
  const handleTripClickLive = (trip: Trip) => {
    if (trip.status === "onderweg" && trip.driver_id) {
      setSelectedDriverId(trip.driver_id);
      if (viewMode !== "live") setViewMode("live");
    }
  };

  return (
    <DashboardLayout title="Track Chauffeurs">
      <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] -mx-4 md:-mx-6 -mt-4 md:-mt-6">
        {/* Compact header */}
        <div className="flex flex-col gap-2 px-3 md:px-4 py-2.5 border-b border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Route className="h-4.5 w-4.5 text-primary" />
              <h2 className="font-semibold text-sm md:text-base">Ritten</h2>
              <Badge variant="outline" className="bg-card/60 border-border/30 text-[10px] gap-1 py-0 px-1.5 hidden md:flex">
                <Zap className="h-2.5 w-2.5 text-primary" />
                {providerLabels[activeProvider]}
              </Badge>

              {/* Inline stats */}
              <div className="hidden md:flex items-center gap-3 ml-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  {activeTrips.length} onderweg
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
                  {plannedTrips.length} gepland
                </span>
                {activeCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    {activeCount} live
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {selectedTrips.size > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selectedTrips.size} sel.</Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="h-8 w-8 p-0 md:w-auto md:px-2.5">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden md:inline ml-1.5 text-xs">Import</span>
              </Button>
              {hasMapData && viewMode === "list" && (
                <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)} className="h-8 w-8 p-0 hidden md:flex">
                  <Map className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                onClick={() => {
                  if (selectedTrips.size < 2) {
                    toast({ title: "Selecteer minimaal 2 ritten om te optimaliseren", variant: "destructive" });
                    return;
                  }
                  navigate(`/route-optimization?trips=${Array.from(selectedTrips).join(",")}`);
                }}
                disabled={selectedTrips.size < 2}
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Optimaliseer route</span>
              </Button>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[110px] md:w-[130px] h-8 shrink-0 rounded-lg bg-background/60 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Datum" />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[120px] max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Zoeken..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 rounded-lg bg-background/60 text-xs"
              />
            </div>

            {/* View mode toggle with Live option */}
            <div className="flex items-center bg-muted/30 rounded-lg p-0.5 shrink-0 border border-border/20">
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-7 w-7 p-0 rounded-md">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button variant={viewMode === "timeline" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("timeline")} className="h-7 w-7 p-0 rounded-md">
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant={viewMode === "live" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setViewMode("live")} 
                className="h-7 px-2 gap-1 rounded-md relative"
              >
                <Radio className="h-3.5 w-3.5" />
                <span className="text-[10px] hidden sm:inline">Live</span>
                {activeCount > 0 && alertCounts.total === 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
                {alertCounts.total > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
                    {alertCounts.total}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Content area with AnimatePresence */}
        <AnimatePresence mode="wait">
          {/* Timeline View */}
          {viewMode === "timeline" && selectedDate !== "all" && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 p-3 md:p-4"
            >
              <PlanningTimeline selectedDate={parseISO(selectedDate)} />
            </motion.div>
          )}

          {/* Live View */}
          {viewMode === "live" && (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col md:flex-row overflow-hidden h-full"
              style={{ height: 'calc(100vh - 200px)' }}
            >
              {/* Driver list panel */}
              <div className="md:w-[280px] border-r border-border/20 flex flex-col min-h-0 bg-card/30 max-h-[40%] md:max-h-none overflow-auto">
                <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-sm font-semibold">{driverLocations.length} chauffeurs live</span>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => refetchDrivers()} className="h-7 w-7">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-2 space-y-1">
                    {driversLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : driverLocations.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Geen live chauffeurs</p>
                      </div>
                    ) : (
                      driverLocations.map((driver) => {
                        const isActive = new Date(driver.recorded_at).getTime() > Date.now() - 5 * 60 * 1000;
                        const isSelected = driver.driver_id === selectedDriverId;
                        const lastSeen = formatDistanceToNow(new Date(driver.recorded_at), { locale: nl, addSuffix: true });

                        return (
                          <div
                            key={driver.driver_id}
                            onClick={() => {
                              const newId = isSelected ? null : driver.driver_id;
                              setSelectedDriverId(newId);
                              if (newId && liveMapRef.current) {
                                liveMapRef.current.flyTo([driver.longitude, driver.latitude], 14);
                              }
                            }}
                            className={`p-2.5 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/40 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                              <span className="text-sm font-medium truncate flex-1">{driver.driver_name}</span>
                              {driver.speed && driver.speed > 0 && (
                                <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-md">
                                  {Math.round(driver.speed)} km/h
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1 ml-4">
                              <span className="text-[10px] text-muted-foreground/60">{lastSeen}</span>
                              {driver.phone && (
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                  <a href={`tel:${driver.phone}`} className="h-6 w-6 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                                    <Phone className="h-3 w-3" />
                                  </a>
                                  <a href={`https://wa.me/${driver.phone.replace(/[^0-9+]/g, "")}`} target="_blank" rel="noopener noreferrer" className="h-6 w-6 rounded bg-green-500/10 hover:bg-green-500/20 text-green-500 flex items-center justify-center">
                                    <MessageCircle className="h-3 w-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Geofence & Standstill Alerts */}
                <div className="border-t border-border/20">
                  <GeofenceAlertPanel
                    alerts={geofenceAlerts}
                    onFlyTo={(lat, lng) => liveMapRef.current?.flyTo([lng, lat], 14)}
                    onAcknowledge={acknowledgeAlert}
                    onDismiss={dismissAlert}
                    newAlertCount={newAlertCount}
                    onClearNew={clearNewAlertCount}
                  />
                </div>
              </div>


              {/* Live map */}
              <div className="flex-1 relative" style={{ minHeight: '400px' }}>
                <BaseMap
                  ref={liveMapRef}
                  style="light"
                  zoom={7.5}
                  showGeolocate={false}
                  showTraffic={true}
                  onLoad={() => setLiveMapLoaded(true)}
                  className="h-full w-full"
                />
              </div>
            </motion.div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 min-h-0 flex flex-col md:flex-row"
            >
              {/* Table section */}
              <div className={`flex-1 min-h-0 ${showMap && hasMapData ? 'md:w-[60%]' : 'w-full'}`}>
                {/* Desktop Table */}
                <ScrollArea className="hidden md:block h-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                      <TableRow className="border-border/20 hover:bg-transparent">
                        <TableHead className="w-8 px-2"></TableHead>
                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">Status</TableHead>
                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">Klant</TableHead>
                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">Voertuig</TableHead>
                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">Route</TableHead>
                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 text-right">km</TableHead>
                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">ETA</TableHead>
                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tripsLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Laden...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredTrips.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12">
                            <Truck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-xs text-muted-foreground">Geen ritten gevonden</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTrips.map((trip) => (
                          <TableRow
                            key={trip.id}
                            className={`cursor-pointer transition-colors border-border/10 h-11 ${
                              selectedTrips.has(trip.id) ? "bg-primary/5" : "hover:bg-muted/20"
                            }`}
                            onClick={() => toggleTripSelection(trip.id)}
                          >
                            <TableCell className="px-2">
                              <input type="checkbox" checked={selectedTrips.has(trip.id)} onChange={(e) => { e.stopPropagation(); toggleTripSelection(trip.id); }} className="rounded border-border h-3.5 w-3.5 cursor-pointer" />
                            </TableCell>
                            <TableCell className="px-2">
                              <div className="flex items-center gap-1">
                                {getStatusBadge(trip.status)}
                                {(trip as any).is_composite && <CompositeRouteBadge />}
                              </div>
                            </TableCell>
                            <TableCell className="px-2">
                              <span className="font-medium text-xs truncate block max-w-[120px]">{trip.customer?.company_name || "–"}</span>
                            </TableCell>
                            <TableCell className="px-2">
                              {trip.vehicle ? (
                                <span className="text-xs tabular-nums">{trip.vehicle.license_plate}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {trip.driver_id ? "Toegewezen" : "Open"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-2">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="truncate max-w-[70px]">{trip.pickup_city || "–"}</span>
                                <span className="text-muted-foreground/60 mx-0.5">→</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                <span className="truncate max-w-[70px]">{trip.delivery_city || "–"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs px-2 text-muted-foreground">
                              {trip.distance_km ? `${trip.distance_km.toFixed(0)}` : "–"}
                            </TableCell>
                            <TableCell
                              onClick={(e) => { e.stopPropagation(); navigate(`/route-optimization?trip=${trip.id}`); }}
                              className="cursor-pointer group/eta px-2"
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1 text-xs">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className={`tabular-nums group-hover/eta:underline ${getEtaStatusColor(trip.estimated_arrival ? (() => { try { const d = new Date(trip.estimated_arrival); return !isNaN(d.getTime()) ? format(d, "HH:mm") : null; } catch { return null; } })() : null, trip.delivery_time_to?.substring(0, 5) ?? null) || ""}`}>{formatEta(trip)}</span>
                                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/eta:opacity-100 transition-opacity" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Open route optimalisatie</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()} className="px-2">
                              {trip.status === "onderweg" && trip.driver_id && (
                                <DriverTrackButton
                                  tripId={trip.id}
                                  driverName="Chauffeur"
                                  vehiclePlate={trip.vehicle?.license_plate}
                                  destination={trip.delivery_latitude && trip.delivery_longitude ? { address: trip.delivery_address, latitude: trip.delivery_latitude, longitude: trip.delivery_longitude } : undefined}
                                  showLabel={false} variant="ghost" size="sm"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Mobile Card View */}
                <ScrollArea className="md:hidden h-full">
                  <div className="p-2.5 space-y-1.5">
                    {/* Mobile stats */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1 pb-1">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        {activeTrips.length} onderweg
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        {plannedTrips.length} gepland
                      </span>
                    </div>
                    
                    {tripsLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <RefreshCw className="h-5 w-5 animate-spin mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Laden...</p>
                      </div>
                    ) : filteredTrips.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Truck className="h-8 w-8 mb-2 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Geen ritten gevonden</p>
                      </div>
                    ) : (
                      filteredTrips.map((trip) => (
                        <div
                          key={trip.id}
                          onClick={() => toggleTripSelection(trip.id)}
                          className={`p-3 rounded-lg border transition-all active:scale-[0.98] ${
                            selectedTrips.has(trip.id)
                              ? "bg-primary/5 border-primary/30"
                              : "bg-card/50 border-border/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <input type="checkbox" checked={selectedTrips.has(trip.id)} onChange={() => toggleTripSelection(trip.id)} className="rounded border-border h-4 w-4 cursor-pointer" />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-xs">{trip.customer?.company_name || "Geen klant"}</p>
                                  {(trip as any).is_composite && <CompositeRouteBadge />}
                                </div>
                                <div className="mt-0.5">{getStatusBadge(trip.status)}</div>
                              </div>
                            </div>
                            {trip.distance_km && (
                              <span className="text-xs tabular-nums text-muted-foreground">{trip.distance_km.toFixed(0)} km</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs mb-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="truncate max-w-[90px]">{trip.pickup_city || "–"}</span>
                            <span className="text-muted-foreground/60">→</span>
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="truncate max-w-[90px]">{trip.delivery_city || "–"}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div
                              onClick={(e) => { e.stopPropagation(); navigate(`/route-optimization?trip=${trip.id}`); }}
                              className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer group/eta-mobile"
                            >
                              <Clock className="h-3 w-3" />
                              <span className="tabular-nums group-hover/eta-mobile:underline">ETA: {formatEta(trip)}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover/eta-mobile:opacity-100 transition-opacity" />
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {trip.vehicle && (
                                <span className="bg-muted/30 px-1.5 py-0.5 rounded text-[10px] tabular-nums border border-border/20">{trip.vehicle.license_plate}</span>
                              )}
                              {trip.status === "onderweg" && trip.driver_id && (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <DriverTrackButton
                                    tripId={trip.id} driverName="Chauffeur" vehiclePlate={trip.vehicle?.license_plate}
                                    destination={trip.delivery_latitude && trip.delivery_longitude ? { address: trip.delivery_address, latitude: trip.delivery_latitude, longitude: trip.delivery_longitude } : undefined}
                                    showLabel={false} variant="ghost" size="sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Map section - side by side on desktop, only when data exists */}
              {showMap && hasMapData && (
                <div className="hidden md:flex md:w-[40%] border-l border-border/20 relative flex-col">
                  <div className="flex-1 relative">
                    <IsolatedErrorBoundary name="Map">
                      <RouteOptimizationMap stops={mapStops} optimizationResult={null} className="h-full w-full" />
                    </IsolatedErrorBoundary>
                  </div>
                  {/* Backhaul panel below map */}
                  {selectedTripForBackhaul && (
                    <div className="border-t border-border/20 p-2.5">
                      <BackhaulSuggestionsPanel
                        suggestions={backhaulSuggestions}
                        loading={backhaulLoading}
                        currentDriverId={selectedTripForBackhaul.driver_id}
                        onAssignDriver={assignBackhaulDriver}
                        onRefetch={() => {
                          if (selectedTripForBackhaul.delivery_latitude && selectedTripForBackhaul.delivery_longitude) {
                            fetchBackhaul({
                              delivery_latitude: selectedTripForBackhaul.delivery_latitude,
                              delivery_longitude: selectedTripForBackhaul.delivery_longitude,
                              delivery_city: selectedTripForBackhaul.delivery_city,
                              trip_date: selectedTripForBackhaul.trip_date,
                              current_trip_id: selectedTripForBackhaul.id,
                            });
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddStopDialog open={showAddStopDialog} onOpenChange={setShowAddStopDialog} onAddStop={(stop) => toast({ title: "Stop toegevoegd", description: `${stop.companyName || stop.address} is klaar voor route optimalisatie` })} />
      <OrderImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
    </DashboardLayout>
  );
};

export default RoutePlanning;

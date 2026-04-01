import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import { Announce } from "@/components/accessibility/FocusStyles";
import { getEtaStatusColor } from "@/utils/etaColor";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Settings2 } from "lucide-react";
import {
  Route,
  MapPin,
  Clock,
  Fuel,
  Leaf,
  Play,
  RotateCcw,
  Save,
  Download,
  Undo2,
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Truck,
  Navigation,
  Zap,
  Brain,
  Database,
  RefreshCw,
  ExternalLink,
  Timer,
  Gauge,
  MessageSquare,
  Paperclip,
  Upload,
  ChevronDown,
  CalendarClock,
  LocateFixed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { exportRoutePDF } from "@/utils/routePdfExport";
import { exportRouteGPX } from "@/utils/routeGpxExport";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import AddStopDialog from "@/components/route/AddStopDialog";
import ImportStopsDialog from "@/components/route/ImportStopsDialog";
import { useAdvancedRouteOptimization, type OptimizableStop } from "@/hooks/useAdvancedRouteOptimization";
import { useRouteOptimizationStops } from "@/hooks/useRouteOptimizationStops";
import { supabase } from "@/integrations/supabase/client";
import { useGeocodeBackfill } from "@/hooks/useGeocodeBackfill";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { Progress } from "@/components/ui/progress";
import RouteOptimizationMap from "@/components/route/RouteOptimizationMap";
import { NavigationConfirmDialog } from "@/components/route/NavigationConfirmDialog";
import { wazeMultiStopUrls, appleMapsMultiStopUrls, type NavApp } from "@/lib/navigation-urls";
import { geocodeAddress } from "@/utils/geocoding";
import { useTollDetection, type TollDetectionResult } from "@/hooks/useTollDetection";
import TollCostPanel from "@/components/route/TollCostPanel";
import TollComparisonPanel, { type TollFreeAlternative } from "@/components/route/TollComparisonPanel";
import { logger } from "@/lib/logger";

// Safe time formatter that handles HH:MM, HH:MM:SS, ISO strings, and invalid values
const safeFormatTime = (value: string | null | undefined): string | null => {
  if (!value) return null;
  // Already HH:MM format
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  // HH:MM:SS format
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.substring(0, 5);
  // Try ISO parse
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    }
  } catch {}
  return null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
};


const providerLabels: Record<string, string> = {
  smartroute: "SmartRoute",
  routexl: "RouteXL",
};

const vehicleLabels: Record<string, string> = {
  truck: "Vrachtwagen",
  van: "Bestelbus",
  car: "Personenauto",
  bicycle: "Fiets",
};

// Circular score gauge component
const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "hsl(var(--success))" : score >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <motion.circle
          cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{score}%</span>
      </div>
    </div>
  );
};

const RouteOptimization = () => {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const { toast } = useToast();
  const { company } = useCompany();
  const { stops: dbStops, isLoading: stopsLoading, refetch, hasRealData } = useRouteOptimizationStops();
  const { data: tenantSettings } = useTenantSettings();
  useGeocodeBackfill();
  
  const [stops, setStops] = useState<Array<{ id: string; address: string; city: string; lat: number; lng: number; timeWindow: string; priority: string; tripId?: string; orderNumber?: string; stopType?: string; houseNumber?: string; notes?: string; documentUrl?: string; documentName?: string; country?: string }>>(demoStops);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [respectTimeWindows, setRespectTimeWindows] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [vehicleType, setVehicleType] = useState("truck");
  const [optimizationStrategy, setOptimizationStrategy] = useState("distance");
  const [isAddStopDialogOpen, setIsAddStopDialogOpen] = useState(false);
  const [isImportStopsOpen, setIsImportStopsOpen] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState<{ total: number; done: number } | null>(null);
  const [, setUndoTick] = useState(0);
  const previousStopsStack = useRef<Array<typeof stops>>([]);
  const originalStopsOrder = useRef<typeof stops>([]);
  const [tollResult, setTollResult] = useState<TollDetectionResult | null>(null);
  const [tollFreeAlt, setTollFreeAlt] = useState<TollFreeAlternative | null>(null);
  const [isLoadingTollFreeAlt, setIsLoadingTollFreeAlt] = useState(false);
  const { detectTolls, isDetecting: isTollDetecting } = useTollDetection();
  
  const { optimizeRoute, isOptimizing, error } = useAdvancedRouteOptimization();

  // Initialize from tenant settings
  useEffect(() => {
    if (tenantSettings) {
      setVehicleType(tenantSettings.route_vehicle_type || 'truck');
    }
  }, [tenantSettings]);

  // Update stops when DB data loads — only if no URL trip params are present
  const urlTripIds = useMemo(() => {
    const raw = searchParams.get("trips") || searchParams.get("trip");
    if (!raw) return null;
    return raw.split(",").filter(Boolean);
  }, [searchParams]);

  const urlTripsLoaded = useRef(false);

  useEffect(() => {
    if (hasRealData && dbStops.length > 0 && !urlTripIds) {
      setStops(dbStops);
      setOrderDirty(false);
      originalStopsOrder.current = [...dbStops];
      previousStopsStack.current = [];
    }
  }, [dbStops, hasRealData, urlTripIds]);

  // Load trips from URL params (?trips=id1,id2 or ?trip=id)
  useEffect(() => {
    if (!urlTripIds || urlTripIds.length === 0 || urlTripsLoaded.current || !company?.id) return;
    urlTripsLoaded.current = true;

    const loadUrlTrips = async () => {
      try {
        const { data: trips, error: tripsError } = await supabase
          .from("trips")
          .select(`
            id,
            order_number,
            pickup_address,
            pickup_city,
            pickup_postal_code,
            pickup_latitude,
            pickup_longitude,
            pickup_time_from,
            pickup_time_to,
            delivery_address,
            delivery_city,
            delivery_postal_code,
            delivery_latitude,
            delivery_longitude,
            delivery_time_from,
            delivery_time_to,
            route_stops (
              id,
              stop_order,
              stop_type,
              address,
              city,
              latitude,
              longitude,
              time_window_start,
              time_window_end,
              status
            )
          `)
          .in("id", urlTripIds);

        if (tripsError) throw tripsError;

        const loadedStops: typeof stops = [];
        (trips || []).forEach((trip) => {
          if (trip.route_stops && trip.route_stops.length > 0) {
            trip.route_stops
              .filter((s: any) => s.status !== "completed")
              .sort((a: any, b: any) => (a.stop_order ?? 0) - (b.stop_order ?? 0))
              .forEach((stop: any) => {
                const twStart = stop.time_window_start?.substring(0, 5) || null;
                const twEnd = stop.time_window_end?.substring(0, 5) || null;
                loadedStops.push({
                  id: stop.id,
                  address: stop.address || trip.pickup_address,
                  city: stop.city || trip.pickup_city || "",
                  lat: stop.latitude || 0,
                  lng: stop.longitude || 0,
                  timeWindow: twStart && twEnd ? `${twStart}-${twEnd}` : twStart ? `Vanaf ${twStart}` : "Flexibel",
                  priority: stop.stop_type === "pickup" ? "high" : "medium",
                  tripId: trip.id,
                  orderNumber: trip.order_number || undefined,
                  stopType: stop.stop_type,
                });
              });
          } else {
            // Fallback: use trip pickup/delivery addresses
            const puFrom = trip.pickup_time_from?.substring(0, 5) || null;
            const puTo = trip.pickup_time_to?.substring(0, 5) || null;
            const dlFrom = trip.delivery_time_from?.substring(0, 5) || null;
            const dlTo = trip.delivery_time_to?.substring(0, 5) || null;

            if (trip.pickup_address) {
              loadedStops.push({
                id: `${trip.id}-pickup`,
                address: trip.pickup_address,
                city: trip.pickup_city || "",
                lat: trip.pickup_latitude || 0,
                lng: trip.pickup_longitude || 0,
                timeWindow: puFrom && puTo ? `${puFrom}-${puTo}` : puFrom ? `Vanaf ${puFrom}` : "Flexibel",
                priority: "high",
                tripId: trip.id,
                orderNumber: trip.order_number || undefined,
                stopType: "pickup",
              });
            }
            if (trip.delivery_address) {
              loadedStops.push({
                id: `${trip.id}-delivery`,
                address: trip.delivery_address,
                city: trip.delivery_city || "",
                lat: trip.delivery_latitude || 0,
                lng: trip.delivery_longitude || 0,
                timeWindow: dlFrom && dlTo ? `${dlFrom}-${dlTo}` : dlFrom ? `Vanaf ${dlFrom}` : "Flexibel",
                priority: "medium",
                tripId: trip.id,
                orderNumber: trip.order_number || undefined,
                stopType: "delivery",
              });
            }
          }
        });

        if (loadedStops.length > 0) {
          setStops(loadedStops);
          originalStopsOrder.current = [...loadedStops];
          previousStopsStack.current = [];
          toast({
            title: `${loadedStops.length} stops geladen`,
            description: `${urlTripIds.length} rit${urlTripIds.length > 1 ? "ten" : ""} klaar voor optimalisatie`,
          });
        } else {
          toast({
            title: "Geen stops gevonden",
            description: "De geselecteerde ritten hebben geen stops om te optimaliseren.",
            variant: "destructive",
          });
        }
      } catch (err: any) {
        console.error("[RouteOptimization] URL trip load failed:", err);
        toast({
          title: "Laden mislukt",
          description: err.message || "Kon ritten niet laden",
          variant: "destructive",
        });
      }
    };

    loadUrlTrips();
  }, [urlTripIds, company?.id, toast]);

  // Track which stops have been geocoded (prevent infinite loop)
  const geocodedIds = useRef<Set<string>>(new Set());
  const geocodeRunning = useRef(false);

  // Geocode stops that have lat: 0, lng: 0 — max 1 attempt per stop
  const geocodeMissingStops = useCallback(async (currentStops: typeof stops) => {
    const missing = currentStops.filter(
      s => s.lat === 0 && s.lng === 0 && s.address && !geocodedIds.current.has(s.id)
    );
    if (missing.length === 0 || geocodeRunning.current) return;

    geocodeRunning.current = true;
    // Mark all as attempted immediately to prevent re-entry
    missing.forEach(s => geocodedIds.current.add(s.id));

    setGeocodeProgress({ total: missing.length, done: 0 });
    
    let completed = 0;
    for (let i = 0; i < missing.length; i += 3) {
      const batch = missing.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(s => geocodeAddress(s.address, undefined, s.city || undefined))
      );
      setStops(prev => prev.map(s => {
        const batchIdx = batch.findIndex(b => b.id === s.id);
        if (batchIdx >= 0 && results[batchIdx].status === 'fulfilled') {
          const val = (results[batchIdx] as PromiseFulfilledResult<any>).value;
          if (val) return { ...s, lat: val.latitude, lng: val.longitude };
        }
        return s;
      }));
      completed += batch.length;
      setGeocodeProgress({ total: missing.length, done: Math.min(completed, missing.length) });
    }

    setTimeout(() => setGeocodeProgress(null), 2000);
    geocodeRunning.current = false;
  }, []);

  // Auto-geocode stops with missing coordinates (debounced, no infinite loop)
  useEffect(() => {
    const missing = stops.filter(s => s.lat === 0 && s.lng === 0 && s.address && !geocodedIds.current.has(s.id));
    if (missing.length === 0) return;
    const timer = setTimeout(() => {
      logger.log(`[RouteOptimization] ${missing.length} stops need geocoding`);
      geocodeMissingStops(stops);
    }, 400);
    return () => clearTimeout(timer);
  }, [stops, geocodeMissingStops]);

  const handleAddStop = (newStop: OptimizableStop) => {
    const addressWithNumber = newStop.houseNumber 
      ? `${newStop.address} ${newStop.houseNumber}` 
      : newStop.address;
    const start = safeFormatTime(newStop.timeWindowStart);
    const end = safeFormatTime(newStop.timeWindowEnd);
    const stop = {
      id: newStop.id,
      address: newStop.companyName || addressWithNumber,
      city: newStop.city || "",
      lat: newStop.latitude || 0,
      lng: newStop.longitude || 0,
      timeWindow: start && end ? `${start}-${end}` : start ? `Vanaf ${start}` : "Flexibel",
      priority: newStop.priority === "urgent" ? "high" : newStop.priority === "high" ? "high" : newStop.priority === "normal" ? "medium" : "low",
      houseNumber: newStop.houseNumber,
      notes: newStop.notes,
      documentUrl: newStop.documentUrl,
      documentName: newStop.documentName,
      country: newStop.country,
    };
    const updatedStops = [...stops, stop];
    setStops(updatedStops);
    setOptimizationResult(null);
    // Geocode if coordinates are missing
    if (stop.lat === 0 && stop.lng === 0) {
      geocodeMissingStops(updatedStops);
    }
  };

  const handleImportStops = (importedStops: OptimizableStop[]) => {
    const newStops = importedStops.map(s => {
      const addressWithNumber = s.houseNumber ? `${s.address} ${s.houseNumber}` : s.address;
      const start = safeFormatTime(s.timeWindowStart);
      const end = safeFormatTime(s.timeWindowEnd);
      return {
        id: s.id,
        address: s.companyName || addressWithNumber,
        city: s.city || "",
        lat: s.latitude || 0,
        lng: s.longitude || 0,
        timeWindow: start && end ? `${start}-${end}` : start ? `Vanaf ${start}` : "Flexibel",
        priority: s.priority === "urgent" ? "high" : s.priority === "high" ? "high" : s.priority === "normal" ? "medium" : "low",
        houseNumber: s.houseNumber,
        notes: s.notes,
      };
    });
    const updatedStops = [...stops, ...newStops];
    setStops(updatedStops);
    setOptimizationResult(null);
    // Geocode any stops with missing coordinates
    geocodeMissingStops(updatedStops);
  };

  const handleOptimize = async () => {
    const serviceTime = tenantSettings?.route_service_time_minutes || 15;
    const speedPct = tenantSettings?.route_speed_percentage || 85;

    // Map stops to OptimizableStop format for useAdvancedRouteOptimization
    const optimizableStops: OptimizableStop[] = stops.map((stop) => {
      const hasValidTimeWindow = stop.timeWindow !== "Flexibel" 
        && !stop.timeWindow.includes("Invalid") 
        && stop.timeWindow.includes("-");
      return {
        id: stop.id,
        address: stop.address,
        city: stop.city,
        postalCode: "",
        latitude: stop.lat,
        longitude: stop.lng,
        stopType: "delivery" as const,
        timeWindowStart: hasValidTimeWindow ? stop.timeWindow.split("-")[0].trim() : null,
        timeWindowEnd: hasValidTimeWindow ? stop.timeWindow.split("-")[1].trim() : null,
        priority: stop.priority === "high" ? "urgent" : stop.priority === "medium" ? "high" : "normal",
        serviceDuration: serviceTime,
      };
    });

    const result = await optimizeRoute(optimizableStops, {
      strategy: optimizationStrategy === "distance" ? "shortest" : "fastest",
      respectTimeWindows: true,
      startTime: new Date(),
    });

    if (result) {
      // Apply speed correction
      const correctedDuration = result.totalDuration * (100 / speedPct);
      const originalDuration = correctedDuration + (result.savings?.timeSaved || 0);
      const originalDistance = result.totalDistance + (result.savings?.distanceSaved || 0);
      const timeSavedMin = result.savings?.timeSaved || 0;

      setOptimizationResult({
        totalDistance: result.totalDistance,
        totalDuration: correctedDuration,
        totalTime: `${Math.floor(correctedDuration / 60)}u ${Math.round(correctedDuration % 60)}m`,
        fuelSaved: result.savings ? ((result.savings.distanceSaved / 100) * 8 * 1.85).toFixed(1) : 0,
        co2Saved: result.co2Emissions || (result.savings?.distanceSaved || 0) * 0.12,
        originalDistance,
        originalTime: `${Math.floor(originalDuration / 60)}u ${Math.round(originalDuration % 60)}m`,
        timeSavedFormatted: `${Math.floor(timeSavedMin / 60)}u ${Math.round(timeSavedMin % 60)}m`,
        distanceSaved: result.savings?.distanceSaved || 0,
        optimizedOrder: result.stops.map((_, i) => i),
        geometry: result.geometry,
        savings: {
          distance: originalDistance > 0 ? Math.round(((result.savings?.distanceSaved || 0) / originalDistance) * 100) : 0,
          time: originalDuration > 0 ? Math.round((timeSavedMin / originalDuration) * 100) : 0,
          fuel: 0
        },
        serviceTimeUsed: serviceTime,
        speedCorrectionUsed: speedPct,
      });
      
      if (result.stops && result.stops.length > 0) {
        const reorderedStops = result.stops.map((s, i) => ({
          id: s.id,
          address: s.address,
          city: s.city || "",
          lat: s.latitude || 0,
          lng: s.longitude || 0,
          timeWindow: s.timeWindowStart && s.timeWindowEnd ? `${s.timeWindowStart}-${s.timeWindowEnd}` : "Flexibel",
          priority: s.priority === "urgent" ? "high" : s.priority === "high" ? "medium" : "low" as string,
          eta: s.arrivalTime
            ? new Date(s.arrivalTime).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
          durationFromPrev: i > 0 ? Math.round(s.etaMinutes - (result.stops[i - 1]?.etaMinutes || 0)) : null,
        }));
        setStops(reorderedStops);
      }

      // Auto-detect toll costs if route geometry available
      if (result.geometry) {
        detectTolls(result.geometry, vehicleType).then(tollRes => {
          setTollResult(tollRes);
          if (tollRes.hasTolls && !avoidTolls) {
            setTollFreeAlt(null);
          } else {
            setTollFreeAlt(null);
          }
        });
      }
    }
  };

  const handleReset = () => {
    if (hasRealData && dbStops.length > 0) {
      setStops(dbStops);
    } else {
      setStops(demoStops);
    }
    setOptimizationResult(null);
    setTollResult(null);
    setTollFreeAlt(null);
  };

  const handleRefreshFromDB = async () => {
    await refetch();
    toast({ title: "Stops herladen", description: "Stops zijn herladen uit de database" });
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter(stop => stop.id !== id));
    setOptimizationResult(null);
  };

  const [navDialogOpen, setNavDialogOpen] = useState(false);
  const [navDialogApp, setNavDialogApp] = useState<NavApp>('google');
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);

  const openNavDialog = (app: NavApp) => {
    setNavDialogApp(app);
    setNavDialogOpen(true);
  };

  const handleOpenNavigation = (app: NavApp, selectedStops: typeof stops) => {
    if (selectedStops.length < 1) return;

    const getLocation = (s: typeof stops[0]) =>
      s.lat && s.lng ? `${s.lat},${s.lng}` : encodeURIComponent(`${s.address}, ${s.city}`);

    if (app === 'google') {
      const MAX_POINTS = 25;
      const chunks: typeof stops[] = [];
      let remaining = [...selectedStops];
      while (remaining.length > MAX_POINTS) {
        chunks.push(remaining.slice(0, MAX_POINTS));
        remaining = remaining.slice(MAX_POINTS - 1);
      }
      chunks.push(remaining);

      if (chunks.length > 1) {
        toast({
          title: "Route opgesplitst",
          description: `Route opgesplitst in ${chunks.length} delen vanwege Google Maps limiet (max 25 bestemmingen).`,
        });
      }

      chunks.forEach((chunk) => {
        const origin = getLocation(chunk[0]);
        const dest = getLocation(chunk[chunk.length - 1]);
        const waypoints = chunk.slice(1, -1).map(getLocation).join('|');
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
        window.open(url, '_blank');
      });
    } else if (app === 'waze') {
      const urls = wazeMultiStopUrls(selectedStops);
      urls.forEach((url) => window.open(url, '_blank'));
      if (urls.length > 1) {
        toast({
          title: `${urls.length} tabbladen geopend`,
          description: "Waze ondersteunt geen multi-stop — navigeer naar elke stop apart.",
        });
      }
    } else if (app === 'apple') {
      const urls = appleMapsMultiStopUrls(selectedStops);
      urls.forEach((url) => window.open(url, '_blank'));
      if (urls.length > 1) {
        toast({
          title: `${urls.length} tabbladen geopend`,
          description: "Apple Kaarten ondersteunt geen multi-stop — navigeer naar elke stop apart.",
        });
      }
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Hoog</Badge>;
      case "medium": return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Medium</Badge>;
      case "low": return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Laag</Badge>;
      default: return null;
    }
  };

  // Map stops from local format (lat/lng) to OptimizableStop format (latitude/longitude)
  const mapStops: OptimizableStop[] = useMemo(() =>
    stops
      .filter(s => {
        if (!s.lat || !s.lng) return false;
        if (s.lat < -90 || s.lat > 90 || s.lng < -180 || s.lng > 180) return false;
        return true;
      })
      .map(s => {
        const twParts = (s.timeWindow || '').split('-');
        const timeWindowStart = twParts[0]?.trim() || undefined;
        const timeWindowEnd = twParts[1]?.trim() || undefined;

        return {
          id: s.id,
          address: s.address,
          city: s.city,
          latitude: s.lat,
          longitude: s.lng,
          stopType: ((s as any).stopType as any) || "stop",
          priority: s.priority === "high" ? "high" : s.priority === "urgent" ? "urgent" : "normal",
          companyName: s.address,
          timeWindowStart,
          timeWindowEnd,
          serviceDuration: (s as any).serviceDuration,
          arrivalTime: (s as any).eta ? new Date(`1970-01-01T${(s as any).eta}:00`).toISOString() : undefined,
        };
      }), [stops, optimizationResult]);

  // Drag & Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const stopListRef = useRef<HTMLDivElement>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');

  const handleReorderStops = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    previousStopsStack.current.push([...stops]);
    if (previousStopsStack.current.length > 10) previousStopsStack.current.shift();
    const updated = [...stops];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setStops(updated);
    setOptimizationResult(null);
    setOrderDirty(true);
    setUndoTick(t => t + 1);
  }, [stops]);

  const handleGripKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      e.stopPropagation();
      handleReorderStops(index, index - 1);
      haptic('selection');
      setReorderAnnouncement(`Stop ${index + 1} verplaatst naar positie ${index}`);
      requestAnimationFrame(() => {
        const grips = stopListRef.current?.querySelectorAll<HTMLButtonElement>('[data-grip-handle]');
        grips?.[index - 1]?.focus();
      });
    } else if (e.key === 'ArrowDown' && index < stops.length - 1) {
      e.preventDefault();
      e.stopPropagation();
      handleReorderStops(index, index + 1);
      haptic('selection');
      setReorderAnnouncement(`Stop ${index + 1} verplaatst naar positie ${index + 2}`);
      requestAnimationFrame(() => {
        const grips = stopListRef.current?.querySelectorAll<HTMLButtonElement>('[data-grip-handle]');
        grips?.[index + 1]?.focus();
      });
    }
  }, [handleReorderStops, stops.length]);

  const handleUndoReorder = useCallback(() => {
    const popped = previousStopsStack.current.pop();
    if (!popped) return;
    setStops(popped);
    setUndoTick(t => t + 1);
    if (previousStopsStack.current.length === 0) {
      setOrderDirty(false);
    }
  }, []);

  // Ctrl+Z shortcut for undo reorder
  useEffect(() => {
    if (!orderDirty) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        handleUndoReorder();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [orderDirty, handleUndoReorder]);

  const handleSaveOrder = useCallback(async () => {
    const dbStopsToSave = stops.filter(s => !s.id.includes("-pickup") && !s.id.includes("-delivery"));
    if (dbStopsToSave.length === 0) return;
    setIsSavingOrder(true);
    try {
      const updates = dbStopsToSave.map((stop, index) =>
        supabase.from("route_stops").update({ stop_order: index }).eq("id", stop.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
      setOrderDirty(false);
      toast({ title: "Volgorde opgeslagen ✅", description: "De stopvolgorde is bijgewerkt in de database" });
    } catch (err: any) {
      console.error("Save order failed:", err);
      toast({ title: "Opslaan mislukt", description: err.message || "Probeer het opnieuw", variant: "destructive" });
    } finally {
      setIsSavingOrder(false);
    }
  }, [stops, toast]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      handleReorderStops(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, handleReorderStops]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Touch support for mobile
  const prevDragOverIndex = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    touchStartY.current = e.touches[0].clientY;
    setDraggedIndex(index);
    haptic('medium');
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (draggedIndex === null || !stopListRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const elements = stopListRef.current.querySelectorAll('[data-stop-index]');
    for (let i = 0; i < elements.length; i++) {
      const rect = elements[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const newIndex = Number(elements[i].getAttribute('data-stop-index'));
        if (newIndex !== prevDragOverIndex.current) {
          prevDragOverIndex.current = newIndex;
          haptic('selection');
        }
        setDragOverIndex(newIndex);
        break;
      }
    }
  }, [draggedIndex]);

  const handleTouchEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null) {
      handleReorderStops(draggedIndex, dragOverIndex);
      haptic('success');
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    touchStartY.current = null;
    prevDragOverIndex.current = null;
  }, [draggedIndex, dragOverIndex, handleReorderStops]);

  const activeProvider = tenantSettings?.route_optimization_provider || 'smartroute';

  return (
    <DashboardLayout 
      title="Route Optimalisatie" 
      description="Optimaliseer multi-stop routes voor efficiëntie"
    >
      <motion.div 
        className="space-y-6 overflow-x-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header with provider badge */}
        <motion.div variants={itemVariants} className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {urlTripIds && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/planning")}
                className="h-8 gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Terug naar planning
              </Button>
            )}
            <Badge variant="outline" className="backdrop-blur-sm bg-card/60 border-border/30 text-xs gap-1.5 py-1 px-2.5">
              <Zap className="h-3 w-3 text-primary" />
              {providerLabels[activeProvider]} Optimizer
            </Badge>
            {tenantSettings && (
              <Badge variant="outline" className="backdrop-blur-sm bg-card/60 border-border/30 text-xs gap-1.5 py-1 px-2.5">
                <Gauge className="h-3 w-3 text-muted-foreground" />
                {tenantSettings.route_speed_percentage}% snelheid
              </Badge>
            )}
            {urlTripIds && (
              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs gap-1.5 py-1 px-2.5">
                <Route className="h-3 w-3" />
                {urlTripIds.length} rit{urlTripIds.length > 1 ? "ten" : ""} geselecteerd
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Savings Stats */}
        <AnimatePresence>
          {optimizationResult && (
            <motion.div 
              className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {[
                { 
                  label: "Afstand Bespaard", 
                  value: `-${optimizationResult.savings.distance}%`, 
                  sub: `${Math.round(optimizationResult.distanceSaved)} km minder`, 
                  icon: Route, 
                  gradient: "from-emerald-500/20 to-emerald-500/5",
                  iconColor: "text-emerald-500"
                },
                { 
                  label: "Tijd Bespaard", 
                  value: `-${optimizationResult.savings.time}%`, 
                  sub: `${optimizationResult.timeSavedFormatted} kortere rijtijd`, 
                  icon: Clock, 
                  gradient: "from-blue-500/20 to-blue-500/5",
                  iconColor: "text-blue-500"
                },
                { 
                  label: "Brandstof Bespaard", 
                  value: `${optimizationResult.fuelSaved} L`, 
                  sub: `~€${(parseFloat(optimizationResult.fuelSaved) * 1.85).toFixed(2)} bespaard`, 
                  icon: Fuel, 
                  gradient: "from-amber-500/20 to-amber-500/5",
                  iconColor: "text-amber-500"
                },
                { 
                  label: "CO₂ Reductie", 
                  value: `${typeof optimizationResult.co2Saved === 'number' ? optimizationResult.co2Saved.toFixed(1) : optimizationResult.co2Saved} kg`, 
                  sub: "Minder uitstoot", 
                  icon: Leaf, 
                  gradient: "from-green-500/20 to-green-500/5",
                  iconColor: "text-green-500"
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                >
                  <Card variant="glass" className="overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} pointer-events-none`} />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                      <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                      <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm">
                        <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className={`text-xl sm:text-2xl font-bold ${stat.iconColor}`}>{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Geocoding progress indicator */}
        <AnimatePresence>
          {geocodeProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card variant="glass" className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="h-4 w-4 text-amber-500 animate-pulse" />
                    <span className="text-sm font-medium">
                      {geocodeProgress.done < geocodeProgress.total
                        ? `Coördinaten ophalen... ${geocodeProgress.done} van ${geocodeProgress.total} stops`
                        : `✓ Alle ${geocodeProgress.total} stops gegeocoded`}
                    </span>
                  </div>
                  <Progress
                    value={(geocodeProgress.done / geocodeProgress.total) * 100}
                    className="h-2"
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map */}
        <motion.div variants={itemVariants}>
          <Card variant="ghost" className="overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <RouteOptimizationMap
                stops={mapStops}
                optimizationResult={optimizationResult?.geometry ? { stops: mapStops, geometry: optimizationResult.geometry } as any : null}
                className="h-[300px] sm:h-[350px] md:h-[400px] w-full"
                
              />
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col md:grid md:grid-cols-3 gap-6">
          {/* Stops List */}
          <motion.div variants={itemVariants} className="md:col-span-2 space-y-4 order-2 md:order-1">
            <Card variant="glass">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle>Route Stops</CardTitle>
                      {hasRealData ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-500/10 text-[10px]">
                          <Database className="h-3 w-3 mr-1" />
                          Live Data
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Demo Data</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">
                      {hasRealData 
                        ? `${stops.length} stops uit geplande orders` 
                        : "Sleep om handmatig te herschikken of gebruik AI optimalisatie"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Button variant="ghost" size="icon" onClick={handleRefreshFromDB} disabled={stopsLoading}>
                      <RefreshCw className={`h-4 w-4 ${stopsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsImportStopsOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Importeer</span>
                      <span className="sm:hidden">Import</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsAddStopDialogOpen(true)}>
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Stop toevoegen</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" ref={stopListRef}>
                  <AnimatePresence mode="popLayout">
                    {stops.map((stop: any, index) => (
                      <motion.div 
                        key={stop.id}
                        layout
                        data-stop-index={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e as any, index)}
                        onDragOver={(e) => handleDragOver(e as any, index)}
                        onDrop={(e) => handleDrop(e as any, index)}
                        onDragEnd={handleDragEnd}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        whileHover={{ scale: 1.01, backgroundColor: "hsl(var(--muted) / 0.6)" }}
                        className={`p-2.5 sm:p-3 bg-muted/30 backdrop-blur-sm rounded-xl border group transition-all overflow-hidden cursor-pointer ${
                          draggedIndex === index ? 'opacity-50 border-primary/50' : 'border-border/20'
                        } ${
                          dragOverIndex === index && draggedIndex !== index ? 'border-t-2 border-t-primary' : ''
                        } ${expandedStopId === stop.id ? 'ring-1 ring-primary/30' : ''}`}
                        onClick={() => setExpandedStopId(expandedStopId === stop.id ? null : stop.id)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        {/* Top row: grip + number + address + delete */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            data-grip-handle
                            aria-label={`Verplaats stop ${index + 1}, ${stops[index]?.address || ''}`}
                            aria-roledescription="versleepbaar"
                            className={`hidden sm:flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors touch-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded ${
                              draggedIndex !== null ? 'cursor-grabbing' : 'cursor-grab'
                            }`}
                            onTouchStart={(e) => handleTouchStart(e, index)}
                            onTouchMove={(e) => handleTouchMove(e)}
                            onTouchEnd={handleTouchEnd}
                            onKeyDown={(e) => handleGripKeyDown(e, index)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                          <Announce message={reorderAnnouncement} priority="assertive" />
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground text-xs sm:text-sm font-bold shadow-sm shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{stop.address}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {stop.city}{stop.country && stop.country !== "Nederland" ? ` · ${stop.country}` : ""}
                              </span>
                              <span className="text-border hidden sm:inline">•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {stop.timeWindow}
                              </span>
                            </div>
                          </div>
                          {/* Expand indicator + delete */}
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${expandedStopId === stop.id ? 'rotate-180' : ''}`} />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => { e.stopPropagation(); handleRemoveStop(stop.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        {/* ETA + priority compact row */}
                        <div className="flex items-center gap-2 pl-9 sm:pl-0 shrink-0">
                          {stop.eta ? (
                            <div className="flex sm:flex-col items-center gap-1 sm:gap-0 shrink-0 sm:min-w-[60px]">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">ETA</span>
                              <span className={`text-sm font-mono font-bold ${getEtaStatusColor(stop.eta, stop.timeWindow?.includes("-") ? stop.timeWindow.split("-")[1]?.trim() : null) || "text-primary"}`}>
                                {stop.eta}
                              </span>
                            </div>
                          ) : (
                            <div className="flex sm:flex-col items-center gap-1 sm:gap-0 shrink-0 sm:min-w-[60px]">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">ETA</span>
                              <span className="text-sm font-mono text-muted-foreground/50">--:--</span>
                            </div>
                          )}
                          {getPriorityBadge(stop.priority)}
                        </div>
                        </div>

                        {/* Expandable detail section */}
                        <AnimatePresence>
                          {expandedStopId === stop.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                {/* ETA */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Geschatte aankomst</span>
                                  <span className={`font-mono font-bold text-base ${stop.eta ? (getEtaStatusColor(stop.eta, stop.timeWindow?.includes("-") ? stop.timeWindow.split("-")[1]?.trim() : null) || "text-foreground") : "text-muted-foreground"}`}>
                                    {stop.eta || "Nog niet berekend"}
                                  </span>
                                </div>
                                {/* Time window */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tijdvenster</span>
                                  <span className="font-semibold text-foreground">{stop.timeWindow}</span>
                                </div>
                                {/* Travel time from previous */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-muted-foreground flex items-center gap-1"><Route className="h-3 w-3" /> Reistijd</span>
                                  <span className="font-semibold text-foreground">
                                    {stop.durationFromPrev && index > 0 ? `${stop.durationFromPrev} min` : index === 0 ? "Vertrekpunt" : "–"}
                                  </span>
                                </div>
                                {/* Coordinates */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-muted-foreground flex items-center gap-1"><LocateFixed className="h-3 w-3" /> Coördinaten</span>
                                  <span className="font-mono text-foreground text-[11px]">
                                    {stop.lat !== 0 ? `${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}` : "Onbekend"}
                                  </span>
                                </div>
                                {/* Notes */}
                                {stop.notes && (
                                  <div className="col-span-2 sm:col-span-4 flex flex-col gap-0.5">
                                    <span className="text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Notities</span>
                                    <span className="text-foreground">{stop.notes}</span>
                                  </div>
                                )}
                                {/* Document */}
                                {stop.documentName && (
                                  <div className="col-span-2 sm:col-span-4 flex flex-col gap-1">
                                    <span className="text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" /> Document</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-fit text-xs"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!stop.documentUrl) return;
                                        try {
                                          const { data, error } = await supabase.storage
                                            .from('order-documents')
                                            .createSignedUrl(stop.documentUrl, 300);
                                          if (error) throw error;
                                          if (data?.signedUrl) {
                                            window.open(data.signedUrl, '_blank');
                                          }
                                        } catch (err: any) {
                                          toast({ title: "Kan document niet openen", description: err.message, variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <ExternalLink className="h-3 w-3 mr-1.5" />
                                      {stop.documentName}
                                    </Button>
                                  </div>
                                )}
                                {/* ETA status explanation */}
                                {stop.eta && stop.timeWindow?.includes("-") && (
                                  <div className="col-span-2 sm:col-span-4">
                                    {(() => {
                                      const windowEnd = stop.timeWindow.split("-")[1]?.trim();
                                      const color = getEtaStatusColor(stop.eta, windowEnd);
                                      if (color === "text-red-500") return <span className="text-red-500 font-medium">⚠️ Te laat — ETA valt na het tijdvenster</span>;
                                      if (color === "text-orange-500") return <span className="text-orange-500 font-medium">⏰ Krap — minder dan 15 min marge</span>;
                                      if (color === "text-green-600") return <span className="text-green-600 font-medium">✅ Op tijd — ruim binnen het tijdvenster</span>;
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Route Summary */}
                <AnimatePresence>
                  {optimizationResult && (
                    <motion.div 
                      className="mt-6 space-y-4"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className="p-4 rounded-xl bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-emerald-500 text-sm">Geoptimaliseerde Route</span>
                          <div className="flex items-center gap-2">
                            {tenantSettings?.route_service_time_minutes && (
                              <Badge variant="outline" className="text-[10px] border-muted-foreground/30 text-muted-foreground">
                                <Timer className="h-3 w-3 mr-1" />
                                {tenantSettings.route_service_time_minutes} min/stop
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          {stops.slice(0, isMobile ? 6 : stops.length).map((_, index) => (
                            <React.Fragment key={index}>
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                                {index + 1}
                              </div>
                              {index < Math.min(stops.length, isMobile ? 6 : stops.length) - 1 && (
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                            </React.Fragment>
                          ))}
                          {isMobile && stops.length > 6 && (
                            <Badge variant="secondary" className="text-[10px] ml-1">+{stops.length - 6} meer</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Totale afstand</p>
                            <p className="font-bold">{Math.round(optimizationResult.totalDistance)} km</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Geschatte rijtijd</p>
                            <p className="font-bold">{optimizationResult.totalTime}</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Analysis Section */}
                      {optimizationResult.aiAnalysis && (
                        <motion.div 
                          className="p-4 rounded-xl backdrop-blur-xl bg-blue-500/5 border border-blue-500/20"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                        >
                          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            {/* Score Gauge */}
                            <div className="shrink-0">
                              <ScoreGauge score={optimizationResult.optimizationScore || 85} />
                              <p className="text-[10px] text-center text-muted-foreground mt-1">Score</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-blue-500 text-sm">AI Analyse</span>
                                <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                                  {optimizationResult.aiAnalysis.confidence}% confidence
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                {optimizationResult.aiAnalysis.reasoning}
                              </p>
                              {optimizationResult.aiAnalysis.tips?.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-medium text-blue-500">Tips:</p>
                                  {optimizationResult.aiAnalysis.tips.map((tip: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                      <span className="text-blue-500 mt-0.5">•</span>
                                      <span className="text-muted-foreground">{tip}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
            {/* Toll Comparison Panel */}
            {tollResult?.hasTolls && optimizationResult && !avoidTolls && (
              <div className="mt-4">
                <Card variant="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      ⚖️ Tol vs. Tolvrij
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Vergelijk kosten, afstand en reistijd
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TollComparisonPanel
                      currentToll={tollResult}
                      currentDistance={optimizationResult.totalDistance}
                      currentDuration={optimizationResult.totalDuration}
                      tollFreeAlt={tollFreeAlt}
                      isLoadingAlt={isLoadingTollFreeAlt}
                      vehicleType={vehicleType}
                      onChooseTollFree={() => {
                        setAvoidTolls(true);
                        toast({
                          title: "Tolvrije route geselecteerd",
                          description: "Klik op 'Optimaliseer Route' om de tolvrije route te berekenen.",
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Toll Cost Panel - inside stops column */}
            {(tollResult || isTollDetecting) && optimizationResult && (
              <div className="mt-4">
                <Card variant="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      💰 Tolkosten Overzicht
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Exacte berekening per land en voertuigtype
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TollCostPanel result={tollResult} isLoading={isTollDetecting} vehicleType={vehicleType} />
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>

          {/* Optimization Controls - right sidebar (desktop) / Sheet (mobile) */}
          {(() => {
            const settingsContent = (
              <div className="space-y-4">
                <Card variant="glass" className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
                  {!isMobile && (
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Optimalisatie Instellingen</CardTitle>
                    </CardHeader>
                  )}
                  <CardContent className={`space-y-3 ${isMobile ? "px-0" : ""}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Voertuigtype</Label>
                        <Select value={vehicleType} onValueChange={setVehicleType}>
                          <SelectTrigger className="bg-background/60 backdrop-blur-sm h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="truck">Vrachtwagen</SelectItem>
                            <SelectItem value="van">Bestelbus</SelectItem>
                            <SelectItem value="car">Personenauto</SelectItem>
                            <SelectItem value="bicycle">Fiets</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Strategie</Label>
                        <Select value={optimizationStrategy} onValueChange={setOptimizationStrategy}>
                          <SelectTrigger className="bg-background/60 backdrop-blur-sm h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="distance">Kortste afstand</SelectItem>
                            <SelectItem value="time">Snelste route</SelectItem>
                            <SelectItem value="fuel">Minste brandstof</SelectItem>
                            <SelectItem value="balanced">Gebalanceerd</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {tenantSettings && (
                      <div className="p-2 rounded-lg bg-muted/30 border border-border/20">
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <div>
                            <span className="text-muted-foreground">Servicetijd:</span>{' '}
                            <span className="font-medium">{tenantSettings.route_service_time_minutes} min</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Snelheid:</span>{' '}
                            <span className="font-medium">{tenantSettings.route_speed_percentage}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Checkbox id="timeWindows" checked={respectTimeWindows} onCheckedChange={(c) => setRespectTimeWindows(c as boolean)} />
                        <Label htmlFor="timeWindows" className="text-[10px]">Tijdvensters</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Checkbox id="avoidTolls" checked={avoidTolls} onCheckedChange={(c) => setAvoidTolls(c as boolean)} />
                        <Label htmlFor="avoidTolls" className="text-[10px]">Geen tol</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Checkbox id="avoidFerries" checked={avoidFerries} onCheckedChange={(c) => setAvoidFerries(c as boolean)} />
                        <Label htmlFor="avoidFerries" className="text-[10px]">Geen veer</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Checkbox id="avoidHighways" checked={avoidHighways} onCheckedChange={(c) => setAvoidHighways(c as boolean)} />
                        <Label htmlFor="avoidHighways" className="text-[10px]">Geen snelweg</Label>
                      </div>
                    </div>

                    {!isMobile && (
                      <div className="pt-2 space-y-2">
                        <motion.div whileTap={{ scale: 0.98 }}>
                          <Button 
                            className="w-full relative overflow-hidden h-9 text-xs" 
                            onClick={handleOptimize}
                            disabled={isOptimizing || stops.length < 2}
                          >
                            {isOptimizing ? (
                              <>
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground mr-1.5" />
                                Optimaliseren...
                              </>
                            ) : (
                              <>
                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                Route Optimaliseren
                              </>
                            )}
                            {isOptimizing && (
                              <motion.div
                                className="absolute inset-0 bg-primary/20"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                              />
                            )}
                          </Button>
                        </motion.div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleReset}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Reset
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" 
                            disabled={!optimizationResult || isSavingOrder}
                            onClick={async () => {
                              if (!optimizationResult) return;
                              try {
                                setIsSavingOrder(true);
                                const tripStops = stops.filter(s => !s.id.includes("-pickup") && !s.id.includes("-delivery"));
                                for (let i = 0; i < tripStops.length; i++) {
                                  const stop = tripStops[i];
                                  if (stop.id) {
                                    await supabase.from("route_stops").update({ stop_order: i + 1 }).eq("id", stop.id);
                                  }
                                }
                                toast({ title: "Route opgeslagen ✅", description: "Stop-volgorde is bijgewerkt" });
                              } catch (err) {
                                toast({ title: "Fout", description: "Kon route niet opslaan", variant: "destructive" });
                              } finally {
                                setIsSavingOrder(false);
                              }
                            }}
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {isSavingOrder ? "Opslaan..." : "Opslaan"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card variant="glass" className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
                  {!isMobile && (
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Snelle Acties</CardTitle>
                    </CardHeader>
                  )}
                  <CardContent className={`space-y-1.5 ${isMobile ? "px-0" : ""}`}>
                    <div className="flex gap-1.5">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openNavDialog('google')} disabled={stops.length < 2}>
                          <span className="text-sm">🗺️</span>
                        </Button>
                      </TooltipTrigger><TooltipContent>Google Maps</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={stops.length < 1} onClick={() => openNavDialog('waze')}>
                          <span className="text-sm">👻</span>
                        </Button>
                      </TooltipTrigger><TooltipContent>Waze</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={stops.length < 1} onClick={() => openNavDialog('apple')}>
                          <span className="text-sm">🍎</span>
                        </Button>
                      </TooltipTrigger><TooltipContent>Apple Kaarten</TooltipContent></Tooltip>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]" disabled={stops.length < 2}
                        onClick={async () => {
                          await exportRoutePDF(stops, optimizationResult, vehicleType, {
                            companyName: company?.name,
                            logoUrl: company?.logo_url,
                          });
                          toast({ title: "PDF geëxporteerd 📄", description: "Route PDF is gedownload" });
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]" disabled={stops.length < 2}
                        onClick={() => {
                          exportRouteGPX(stops);
                          toast({ title: "GPX geëxporteerd 🗺️", description: "Route GPX is gedownload" });
                        }}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        GPX
                      </Button>
                    </div>
                    {orderDirty && (
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]"
                          onClick={handleUndoReorder}
                          disabled={previousStopsStack.current.length === 0}
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]"
                          onClick={() => {
                            if (originalStopsOrder.current.length > 0) {
                              setStops(originalStopsOrder.current);
                              previousStopsStack.current = [];
                              setOrderDirty(false);
                              setUndoTick(t => t + 1);
                            }
                          }}
                          disabled={originalStopsOrder.current.length === 0}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                        <Button variant="default" size="sm" className="flex-1 h-8 text-[10px]" loading={isSavingOrder}
                          onClick={handleSaveOrder}
                          disabled={stops.filter(s => !s.id.includes("-pickup") && !s.id.includes("-delivery")).length === 0}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Opslaan
                        </Button>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full h-8 text-[10px]" 
                      disabled={stops.length < 1}
                      onClick={async () => {
                        const tripIds = [...new Set(stops.map(s => s.tripId).filter(Boolean))];
                        if (tripIds.length === 0) {
                          toast({ title: "Geen ritten", description: "Er zijn geen ritten om toe te wijzen", variant: "destructive" });
                          return;
                        }
                        // Get available drivers
                        const userRes = await supabase.auth.getUser();
                        const userId = userRes.data.user?.id || "";
                        const { data: uc } = await supabase.from("user_companies").select("company_id").eq("user_id", userId).eq("is_primary", true).single();
                        if (!uc?.company_id) return;
                        const { data: drivers } = await (supabase.from("drivers" as any).select("id, name").eq("tenant_id", uc.company_id).eq("is_active", true).limit(50) as any);
                        if (!drivers || drivers.length === 0) {
                          toast({ title: "Geen chauffeurs", description: "Er zijn geen beschikbare chauffeurs", variant: "destructive" });
                          return;
                        }
                        // Simple assignment: use first available or prompt
                        const driverName = prompt(`Kies chauffeur (voer naam in):\n${drivers.map((d, i) => `${i + 1}. ${d.name}`).join("\n")}`);
                        if (!driverName) return;
                        const idx = parseInt(driverName) - 1;
                        const driver = drivers[idx] || drivers.find(d => d.name.toLowerCase().includes(driverName.toLowerCase()));
                        if (!driver) {
                          toast({ title: "Chauffeur niet gevonden", variant: "destructive" });
                          return;
                        }
                        let assigned = 0;
                        for (const tid of tripIds) {
                          const { error } = await supabase.from("trips").update({ driver_id: driver.id }).eq("id", tid);
                          if (!error) assigned++;
                        }
                        toast({ title: `${assigned} rit(ten) toegewezen`, description: `Aan ${driver.name}` });
                      }}
                    >
                      <Truck className="h-3 w-3 mr-1" />
                      Toewijzen aan chauffeur
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );

            return (
              <>
                {/* Desktop sidebar */}
                <motion.div variants={itemVariants} className="hidden md:block space-y-4 order-2">
                  {settingsContent}
                </motion.div>

                {/* Mobile settings sheet */}
                <Sheet open={settingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
                  <SheetContent side="bottom" variant="premium" showDragHandle className="max-h-[80vh] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Instellingen</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      {settingsContent}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            );
          })()}
        </div>

        {/* Sticky mobile bottom bar */}
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden">
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 px-4 py-3 flex items-center gap-2 safe-area-pb">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3"
              onClick={() => setSettingsSheetOpen(true)}
            >
              <Settings2 className="h-4 w-4 mr-1.5" />
              Instellingen
            </Button>
            <Button 
              className="flex-1 h-10 relative overflow-hidden" 
              onClick={handleOptimize}
              disabled={isOptimizing || stops.length < 2}
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Optimaliseren...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Route Optimaliseren
                </>
              )}
              {isOptimizing && (
                <motion.div
                  className="absolute inset-0 bg-primary/20"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              )}
            </Button>
          </div>
        </div>

        {/* Spacer for sticky bottom bar on mobile */}
        <div className="h-20 md:hidden" />
      </motion.div>
      
      <AddStopDialog
        open={isAddStopDialogOpen}
        onOpenChange={setIsAddStopDialogOpen}
        onAddStop={handleAddStop}
      />
      <ImportStopsDialog
        open={isImportStopsOpen}
        onOpenChange={setIsImportStopsOpen}
        onImportStops={handleImportStops}
      />
      <NavigationConfirmDialog
        open={navDialogOpen}
        onOpenChange={setNavDialogOpen}
        stops={stops}
        onConfirm={(selectedStops) => handleOpenNavigation(navDialogApp, selectedStops as typeof stops)}
        navApp={navDialogApp}
      />
    </DashboardLayout>
  );
};

export default RouteOptimization;

import React, { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import type mapboxgl from "mapbox-gl";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useAllDriverLocations } from "@/hooks/useAllDriverLocations";
import { useGeofenceAlerts } from "@/hooks/useGeofenceAlerts";
import { useDriverTrail } from "@/hooks/useDriverTrail";
import { useLiveETA } from "@/hooks/useLiveETA";
import { ETADisplay } from "@/components/tracking/ETADisplay";
import { GPSQualityIndicator } from "@/components/tracking/GPSQualityIndicator";
import {
  Map,
  Truck,
  Navigation2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Zap,
  Clock,
  Activity,
  ShieldAlert,
  CheckCircle,
  X,
  ArrowRightLeft,
  History,
  Bell,
  Users,
  Radio,
  Eye,
  Satellite,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverLocation {
  driver_id: string;
  driver_name: string;
  phone: string | null;
  trip_id: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
}

type ActiveFilter = "all" | "moving" | "stopped";

// ─── Animated Number ──────────────────────────────────────────────────────────

const AnimatedNumber = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setDisplayVal(v));
    return unsub;
  }, [display]);

  return (
    <span>
      {displayVal}{suffix}
    </span>
  );
};

// ─── Fleet Map (all drivers) ──────────────────────────────────────────────────

interface FleetMapProps {
  token: string;
  locations: DriverLocation[];
  selectedDriverId: string | null;
  trailPoints: Array<{ latitude: number; longitude: number; recorded_at: string }>;
  onSelectDriver: (driverId: string) => void;
  onMapContainerRef?: (el: HTMLDivElement | null) => void;
  className?: string;
}

const FleetMap = memo(({
  token,
  locations,
  selectedDriverId,
  trailPoints,
  onSelectDriver,
  onMapContainerRef,
  className,
}: FleetMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<globalThis.Map<string, mapboxgl.Marker>>(new globalThis.Map());
  const mapboxglRef = useRef<typeof mapboxgl | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Pass ref to parent for logo hiding
  useEffect(() => {
    onMapContainerRef?.(mapContainerRef.current);
  }, [onMapContainerRef]);

  // Dynamic import + init — NO WebGL pre-check (Batch 3: let Mapbox try directly)
  useEffect(() => {
    if (!mapContainerRef.current || !token || mapRef.current) return;

    let cancelled = false;
    let loadTimeout: ReturnType<typeof setTimeout> | null = null;
    setInitError(null);

    (async () => {
      try {
        const [mapboxModule] = await Promise.all([
          import("mapbox-gl"),
          import("mapbox-gl/dist/mapbox-gl.css"),
          import("@/styles/map-styles.css"),
        ]);

        if (cancelled || !mapContainerRef.current) return;

        const mbgl = mapboxModule.default;
        mapboxglRef.current = mbgl;
        mbgl.accessToken = token;

        mapRef.current = new mbgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/dark-v11",
          center: [5.2913, 52.1326],
          zoom: 7,
          pitch: 30,
          attributionControl: false,
          logoPosition: "bottom-right",
        });

        loadTimeout = setTimeout(() => {
          if (!cancelled && !mapLoaded) {
            setInitError("Kaart laden duurde te lang. Probeer opnieuw.");
            mapRef.current?.remove();
            mapRef.current = null;
          }
        }, 15_000);

        mapRef.current.on("error", (e) => {
          console.warn("[FleetMap] runtime error:", e.error?.message || e);
        });

        mapRef.current.addControl(
          new mbgl.NavigationControl({ showCompass: false }),
          "top-right"
        );

        mapRef.current.on("load", () => {
          if (loadTimeout) clearTimeout(loadTimeout);
          if (cancelled) return;
          setMapLoaded(true);
          (mapRef.current as any).setFog?.({
            color: "rgb(10, 10, 20)",
            "high-color": "rgb(20, 20, 40)",
            "horizon-blend": 0.1,
          });

          // Batch 2: Hide Mapbox branding
          if (mapContainerRef.current) {
            const logo = mapContainerRef.current.querySelector(".mapboxgl-ctrl-logo");
            if (logo) (logo as HTMLElement).style.display = "none";
            const attrib = mapContainerRef.current.querySelector(".mapboxgl-ctrl-attrib");
            if (attrib) (attrib as HTMLElement).style.display = "none";
          }
        });
      } catch (err) {
        console.error("[FleetMap] init failed:", err);
        if (!cancelled) {
          setInitError("Kaart kon niet worden geladen. Controleer je verbinding.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [token, retryCount]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !mapboxglRef.current) return;
    const mbgl = mapboxglRef.current;

    const activeIds = new Set(locations.map((l) => l.driver_id));

    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    locations.forEach((location) => {
      const isActive =
        (location.speed != null && location.speed > 0) ||
        new Date().getTime() - new Date(location.recorded_at).getTime() < 10 * 60 * 1000;
      const isSelected = location.driver_id === selectedDriverId;

      const el = document.createElement("div");
      el.className = "gps-fleet-marker";
      el.style.cssText = `cursor: pointer; z-index: ${isSelected ? 10 : 1};`;

      const color = isSelected ? "#818cf8" : isActive ? "#22c55e" : "#6b7280";
      const ring = isSelected ? "rgba(129,140,248,0.4)" : isActive ? "rgba(34,197,94,0.3)" : "transparent";

      el.innerHTML = `
        <div style="position:relative;width:${isSelected ? "52px" : "36px"};height:${isSelected ? "52px" : "36px"};">
          ${isSelected || isActive ? `<div style="position:absolute;inset:0;background:${ring};border-radius:50%;animation:ping 1.5s ease-in-out infinite;"></div>` : ""}
          <div style="position:relative;width:100%;height:100%;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 ${isSelected ? "20px" : "10px"} ${ring};">
            <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 22 : 16}" height="${isSelected ? 22 : 16}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </div>
          ${isActive ? `<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#22c55e;border-radius:50%;border:1.5px solid #0f172a;"></div>` : ""}
        </div>
      `;

      el.addEventListener("click", () => onSelectDriver(location.driver_id));

      const popupHTML = `
        <div style="padding:12px;min-width:180px;font-family:system-ui;background:rgba(15,23,42,0.95);backdrop-filter:blur(12px);border-radius:12px;border:1px solid rgba(255,255,255,0.1);">
          <p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#f1f5f9;">${location.driver_name}</p>
          <p style="font-size:11px;color:#94a3b8;margin:0 0 8px;">${location.trip_id ? "Actieve rit" : "Geen rit"}</p>
          <div style="display:flex;gap:6px;align-items:center;">
            <span style="padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:500;background:${isActive ? "rgba(34,197,94,0.2)" : "rgba(107,114,128,0.2)"};color:${isActive ? "#22c55e" : "#94a3b8"};">
              ${isActive ? "Onderweg" : "Gestopt"}
            </span>
            ${location.speed != null ? `<span style="font-size:11px;color:#94a3b8;">${Math.round(location.speed)} km/u</span>` : ""}
          </div>
        </div>
      `;

      const existingMarker = markersRef.current.get(location.driver_id);
      if (existingMarker) {
        existingMarker.remove();
      }

      const marker = new mbgl.Marker({ element: el })
        .setLngLat([location.longitude, location.latitude])
        .setPopup(new mbgl.Popup({ offset: 30, className: "fleet-popup-glass" }).setHTML(popupHTML))
        .addTo(mapRef.current!);
      markersRef.current.set(location.driver_id, marker);
    });

    if (locations.length > 0 && !selectedDriverId) {
      const bounds = new mbgl.LngLatBounds();
      locations.forEach((loc) => bounds.extend([loc.longitude, loc.latitude]));
      if (locations.length > 1) {
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 800 });
      } else {
        mapRef.current.flyTo({ center: [locations[0].longitude, locations[0].latitude], zoom: 12, duration: 800 });
      }
    }
  }, [locations, mapLoaded, selectedDriverId, onSelectDriver]);

  // Fly to selected driver
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedDriverId) return;
    const loc = locations.find((l) => l.driver_id === selectedDriverId);
    if (loc) {
      mapRef.current.easeTo({ center: [loc.longitude, loc.latitude], zoom: 13, duration: 800 });
    }
  }, [selectedDriverId, locations, mapLoaded]);

  // Trail layer
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (mapRef.current.getLayer("driver-trail")) mapRef.current.removeLayer("driver-trail");
    if (mapRef.current.getLayer("driver-trail-bg")) mapRef.current.removeLayer("driver-trail-bg");
    if (mapRef.current.getSource("driver-trail")) mapRef.current.removeSource("driver-trail");

    if (trailPoints.length < 2) return;

    const coordinates = trailPoints.map((p) => [p.longitude, p.latitude] as [number, number]);

    mapRef.current.addSource("driver-trail", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } },
    });

    mapRef.current.addLayer({
      id: "driver-trail-bg",
      type: "line",
      source: "driver-trail",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#818cf8", "line-width": 6, "line-opacity": 0.2 },
    });

    mapRef.current.addLayer({
      id: "driver-trail",
      type: "line",
      source: "driver-trail",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#818cf8", "line-width": 3, "line-opacity": 0.85 },
    });
  }, [trailPoints, mapLoaded]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && !initError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Kaart initialiseren...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {initError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3 text-center p-4 max-w-sm">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Kaart kon niet worden geladen</p>
            <p className="text-xs text-muted-foreground/80">{initError}</p>
            <button
              onClick={() => {
                setInitError(null);
                setMapLoaded(false);
                setRetryCount((c) => c + 1);
              }}
              className="mt-1 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/10 rounded-2xl" />
    </div>
  );
});

FleetMap.displayName = "FleetMap";

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "chauffeurs" | "alerts" | "status";

const tabConfig: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "chauffeurs", label: "Eigen Chauffeurs", icon: Users },
  { id: "alerts", label: "Meldingen", icon: Bell },
  { id: "status", label: "Live Status", icon: Radio },
];

// ─── Stat Card (interactive + premium) ────────────────────────────────────────

interface StatItemProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  pulse?: boolean;
  delay?: number;
  active?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}

const StatItem = ({ label, value, suffix, icon: Icon, color, pulse, delay = 0, active, onClick, interactive = false }: StatItemProps) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, type: "spring", stiffness: 200, damping: 24 }}
    onClick={onClick}
    className={cn(
      "relative group overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 min-h-[68px]",
      "bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl",
      interactive && "cursor-pointer active:scale-[0.97]",
      active
        ? "ring-2 ring-primary/60 border-primary/40 scale-[1.03] shadow-lg shadow-primary/10 bg-gradient-to-br from-primary/10 via-card/60 to-primary/5"
        : "border-border/30 hover:scale-[1.02] hover:shadow-glow-soft hover:border-border/50",
      !interactive && "cursor-default"
    )}
    disabled={!interactive}
  >
    {/* Accent left border */}
    <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-300", color, active && "w-1.5 shadow-lg")} />
    {/* Active glow overlay */}
    {active && (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
    )}
    <div className="flex items-center justify-between relative">
      <div className="pl-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-0.5">
          <AnimatedNumber value={value} suffix={suffix} />
        </p>
      </div>
      <div className="relative">
        <Icon className={cn("h-5 w-5 transition-colors duration-300", active ? "text-primary" : "text-muted-foreground/60")} />
        {pulse && value > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
        )}
      </div>
    </div>
  </motion.button>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const GPSTracking = memo(function GPSTracking() {
  const [selectedTab, setSelectedTab] = useState<Tab>("chauffeurs");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<"1h" | "24h" | "7d">("1h");
  const [maxAgeMinutes, setMaxAgeMinutes] = useState(60);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  // Time filter -> maxAgeMinutes
  useEffect(() => {
    switch (timeFilter) {
      case "1h": setMaxAgeMinutes(60); break;
      case "24h": setMaxAgeMinutes(24 * 60); break;
      case "7d": setMaxAgeMinutes(7 * 24 * 60); break;
    }
  }, [timeFilter]);

  // Data hooks
  const { token, loading: tokenLoading, error: tokenError, refetch: refetchToken } = useMapboxToken();
  const {
    locations, loading: locationsLoading, error: locationsError,
    refetch: refetchLocations, activeCount,
  } = useAllDriverLocations({ maxAgeMinutes });
  const { alerts, alertCounts, acknowledgeAlert, dismissAlert, driversWithAlerts, refetchAlerts } = useGeofenceAlerts(locations as any);
  const { trail: trailPoints, loading: trailLoading } = useDriverTrail(selectedDriverId);

  // Live ETA
  const selectedLoc = locations.find((l) => l.driver_id === selectedDriverId);
  const etaResult = useLiveETA(
    selectedLoc ? { latitude: selectedLoc.latitude, longitude: selectedLoc.longitude } : null,
    null
  );

  // Derived stats
  const movingCount = useMemo(
    () => locations.filter((l) => l.speed != null && l.speed > 0).length,
    [locations]
  );
  const stoppedCount = useMemo(() => activeCount - movingCount, [activeCount, movingCount]);
  const avgSpeed = useMemo(() => {
    const moving = locations.filter((l) => l.speed != null && l.speed > 0);
    if (moving.length === 0) return 0;
    return Math.round(moving.reduce((s, l) => s + (l.speed ?? 0), 0) / moving.length);
  }, [locations]);

  // Batch 1: Filtered locations based on active filter
  const filteredLocations = useMemo(() => {
    if (activeFilter === "moving") return locations.filter((l) => l.speed != null && l.speed > 0);
    if (activeFilter === "stopped") return locations.filter((l) => l.speed == null || l.speed === 0);
    return locations;
  }, [locations, activeFilter]);

  // Handle filter click
  const handleFilterClick = useCallback((filter: ActiveFilter) => {
    setActiveFilter((prev) => (prev === filter ? "all" : filter));
  }, []);

  // Driver selection
  const handleSelectDriver = useCallback(
    (driverId: string) => setSelectedDriverId((prev) => (prev === driverId ? null : driverId)),
    []
  );

  const hasLocations = locations.length > 0;
  const hasFilteredLocations = filteredLocations.length > 0;

  return (
    <DashboardLayout title="GPS Tracking">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col h-full gap-3 md:gap-4"
      >
        {/* ─── Stats Bar (Batch 1: Interactive) ──────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <StatItem
            label="Actieve voertuigen"
            value={activeCount}
            icon={Truck}
            color="bg-primary"
            delay={0}
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
            interactive
          />
          <StatItem
            label="Onderweg"
            value={movingCount}
            icon={Navigation2}
            color="bg-success"
            pulse
            delay={0.05}
            active={activeFilter === "moving"}
            onClick={() => handleFilterClick("moving")}
            interactive
          />
          <StatItem
            label="Gestopt"
            value={stoppedCount}
            icon={Clock}
            color="bg-warning"
            delay={0.1}
            active={activeFilter === "stopped"}
            onClick={() => handleFilterClick("stopped")}
            interactive
          />
          <StatItem
            label="Gem. snelheid"
            value={avgSpeed}
            suffix=" km/u"
            icon={Activity}
            color="bg-info"
            delay={0.15}
          />
        </div>

        {/* ─── Map + Panel ───────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-3 md:gap-4 flex-1 min-h-0">
          {/* Map wrapper */}
          <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-card/40 backdrop-blur-sm w-full lg:w-[65%] h-[350px] md:h-[420px] lg:h-full min-h-[300px]">
            {token && (
              <FleetMap
                token={token}
                locations={filteredLocations}
                selectedDriverId={selectedDriverId}
                trailPoints={trailPoints}
                onSelectDriver={handleSelectDriver}
                className="absolute inset-0"
              />
            )}

            {/* Floating map header */}
            <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-background/70 backdrop-blur-xl px-3 py-1.5 shadow-lg">
                <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as "1h" | "24h" | "7d")}>
                  <SelectTrigger className="h-7 w-[110px] border-0 bg-transparent text-xs font-medium shadow-none focus:ring-0 px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Laatste uur</SelectItem>
                    <SelectItem value="24h">24 uur</SelectItem>
                    <SelectItem value="7d">7 dagen</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-4 w-px bg-border/40" />
                <button onClick={refetchLocations} className="p-1 rounded-md hover:bg-muted/60 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Active filter badge on map */}
              {activeFilter !== "all" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-background/70 backdrop-blur-xl px-3 py-1.5 shadow-lg"
                >
                  <span className="text-xs font-medium text-primary">
                    {activeFilter === "moving" ? "Onderweg" : "Gestopt"}: {filteredLocations.length}
                  </span>
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="p-0.5 rounded hover:bg-muted/40 transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </motion.div>
              )}

              {alertCounts.total > 0 && activeFilter === "all" && (
                <div className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-background/70 backdrop-blur-xl px-3 py-1.5 shadow-lg">
                  <Bell className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">{alertCounts.total}</span>
                </div>
              )}
            </div>

            {/* Batch 2: Premium Live HUD (replaces sync badge, covers Mapbox logo area) */}
            <div className="absolute bottom-3 left-3 z-20">
              <div className="flex items-center gap-2 rounded-xl bg-background/70 backdrop-blur-xl px-3 py-2 border border-border/20 shadow-lg">
                {/* Live pulse */}
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <span className="text-[11px] font-semibold text-success">Live</span>
                </div>
                <div className="h-3.5 w-px bg-border/30" />
                {/* Sync time */}
                <span className="text-[10px] text-muted-foreground">
                  {hasLocations
                    ? `Sync ${formatDistanceToNow(new Date(locations[0].recorded_at), { addSuffix: true, locale: nl })}`
                    : "Geen data"}
                </span>
                <div className="h-3.5 w-px bg-border/30" />
                {/* Active count mini badge */}
                <div className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-foreground">{filteredLocations.length}</span>
                </div>
              </div>
            </div>

            {/* No data overlay */}
            {!locationsLoading && !locationsError && !hasLocations && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center p-6 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/20 max-w-xs">
                  <MapPin className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground/80">Geen live locaties</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Eigen chauffeurs worden zichtbaar zodra live tracking actief is op een rit.
                  </p>
                </div>
              </div>
            )}

            {/* Filter empty state */}
            {!locationsLoading && hasLocations && !hasFilteredLocations && activeFilter !== "all" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center p-6 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/20 max-w-xs">
                  <Navigation2 className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground/80">
                    Geen {activeFilter === "moving" ? "rijdende" : "gestopte"} eigen chauffeurs
                  </p>
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="text-xs text-primary hover:underline"
                  >
                    Toon alle eigen chauffeurs
                  </button>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {locationsError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center p-6 rounded-2xl bg-background/60 backdrop-blur-xl border border-destructive/20 max-w-xs">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-muted-foreground">{locationsError}</p>
                  <Button size="sm" variant="outline" onClick={refetchLocations}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Opnieuw
                  </Button>
                </div>
              </div>
            )}

            {/* Token loading */}
            {tokenLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* ─── Right Panel (Tabs) ────────────────────────────── */}
          <div className="flex flex-col w-full lg:w-[35%] min-h-0 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center border-b border-border/20 px-1 pt-1">
              {tabConfig.map((tab) => {
                const isActive = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors rounded-t-lg",
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {tab.id === "alerts" && alertCounts.total > 0 && (
                      <span className="ml-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {alertCounts.total}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="gps-tab-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto min-h-0">
              <AnimatePresence mode="wait">
                {/* ── Eigen Chauffeurs Tab ── */}
                {selectedTab === "chauffeurs" && (
                  <motion.div
                    key="chauffeurs"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="divide-y divide-border/20"
                  >
                    {locationsLoading && (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!locationsLoading && !hasFilteredLocations && (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {activeFilter !== "all"
                             ? `Geen ${activeFilter === "moving" ? "rijdende" : "gestopte"} eigen chauffeurs`
                             : "Geen eigen chauffeurs in dit tijdsbestek"}
                        </p>
                        {activeFilter !== "all" && (
                          <button
                            onClick={() => setActiveFilter("all")}
                            className="text-xs text-primary hover:underline mt-1"
                          >
                            Toon alle
                          </button>
                        )}
                      </div>
                    )}
                    {filteredLocations.map((loc, i) => {
                      const isActive =
                        (loc.speed != null && loc.speed > 0) ||
                        Date.now() - new Date(loc.recorded_at).getTime() < 10 * 60 * 1000;
                      const isSelected = loc.driver_id === selectedDriverId;

                      return (
                        <motion.button
                          key={loc.driver_id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.25 }}
                          onClick={() => handleSelectDriver(loc.driver_id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 touch-manipulation",
                            isSelected
                              ? "bg-primary/8 border-l-2 border-l-primary"
                              : "hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent border-l-2 border-l-transparent"
                          )}
                        >
                          {/* Status dot */}
                          <div className="relative shrink-0">
                            <div className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center",
                              isActive ? "bg-success/15" : "bg-muted/40"
                            )}>
                              <Truck className={cn("h-4 w-4", isActive ? "text-success" : "text-muted-foreground")} />
                            </div>
                            {isActive && (
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card animate-pulse" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{loc.driver_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn(
                                "text-[11px] font-medium",
                                isActive ? "text-success" : "text-muted-foreground"
                              )}>
                                {isActive ? "Onderweg" : "Gestopt"}
                              </span>
                              {loc.speed != null && (
                                <span className="text-[11px] text-muted-foreground">
                                  {Math.round(loc.speed)} km/u
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time + GPS quality */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(loc.recorded_at), "HH:mm")}
                            </span>
                            <GPSQualityIndicator accuracy={loc.accuracy} lastUpdate={loc.recorded_at} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}

                {/* ── Alerts Tab ── */}
                {selectedTab === "alerts" && (
                  <motion.div
                    key="alerts"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="divide-y divide-border/20"
                  >
                    {alerts.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <CheckCircle className="h-8 w-8 text-success/40 mb-2" />
                        <p className="text-sm text-muted-foreground">Geen actieve meldingen</p>
                      </div>
                    )}
                    {alerts.map((alert: any, i: number) => (
                      <motion.div
                        key={alert.id ?? i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-muted/20 hover:to-transparent transition-colors"
                      >
                        <ShieldAlert className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          alert.severity === "critical" ? "text-destructive" : "text-warning"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{alert.title ?? alert.type}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {alert.description ?? alert.message ?? ""}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="p-1 rounded hover:bg-muted/40 transition-colors"
                            title="Bevestigen"
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                          </button>
                          <button
                            onClick={() => dismissAlert(alert.id)}
                            className="p-1 rounded hover:bg-muted/40 transition-colors"
                            title="Verwijderen"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* ── Live Status Tab ── */}
                {selectedTab === "status" && (
                  <motion.div
                    key="status"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 space-y-4"
                  >
                    {!selectedLoc ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Eye className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">Selecteer een eigen chauffeur op de kaart of in de lijst</p>
                      </div>
                    ) : (
                      <>
                        {/* Driver info card */}
                        <div className="rounded-xl border border-border/20 bg-muted/20 p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                              <Truck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{selectedLoc.driver_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {selectedLoc.trip_id ? "Actieve rit" : "Geen rit toegewezen"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 rounded-lg bg-background/40">
                              <p className="text-xs text-muted-foreground">Snelheid</p>
                              <p className="text-lg font-bold">
                                {selectedLoc.speed != null ? `${Math.round(selectedLoc.speed)}` : "-"}
                                <span className="text-xs font-normal text-muted-foreground ml-0.5">km/u</span>
                              </p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-background/40">
                              <p className="text-xs text-muted-foreground">Nauwkeurigheid</p>
                              <p className="text-lg font-bold">
                                {selectedLoc.accuracy != null ? `${Math.round(selectedLoc.accuracy)}` : "-"}
                                <span className="text-xs font-normal text-muted-foreground ml-0.5">m</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* GPS Quality */}
                        <div className="rounded-xl border border-border/20 bg-muted/20 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Satellite className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-medium text-muted-foreground">GPS Kwaliteit</p>
                          </div>
                          <GPSQualityIndicator accuracy={selectedLoc.accuracy} lastUpdate={selectedLoc.recorded_at} />
                        </div>

                        {/* ETA */}
                        {etaResult?.etaMinutes != null && (
                          <div className="rounded-xl border border-border/20 bg-muted/20 p-4">
                            <ETADisplay
                              distanceKm={etaResult.routeDistanceKm ?? null}
                              liveEtaMinutes={etaResult.etaMinutes}
                              routeDistanceKm={etaResult.routeDistanceKm}
                              isCalculating={etaResult.isCalculating}
                            />
                          </div>
                        )}

                        {/* Trail info */}
                        {trailPoints.length > 0 && (
                          <div className="rounded-xl border border-border/20 bg-muted/20 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <p className="text-xs font-medium text-muted-foreground">Route Geschiedenis</p>
                            </div>
                            <p className="text-sm">
                              <span className="font-semibold">{trailPoints.length}</span>
                              <span className="text-muted-foreground ml-1">GPS punten</span>
                            </p>
                            {trailLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mt-1" />}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
});

GPSTracking.displayName = "GPSTracking";

export default GPSTracking;

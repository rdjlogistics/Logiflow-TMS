import React, { useMemo, useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import type { OptimizableStop, OptimizedStop, OptimizationResult } from "@/hooks/useAdvancedRouteOptimization";
import { getEtaStatusColor } from "@/utils/etaColor";

interface StaticMapFallbackProps {
  stops: OptimizableStop[];
  optimizationResult?: OptimizationResult | null;
  token: string;
  className?: string;
  onStopClick?: (stopId: string) => void;
  onEscalateToLocal?: () => void;
}

function lngLatToPixel(
  lng: number, lat: number,
  bounds: { west: number; east: number; north: number; south: number },
  width: number, height: number, padding: number
) {
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const x = padding + ((lng - bounds.west) / (bounds.east - bounds.west)) * innerW;
  const latRad = (lat * Math.PI) / 180;
  const northRad = (bounds.north * Math.PI) / 180;
  const southRad = (bounds.south * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const mercNorth = Math.log(Math.tan(Math.PI / 4 + northRad / 2));
  const mercSouth = Math.log(Math.tan(Math.PI / 4 + southRad / 2));
  const y = padding + ((mercNorth - mercY) / (mercNorth - mercSouth)) * innerH;
  return { x, y };
}

const IMG_WIDTH = 800;
const IMG_HEIGHT = 400;
const PADDING_RATIO = 0.08;

const StaticMapFallback: React.FC<StaticMapFallbackProps> = ({
  stops, optimizationResult, token, className = "", onStopClick, onEscalateToLocal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ width: IMG_WIDTH, height: IMG_HEIGHT });
  const [activePopup, setActivePopup] = useState<string | null>(null);

  // Double-buffer: track displayed URL vs loading URL
  const [displayUrl, setDisplayUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const displayStops = optimizationResult?.stops || stops;
  const validStops = useMemo(() => displayStops.filter((s) => s.latitude && s.longitude), [displayStops]);

  // Track rendered image size
  useEffect(() => {
    if (!containerRef.current) return;
    const img = containerRef.current.querySelector("img");
    if (!img) return;
    const update = () => setImgSize({ width: img.clientWidth, height: img.clientHeight });
    img.addEventListener("load", update);
    const ro = new ResizeObserver(update);
    ro.observe(img);
    return () => { img.removeEventListener("load", update); ro.disconnect(); };
  }, [validStops.length]);

  // Compute static image URL and bounds
  const { url, bounds } = useMemo(() => {
    if (validStops.length === 0 || !token) return { url: "", bounds: null };

    // Use simple circle markers (no label) – numbering via HTML overlay
    const pinMarkers = validStops.map((stop) => {
      const color = stop.stopType === "pickup" ? "22c55e" : stop.stopType === "delivery" ? "ef4444" : "6b7280";
      return `pin-s+${color}(${stop.longitude},${stop.latitude})`;
    });

    // Route path
    let pathOverlay = "";
    const geomCoords = optimizationResult?.geometry?.coordinates as [number, number][] | undefined;
    const routeCoords = geomCoords?.length
      ? geomCoords
      : validStops.map((s) => [s.longitude!, s.latitude!] as [number, number]);

    if (routeCoords.length >= 2) {
      const step = Math.max(1, Math.floor(routeCoords.length / 80));
      const simplified = routeCoords.filter((_, i) => i % step === 0 || i === routeCoords.length - 1);
      const pathCoords = simplified.map(([lng, lat]) => `[${lng},${lat}]`).join(",");
      pathOverlay = `path-5+3b82f6-0.75(${encodeURIComponent(pathCoords)})`;
    }

    const overlays = [...pinMarkers, pathOverlay].filter(Boolean).join(",");

    let west = Infinity, east = -Infinity, north = -Infinity, south = Infinity;
    validStops.forEach((s) => {
      if (s.longitude! < west) west = s.longitude!;
      if (s.longitude! > east) east = s.longitude!;
      if (s.latitude! > north) north = s.latitude!;
      if (s.latitude! < south) south = s.latitude!;
    });
    const lngPad = Math.max((east - west) * 0.15, 0.01);
    const latPad = Math.max((north - south) * 0.15, 0.01);
    west -= lngPad; east += lngPad; north += latPad; south -= latPad;

    const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlays}/auto/${IMG_WIDTH}x${IMG_HEIGHT}@2x?access_token=${token}&padding=${Math.round(PADDING_RATIO * 100)}`;
    return { url: staticUrl, bounds: { west, east, north, south } };
  }, [validStops, optimizationResult, token]);

  // Double-buffer: when URL changes, preload new image before swapping
  useEffect(() => {
    if (!url) return;
    if (url === displayUrl) return;

    setIsLoading(true);
    setHasError(false);
    setActivePopup(null);

    // Clear previous timeout
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

    // Timeout: if image doesn't load in 6s, escalate
    loadTimeoutRef.current = setTimeout(() => {
      console.warn("[StaticMap] Image load timeout – escalating to local fallback");
      setIsLoading(false);
      setHasError(true);
      onEscalateToLocal?.();
    }, 6000);

    // Preload in background
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setDisplayUrl(url);
      setIsLoading(false);
      setHasError(false);
    };
    img.onerror = () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      console.warn("[StaticMap] Image load error – escalating to local fallback");
      setIsLoading(false);
      setHasError(true);
      onEscalateToLocal?.();
    };
    img.src = url;

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  if (validStops.length === 0 || (!url && !displayUrl)) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted w-full h-full min-h-[320px] ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-muted-foreground/10 flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium">Voeg stops toe om de kaart te zien</p>
      </div>
    );
  }

  // Show displayed (buffered) image – never goes blank during transitions
  const showUrl = displayUrl || url;
  const imgReady = !!displayUrl;

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-muted/30 w-full ${className}`}>
      {showUrl && (
        <img
          src={showUrl}
          alt="Route kaart"
          className="w-full h-full object-cover"
          draggable={false}
        />
      )}

      {/* Loading overlay during image transition */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Kaart wordt vernieuwd…</span>
          </div>
        </div>
      )}

      {/* HTML overlay markers with numbering (1..n) */}
      {bounds && imgReady && validStops.map((stop, index) => {
        const pos = lngLatToPixel(stop.longitude!, stop.latitude!, bounds, imgSize.width, imgSize.height, imgSize.width * PADDING_RATIO);
        const isPickup = stop.stopType === "pickup";
        const isDelivery = stop.stopType === "delivery";
        const markerColor = isPickup ? "#22c55e" : isDelivery ? "#ef4444" : "#6b7280";

        const optStop = stop as OptimizedStop;
        let etaLabel = "";
        if (optStop.arrivalTime) {
          try {
            const d = new Date(optStop.arrivalTime);
            etaLabel = !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : optStop.arrivalTime;
          } catch { etaLabel = optStop.arrivalTime; }
        }
        const etaColor = etaLabel ? getEtaStatusColor(etaLabel, stop.timeWindowEnd || null) : "";
        const isActive = activePopup === stop.id;

        return (
          <React.Fragment key={stop.id}>
            <button
              onClick={() => { setActivePopup(isActive ? null : stop.id); onStopClick?.(stop.id); }}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
              style={{ left: pos.x, top: pos.y }}
              title={stop.companyName || `Stop ${index + 1}`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white text-xs font-bold" style={{ backgroundColor: markerColor }}>
                {index + 1}
              </div>
              {etaLabel && (
                <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-semibold px-1 py-0.5 rounded bg-white/90 border border-border/50 shadow-sm whitespace-nowrap ${etaColor}`}>
                  {etaLabel}
                </div>
              )}
            </button>

            {isActive && (
              <div className="absolute z-20 bg-background rounded-lg shadow-xl border border-border p-3 min-w-[200px] max-w-[280px] -translate-x-1/2" style={{ left: pos.x, top: pos.y - 48 }}>
                <button onClick={() => setActivePopup(null)} className="absolute top-1 right-2 text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center" style={{ backgroundColor: markerColor }}>{index + 1}</span>
                  <span className="font-semibold text-sm text-foreground">{stop.companyName || `Stop ${index + 1}`}</span>
                </div>
                <p className="text-xs text-muted-foreground" style={{ color: '#374151' }}>{stop.address}{stop.city ? `, ${stop.city}` : ""}</p>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: `${markerColor}20`, color: markerColor }}>
                    {isPickup ? "Ophalen" : isDelivery ? "Afleveren" : "Tussenstop"}
                  </span>
                  {stop.priority === "urgent" && <span className="text-[10px] px-2 py-0.5 rounded bg-destructive/10 text-destructive">Urgent</span>}
                  {stop.priority === "high" && <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">Hoog</span>}
                </div>
                {etaLabel && (
                  <div className="border-t border-border mt-2 pt-2">
                    <p className="text-xs"><strong>🕐 ETA:</strong> <span className={`font-mono font-bold text-sm ${etaColor}`}>{etaLabel}</span></p>
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Compact legend overlay */}
      <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur-xl rounded-lg px-2.5 py-2 shadow-md border border-border/30">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} /><span>Ophalen</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} /><span>Afleveren</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b7280" }} /><span>Tussenstop</span></div>
        </div>
      </div>
    </div>
  );
};

export default StaticMapFallback;

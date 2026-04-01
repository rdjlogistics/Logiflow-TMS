import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { Loader2, MapPin, Eye, EyeOff } from "lucide-react";
import type { OptimizableStop, OptimizedStop, OptimizationResult } from "@/hooks/useAdvancedRouteOptimization";
import { getEtaStatusColor } from "@/utils/etaColor";
import { isWebGLAvailable } from "./webglDetect";
import StaticMapFallback from "./StaticMapFallback";
import LocalFallbackMap from "./LocalFallbackMap";

interface RouteOptimizationMapProps {
  stops: OptimizableStop[];
  optimizationResult?: OptimizationResult | null;
  className?: string;
  onStopClick?: (stopId: string) => void;
  hideLegend?: boolean;
}

/**
 * 3-layer map state machine (one-directional escalation):
 *   interactive → static → local
 * Once escalated, never goes back (prevents flapping).
 */
type MapMode = "interactive" | "static" | "local";

const RouteOptimizationMap: React.FC<RouteOptimizationMapProps> = ({
  stops,
  optimizationResult,
  className = "",
  onStopClick,
  hideLegend = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const { token, loading, error } = useMapboxToken();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapRuntimeError, setMapRuntimeError] = useState<string | null>(null);
  const [trafficVisible, setTrafficVisible] = useState(true);
  const [etaLabelsVisible, setEtaLabelsVisible] = useState(true);
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite" | "dark">("streets");
  const mapLoadedRef = useRef(false);

  // 3-layer state machine
  const [mapMode, setMapMode] = useState<MapMode>(() => isWebGLAvailable() ? "interactive" : "static");
  const mapModeRef = useRef(mapMode);

  // One-directional escalation only
  const escalate = useCallback((to: MapMode, reason: string) => {
    const order: MapMode[] = ["interactive", "static", "local"];
    const currentIdx = order.indexOf(mapModeRef.current);
    const targetIdx = order.indexOf(to);
    if (targetIdx > currentIdx) {
      console.warn(`[Map] Escalating to ${to} – reason: ${reason}`);
      mapModeRef.current = to;
      setMapMode(to);
    }
  }, []);

  const MAP_STYLES: Record<string, string> = {
    streets: "mapbox://styles/mapbox/streets-v12",
    satellite: "mapbox://styles/mapbox/satellite-streets-v12",
    dark: "mapbox://styles/mapbox/dark-v11",
  };

  const clearMarkers = useCallback(() => {
    markers.current.forEach((m) => m.remove());
    markers.current = [];
  }, []);

  // If token fetch fails or is missing, escalate appropriately
  useEffect(() => {
    if (!loading && !token && mapMode === "interactive") {
      escalate("static", "token_missing_or_fetch_failed");
    }
    if (!loading && !token && mapMode === "static") {
      escalate("local", "token_missing_for_static");
    }
  }, [loading, token, mapMode, escalate]);

  // If there's an error, escalate
  useEffect(() => {
    if (error && mapMode === "interactive") {
      escalate("static", "token_fetch_error");
    }
  }, [error, mapMode, escalate]);

  const mapInitFailed = useRef(false);

  // Pixel check helper — returns true if canvas has rendered content
  const checkCanvasRendered = useCallback((): boolean => {
    if (!map.current) return false;
    try {
      const mapCanvas = map.current.getCanvas();
      const gl = mapCanvas.getContext("webgl2") || mapCanvas.getContext("webgl");
      if (!gl) return false;
      const pixels = new Uint8Array(4);
      const cx = Math.floor(mapCanvas.width / 2);
      const cy = Math.floor(mapCanvas.height / 2);
      gl.readPixels(cx, cy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return pixels[3] > 0;
    } catch {
      return false;
    }
  }, []);

  // Initialize interactive map
  useEffect(() => {
    if (mapMode !== "interactive") return;
    if (!mapContainer.current || !token) return;
    // Allow re-init if previous attempt failed
    if (map.current && !mapInitFailed.current) return;

    // Clean up failed previous attempt
    if (map.current && mapInitFailed.current) {
      map.current.remove();
      map.current = null;
      mapInitFailed.current = false;
    }

    let cancelled = false;
    let renderTimeout: ReturnType<typeof setTimeout> | undefined;
    let pixelCheck2: ReturnType<typeof setTimeout> | undefined;
    let pixelCheck5: ReturnType<typeof setTimeout> | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;

    loadMapboxGL().then(mb => {
      if (cancelled || !mapContainer.current) return;

      setMapRuntimeError(null);
      mb.accessToken = token;
      map.current = new mb.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: [5.2913, 52.1326],
        zoom: 10,
        attributionControl: false,
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false,
        antialias: false,
      });

      const forceResize = () => map.current?.resize();

      renderTimeout = setTimeout(() => {
        if (!mapLoadedRef.current) {
          mapInitFailed.current = true;
          escalate("static", "map_load_timeout_8s");
        }
      }, 8000);

      map.current.addControl(new mb.NavigationControl(), "top-right");
      map.current.addControl(new mb.FullscreenControl(), "top-right");

      map.current.on("load", () => {
        mapLoadedRef.current = true;
        clearTimeout(renderTimeout);
        setMapLoaded(true);

        // iOS fix: force repaint + resize
        map.current?.triggerRepaint();
        requestAnimationFrame(forceResize);
        setTimeout(forceResize, 180);

        map.current?.addSource('mapbox-traffic', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-traffic-v1',
        });
        map.current?.addLayer({
          id: 'traffic-layer',
          type: 'line',
          source: 'mapbox-traffic',
          'source-layer': 'traffic',
          paint: {
            'line-color': ['match', ['get', 'congestion'], 'low', '#4ade80', 'moderate', '#facc15', 'heavy', '#f97316', 'severe', '#ef4444', '#888888'],
            'line-width': 2,
            'line-opacity': 0.7,
          },
          minzoom: 6,
        });

        // Dual pixel check: 2s and 5s
        pixelCheck2 = setTimeout(() => {
          if (cancelled || !map.current) return;
          if (!checkCanvasRendered()) {
            // Not rendered yet — force repaint and wait for second check
            map.current?.triggerRepaint();
            map.current?.resize();
          }
        }, 2000);

        pixelCheck5 = setTimeout(() => {
          if (cancelled || !map.current) return;
          if (!checkCanvasRendered()) {
            mapInitFailed.current = true;
            escalate("static", "canvas_blank_post_render_5s");
          }
        }, 5000);
      });

      // idle event — all tiles loaded
      map.current.on("idle", () => {
        if (cancelled || !map.current) return;
        map.current.resize();
        map.current.triggerRepaint();
      });

      map.current.on("error", (event) => {
        const errMsg = event?.error?.message || "Map rendering fout";
        if (/webgl|context|canvas|gpu|render/i.test(errMsg)) {
          mapInitFailed.current = true;
          escalate("static", "webgl_error: " + errMsg);
        } else {
          setMapRuntimeError(errMsg);
        }
      });

      const canvas = mapContainer.current!.querySelector("canvas");
      const handleContextLost = () => {
        mapInitFailed.current = true;
        escalate("static", "webgl_context_lost");
      };
      canvas?.addEventListener("webglcontextlost", handleContextLost);

      resizeObserver = new ResizeObserver(() => forceResize());
      resizeObserver.observe(mapContainer.current!);
      intersectionObserver = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) forceResize();
      }, { threshold: 0.1 });
      intersectionObserver.observe(mapContainer.current!);
      window.addEventListener("resize", forceResize);
      requestAnimationFrame(forceResize);
    });

    return () => {
      cancelled = true;
      if (renderTimeout) clearTimeout(renderTimeout);
      if (pixelCheck2) clearTimeout(pixelCheck2);
      if (pixelCheck5) clearTimeout(pixelCheck5);
      window.removeEventListener("resize", () => map.current?.resize());
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      clearMarkers();
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [token, clearMarkers, mapMode, checkCanvasRendered]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch map style
  useEffect(() => {
    if (!map.current || !mapLoaded || mapMode !== "interactive") return;
    map.current.setStyle(MAP_STYLES[mapStyle]);
    map.current.once("style.load", () => {
      if (!map.current) return;
      try {
        map.current.addSource('mapbox-traffic', { type: 'vector', url: 'mapbox://mapbox.mapbox-traffic-v1' });
        map.current.addLayer({
          id: 'traffic-layer', type: 'line', source: 'mapbox-traffic', 'source-layer': 'traffic',
          paint: { 'line-color': ['match', ['get', 'congestion'], 'low', '#4ade80', 'moderate', '#facc15', 'heavy', '#f97316', 'severe', '#ef4444', '#888888'], 'line-width': 2, 'line-opacity': 0.7 },
          minzoom: 6, layout: { visibility: trafficVisible ? 'visible' : 'none' },
        });
      } catch { /* may already exist */ }
    });
  }, [mapStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize
  useEffect(() => {
    if (!map.current || !mapLoaded || mapMode !== "interactive") return;
    const forceResize = () => map.current?.resize();
    requestAnimationFrame(forceResize);
    const timeout = setTimeout(forceResize, 220);
    return () => clearTimeout(timeout);
  }, [mapLoaded, className, stops.length, optimizationResult?.geometry, mapMode]);

  // Update markers
  useEffect(() => {
    if (!map.current || !mapLoaded || mapMode !== "interactive") return;
    clearMarkers();

    const displayStops = optimizationResult?.stops || stops;
    const validStops = displayStops.filter((s) => s.latitude && s.longitude);
    if (validStops.length === 0) return;

    loadMapboxGL().then(mb => {
      validStops.forEach((stop, index) => {
        if (!stop.latitude || !stop.longitude) return;
        const el = document.createElement("div");
        el.className = "stop-marker cursor-pointer";
        const isPickup = stop.stopType === "pickup";
        const isDelivery = stop.stopType === "delivery";
        const markerColor = isPickup ? "#22c55e" : isDelivery ? "#ef4444" : "#6b7280";
        const priorityRing = stop.priority === "urgent" ? "ring-2 ring-red-500 ring-offset-2" : stop.priority === "high" ? "ring-2 ring-yellow-500 ring-offset-1" : "";

        const optStop = stop as OptimizedStop;
        let etaLabel = "";
        let etaColor = "";
        if (optStop.arrivalTime) {
          try {
            const d = new Date(optStop.arrivalTime);
            etaLabel = !isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : optStop.arrivalTime;
          } catch { etaLabel = optStop.arrivalTime; }
          etaColor = getEtaStatusColor(etaLabel, stop.timeWindowEnd || null);
        }

        const typeLabel = isPickup ? "Ophalen" : isDelivery ? "Afleveren" : "Tussenstop";
        const priorityBadge = stop.priority === "urgent" ? '<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:#fef2f2;color:#dc2626;">Urgent</span>' : stop.priority === "high" ? '<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:#fefce8;color:#ca8a04;">Hoog</span>' : "";

        el.innerHTML = `<div class="relative group"><div class="relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${priorityRing}" style="background-color: ${markerColor}"><span class="text-sm font-bold text-white">${index + 1}</span></div>${etaLabel && etaLabelsVisible ? `<div class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shadow-sm bg-white/90 backdrop-blur-sm border border-gray-200 whitespace-nowrap ${etaColor}">${etaLabel}</div>` : ""}</div>`;
        el.addEventListener("click", () => onStopClick?.(stop.id));

        const twStart = stop.timeWindowStart || "";
        const twEnd = stop.timeWindowEnd || "";
        const timeWindowHtml = (twStart || twEnd) ? `<p style="font-size:11px;color:#6b7280;">Tijdvenster: ${twStart}${twStart && twEnd ? " – " : ""}${twEnd}</p>` : "";
        const serviceDurHtml = stop.serviceDuration ? `<p style="font-size:11px;color:#6b7280;">Stoptijd: ${stop.serviceDuration} min</p>` : "";
        const etaInlineColor = etaColor === "text-red-500" ? "color:#ef4444;" : etaColor === "text-orange-500" ? "color:#f97316;" : etaColor === "text-green-600" ? "color:#16a34a;" : "";
        const etaHtml = etaLabel ? `<p style="font-size:13px;margin-top:4px;"><strong>🕐 ETA:</strong> <span style="font-family:monospace;font-weight:700;font-size:14px;${etaInlineColor}">${etaLabel}</span></p>` : "";

        const popup = new mb.Popup({ offset: 25, closeButton: true, maxWidth: "280px" }).setHTML(`
          <div style="padding:12px;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="width:26px;height:26px;border-radius:50%;background:${markerColor};color:white;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">${index + 1}</span>
              <span style="font-weight:600;font-size:14px;color:#111827;">${stop.companyName || "Stop " + (index + 1)}</span>
            </div>
            <p style="font-size:12px;color:#374151;margin:2px 0;">${stop.address}${stop.city ? ", " + stop.city : ""}</p>
            <div style="display:flex;gap:4px;margin-top:8px;">
              <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${markerColor}20;color:${markerColor};font-weight:500;">${typeLabel}</span>
              ${priorityBadge}
            </div>
            ${(etaHtml || timeWindowHtml || serviceDurHtml) ? `<div style="border-top:1px solid #e5e7eb;margin-top:8px;padding-top:8px;">${etaHtml}${timeWindowHtml}${serviceDurHtml}</div>` : ""}
          </div>
        `);

        const marker = new mb.Marker({ element: el }).setLngLat([stop.longitude!, stop.latitude!]).setPopup(popup).addTo(map.current!);
        markers.current.push(marker);
      });

      if (validStops.length > 1) {
        const bounds = new mb.LngLatBounds();
        validStops.forEach((s) => { if (s.latitude && s.longitude) bounds.extend([s.longitude, s.latitude]); });
        map.current!.fitBounds(bounds, { padding: 60 });
      }
    });
  }, [stops, optimizationResult, mapLoaded, clearMarkers, onStopClick, mapMode, etaLabelsVisible]);

  // Draw route line
  useEffect(() => {
    if (!map.current || !mapLoaded || mapMode !== "interactive") return;
    if (map.current.getLayer("optimized-route")) map.current.removeLayer("optimized-route");
    if (map.current.getSource("optimized-route")) map.current.removeSource("optimized-route");

    if (optimizationResult?.geometry) {
      map.current.addLayer({
        id: "optimized-route", type: "line",
        source: { type: "geojson", data: { type: "Feature", properties: {}, geometry: optimizationResult.geometry } },
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2563eb", "line-width": 4, "line-opacity": 0.85 },
      });
    } else if (stops.length >= 2 && token) {
      const validStops = stops.filter((s) => s.latitude && s.longitude);
      if (validStops.length >= 2) {
        const coordinates = validStops.map((s) => `${s.longitude},${s.latitude}`).join(";");
        fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}?geometries=geojson&overview=full&access_token=${token}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.routes?.[0]?.geometry && map.current) {
              if (map.current.getLayer("optimized-route")) return;
              map.current.addLayer({
                id: "optimized-route", type: "line",
                source: { type: "geojson", data: { type: "Feature", properties: {}, geometry: data.routes[0].geometry } },
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#2563eb", "line-width": 4, "line-opacity": 0.85 },
              });
            }
          }).catch(console.error);
      }
    }
  }, [stops, optimizationResult, mapLoaded, token, mapMode]);


  // ===== RENDER BASED ON MAP MODE =====

  // Layer 3: Local fallback (no external dependencies)
  if (mapMode === "local") {
    return <LocalFallbackMap stops={stops} optimizationResult={optimizationResult} className={className} onStopClick={onStopClick} />;
  }

  // Layer 2: Static API fallback
  if (mapMode === "static") {
    if (token) {
      return (
        <StaticMapFallback
          stops={stops}
          optimizationResult={optimizationResult}
          token={token}
          className={className}
          onStopClick={onStopClick}
          onEscalateToLocal={() => escalate("local", "static_img_failed")}
        />
      );
    }
    // No token available – go local immediately
    return <LocalFallbackMap stops={stops} optimizationResult={optimizationResult} className={className} onStopClick={onStopClick} />;
  }

  // Layer 1: Interactive map – loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted w-full h-full ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Kaart laden...</p>
        </div>
      </div>
    );
  }

  // Runtime error with no fallback token
  if ((error || mapRuntimeError) && !token) {
    return <LocalFallbackMap stops={stops} optimizationResult={optimizationResult} className={className} onStopClick={onStopClick} />;
  }

  const validStops = stops.filter((s) => s.latitude && s.longitude);
  const showLegend = validStops.length > 0;

  const toggleTraffic = () => {
    if (!map.current) return;
    const newVisible = !trafficVisible;
    setTrafficVisible(newVisible);
    if (map.current.getLayer('traffic-layer')) {
      map.current.setLayoutProperty('traffic-layer', 'visibility', newVisible ? 'visible' : 'none');
    }
  };

  return (
    <div className={`relative overflow-hidden bg-muted/30 w-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {mapLoaded && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
          <button
            onClick={toggleTraffic}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-md text-xs font-medium hover:bg-background transition-colors"
            title={trafficVisible ? 'Verkeer verbergen' : 'Verkeer tonen'}
          >
            {trafficVisible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className={trafficVisible ? 'text-primary' : 'text-muted-foreground'}>Verkeer</span>
          </button>
          {(optimizationResult?.stops || stops).some((s: any) => s.arrivalTime) && (
            <button
              onClick={() => setEtaLabelsVisible(!etaLabelsVisible)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-md text-xs font-medium hover:bg-background transition-colors"
              title={etaLabelsVisible ? 'ETA-labels verbergen' : 'ETA-labels tonen'}
            >
              {etaLabelsVisible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className={etaLabelsVisible ? 'text-primary' : 'text-muted-foreground'}>ETA</span>
            </button>
          )}
        </div>
      )}


      {/* Legend overlaying bottom of map - hidden on mobile when hideLegend */}
      {showLegend && !hideLegend && (
        <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur-xl rounded-lg px-2.5 py-2 shadow-md border border-border/30">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e" }} /><span>Ophalen</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} /><span>Afleveren</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b7280" }} /><span>Tussenstop</span></div>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span>Verkeer</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizationMap;

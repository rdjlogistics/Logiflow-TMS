import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import type { MarkerStyle } from "./MapThemeSelector";

export type FuelStationsMapboxStation = {
  id: string;
  longitude: number;
  latitude: number;
  brand: string;
  name: string;
  prices: Record<string, number | null>;
};

export type FuelStationsMapboxProps = {
  token: string;
  mapStyle: string;
  center: { lng: number; lat: number };
  stations: FuelStationsMapboxStation[];
  selectedFuelType: string;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  onMapReady?: () => void;
  locateSignal?: number;
  markerStyle?: MarkerStyle;
  /**
   * When provided, the map will use this location for the user marker.
   * This keeps the UI in sync with the rest of the app on mobile.
   */
  userLocation?: { lng: number; lat: number } | null;
  className?: string;
};

function formatPrice(price: number) {
  const fixed = price.toFixed(3).replace(".", ",");
  const [main, dec] = fixed.split(",");
  const firstTwo = dec.slice(0, 2);
  const third = dec.slice(2, 3);
  return { main: `€${main},${firstTwo}`, sup: third };
}

// Premium Habsburg easing - buttery smooth
function smoothEasing(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Get price color based on relative pricing
function getPriceColor(price: number, allPrices: number[]): string {
  if (allPrices.length === 0) return '#16a34a'; // Default green
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min;
  if (range === 0) return '#16a34a';
  
  const ratio = (price - min) / range;
  // Green (cheap) -> Yellow (mid) -> Orange (expensive)
  if (ratio <= 0.33) return '#16a34a'; // Green - cheap
  if (ratio <= 0.66) return '#eab308'; // Yellow - medium
  return '#f97316'; // Orange - expensive
}

// Get SVG HTML for custom user marker based on style
// IMPORTANT: All markers use the same wrapper size so anchor: "center" works correctly at any zoom level.
// Uses a fixed blue color to avoid CSS variable issues in dynamically created elements.
function getMarkerHTML(style: MarkerStyle): string {
  const size = 40; // Fixed container size for consistent anchoring
  // Use a reliable blue color that matches typical primary colors
  const primaryColor = '#3b82f6';
  const primaryColorLight = 'rgba(59, 130, 246, 0.25)';
  
  const wrapperStyle = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${size}px;
    height: ${size}px;
    pointer-events: none;
  `;

  switch (style) {
    case 'arrow':
      return `<div style="${wrapperStyle}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${primaryColor}" stroke="white" stroke-width="2" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 2L19 21L12 17L5 21L12 2Z"/>
        </svg>
      </div>`;
    case 'car':
      return `<div style="${wrapperStyle}">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="${primaryColor}" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>`;
    case 'truck':
      return `<div style="${wrapperStyle}">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="${primaryColor}" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M10 17h4V5H2v12h3"/>
          <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/>
          <circle cx="7.5" cy="17.5" r="2.5"/>
          <circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
      </div>`;
    case 'dot':
    default:
      return `<div style="${wrapperStyle}">
        <div style="
          width: 16px;
          height: 16px;
          background: ${primaryColor};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3), 0 0 0 3px ${primaryColorLight};
        "></div>
      </div>`;
  }
}

type MapStatus = "loading" | "ready" | "error";

// Zoom thresholds for marker visibility - optimized for clarity
const ZOOM_SHOW_PRICES = 9;  // Show price markers above this zoom level (earlier for better UX)
const ZOOM_SHOW_DOTS = 5;    // Show dot markers above this zoom level

export function FuelStationsMapbox({
  token,
  mapStyle,
  center,
  stations,
  selectedFuelType,
  selectedStationId,
  onSelectStation,
  onMapReady,
  locateSignal,
  markerStyle = 'dot',
  userLocation: externalUserLocation,
  className,
}: FuelStationsMapboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const roRef = useRef<ResizeObserver | null>(null);
  const lastStyleRef = useRef<string | null>(null);
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const flyingRef = useRef<boolean>(false);
  const pendingFlyRef = useRef<{ lng: number; lat: number; zoom?: number } | null>(null);
  const initialCenterSetRef = useRef<boolean>(false);
  const lastZoomLevelRef = useRef<'dots' | 'prices' | 'hidden'>('prices');
  const zoomDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keep one single source of truth for the user marker position.
  const controlledLocationRef = useRef<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(11);
  const [stableZoomLevel, setStableZoomLevel] = useState<'dots' | 'prices' | 'hidden'>('prices');

  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stationsById = useMemo(() => {
    const map = new Map<string, FuelStationsMapboxStation>();
    stations.forEach((s) => map.set(s.id, s));
    return map;
  }, [stations]);

  // Smooth fly to location with queue system to prevent conflicts
  const smoothFlyTo = useCallback((lng: number, lat: number, zoom?: number, duration = 1200) => {
    const map = mapRef.current;
    if (!map) return;

    // If already flying, queue this request
    if (flyingRef.current) {
      pendingFlyRef.current = { lng, lat, zoom };
      return;
    }

    flyingRef.current = true;

    map.flyTo({
      center: [lng, lat],
      zoom: zoom ?? Math.max(map.getZoom(), 12),
      duration,
      easing: smoothEasing,
      essential: true, // This animation is considered essential for accessibility
    });

    // Reset flying state after animation completes
    const handleMoveEnd = () => {
      flyingRef.current = false;
      map.off("moveend", handleMoveEnd);

      // Process pending fly request if any
      if (pendingFlyRef.current) {
        const pending = pendingFlyRef.current;
        pendingFlyRef.current = null;
        smoothFlyTo(pending.lng, pending.lat, pending.zoom);
      }
    };

    map.once("moveend", handleMoveEnd);
  }, []);

  // Keep controlled/uncontrolled user location in sync
  useEffect(() => {
    controlledLocationRef.current = externalUserLocation != null;
    if (externalUserLocation) {
      setUserLocation(externalUserLocation);
    }
  }, [externalUserLocation]);

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;
    if (!token) {
      setMapStatus("error");
      setErrorMessage("Mapbox token ontbreekt");
      return;
    }
    if (mapRef.current) return;

    let cancelled = false;
    setMapStatus("loading");

    loadMapboxGL().then(mb => {
      if (cancelled || !containerRef.current) return;

      try {
        mb.accessToken = token;

        const map = new mb.Map({
          container: containerRef.current,
          style: mapStyle,
          center: [center.lng, center.lat],
          zoom: 11,
          attributionControl: true,
          failIfMajorPerformanceCaveat: false,
          antialias: true,
          fadeDuration: 200,
          crossSourceCollisions: false,
        });

        lastStyleRef.current = mapStyle;

        const nav = new mb.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        });
        map.addControl(nav, "top-right");

        geolocateRef.current = new mb.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: false,
          showAccuracyCircle: false,
          showUserLocation: false,
          fitBoundsOptions: { maxZoom: 14, duration: 1500 },
        });
        map.addControl(geolocateRef.current, "top-right");

        geolocateRef.current.on('geolocate', (e: any) => {
          if (controlledLocationRef.current) return;
          const { longitude, latitude } = e.coords;
          setUserLocation({ lng: longitude, lat: latitude });
        });

        map.scrollZoom.setWheelZoomRate(1 / 200);
        map.scrollZoom.setZoomRate(1 / 100);

        map.doubleClickZoom.disable();
        map.on("dblclick", (e) => {
          e.preventDefault();
          map.flyTo({
            center: e.lngLat,
            zoom: map.getZoom() + 1.5,
            duration: 600,
            easing: smoothEasing,
          });
        });

        map.on("load", () => {
          setMapStatus("ready");
          onMapReady?.();
          requestAnimationFrame(() => map.resize());

          if (import.meta.env.DEV) {
            const canvas = map.getCanvas();
            console.log("[FuelStationsMapbox] map loaded", {
              canvas: { w: canvas?.width, h: canvas?.height },
              container: {
                w: containerRef.current?.clientWidth,
                h: containerRef.current?.clientHeight,
              },
            });
          }
        });

        map.on("zoom", () => {
          const zoom = map.getZoom();
          setCurrentZoom(zoom);
          
          if (zoomDebounceRef.current) {
            clearTimeout(zoomDebounceRef.current);
          }
          
          zoomDebounceRef.current = setTimeout(() => {
            const newLevel: 'dots' | 'prices' | 'hidden' = 
              zoom < ZOOM_SHOW_DOTS ? 'hidden' : 
              zoom < ZOOM_SHOW_PRICES ? 'dots' : 'prices';
            
            if (newLevel !== lastZoomLevelRef.current) {
              lastZoomLevelRef.current = newLevel;
              setStableZoomLevel(newLevel);
            }
          }, 150);
        });

        map.on("error", (e) => {
          console.error("Mapbox error:", e);
          setMapStatus("error");
          setErrorMessage(e.error?.message || "Kaart kon niet geladen worden");
        });

        mapRef.current = map;

        roRef.current = new ResizeObserver(() => {
          requestAnimationFrame(() => map.resize());
        });
        roRef.current.observe(containerRef.current!);
      } catch (err: any) {
        console.error("Mapbox init error:", err);
        setMapStatus("error");
        setErrorMessage(err.message || "Initialisatie mislukt");
      }
    });

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      geolocateRef.current = null;
      flyingRef.current = false;
      pendingFlyRef.current = null;
      
      if (zoomDebounceRef.current) {
        clearTimeout(zoomDebounceRef.current);
        zoomDebounceRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      lastStyleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Update style safely
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lastStyleRef.current === mapStyle) return;

    const applyStyle = () => {
      if (!map.isStyleLoaded()) return;
      map.setStyle(mapStyle);
      lastStyleRef.current = mapStyle;
    };

    if (map.isStyleLoaded()) {
      applyStyle();
      return;
    }

    map.once("style.load", applyStyle);
    return () => {
      map.off("style.load", applyStyle);
    };
  }, [mapStyle]);

  // Initial center - only set once on first load
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mapStatus !== "ready") return;
    if (initialCenterSetRef.current) return;

    // Only fly to center on initial load, not on every center change
    initialCenterSetRef.current = true;
    
    map.flyTo({
      center: [center.lng, center.lat],
      zoom: 12,
      duration: 1500,
      easing: smoothEasing,
    });
  }, [center.lng, center.lat, mapStatus]);

  // Markers with zoom-dependent rendering (ANWB style)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mapStatus !== "ready") return;

    // Use stable zoom level to prevent flickering during zoom animations
    const showPrices = stableZoomLevel === 'prices';
    const showDots = stableZoomLevel === 'dots';
    const hideMarkers = stableZoomLevel === 'hidden';

    // Determine how many markers to show based on zoom
    const maxMarkers = hideMarkers ? 0 : showPrices ? 100 : 300;
    const visible = stations.slice(0, maxMarkers);
    const nextIds = new Set(visible.map((s) => s.id));

    // Calculate price ranges for color coding
    const allPrices = visible
      .map(s => s.prices[selectedFuelType])
      .filter((p): p is number => p != null);

    // Only rebuild markers when zoom level category actually changes
    // This prevents jitter during smooth zooming

    // Remove old markers not in visible set
    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Don't add markers if we should hide them
    if (hideMarkers) return;

    // Add/update markers
    for (const station of visible) {
      const price = station.prices[selectedFuelType];
      if (price == null) continue;

      const existing = markersRef.current.get(station.id);
      const isSelected = selectedStationId === station.id;
      
      // Calculate price tier for coloring
      const priceColor = getPriceColor(price, allPrices);
      const priceTier = allPrices.length > 0 
        ? ((price - Math.min(...allPrices)) / (Math.max(...allPrices) - Math.min(...allPrices) || 1))
        : 0;
      const colorClass = priceTier <= 0.33 ? 'cheap' : priceTier <= 0.66 ? 'medium' : 'expensive';

      if (!existing) {
        const el = document.createElement("button");
        el.type = "button";
        el.dataset.selected = isSelected ? "true" : "false";

        if (showDots) {
          // Simple dot marker for zoomed out view with price coloring
          el.className = "fuel-dot-marker";
          el.innerHTML = `<span class="fuel-dot-marker__dot fuel-dot-marker__dot--${colorClass}"></span>`;
        } else {
          // Full ANWB-style price marker for zoomed in view
          el.className = "fuel-price-marker";
          const formatted = formatPrice(price);
          el.innerHTML = `
            <span class="fuel-price-marker__pill fuel-price-marker__pill--${colorClass}">
              <span class="fuel-price-marker__price">${formatted.main}<sup>${formatted.sup}</sup></span>
            </span>
            <span class="fuel-price-marker__icon-row" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33a2.5 2.5 0 0 0 2.5 2.5c.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14a2 2 0 0 0-2-2h-1V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16h10v-7.5h1.5v5a2.5 2.5 0 0 0 5 0V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5z"/>
              </svg>
            </span>
          `;
        }

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectStation(station.id);
          smoothFlyTo(station.longitude, station.latitude, 13, 800);
        });

        loadMapboxGL().then(mb => {
          const marker = new mb.Marker({ 
            element: el, 
            anchor: showDots ? "center" : "bottom",
            offset: [0, 0],
          })
            .setLngLat([station.longitude, station.latitude])
            .addTo(map);

        });
      } else {
        // Update existing marker
        const el = existing.getElement() as HTMLButtonElement;
        el.dataset.selected = isSelected ? "true" : "false";

        if (!showDots) {
          const formatted = formatPrice(price);
          const pillEl = el.querySelector(".fuel-price-marker__pill");
          const priceEl = el.querySelector(".fuel-price-marker__price");
          if (priceEl) {
            priceEl.innerHTML = `${formatted.main}<sup>${formatted.sup}</sup>`;
          }
          if (pillEl) {
            pillEl.className = `fuel-price-marker__pill fuel-price-marker__pill--${colorClass}`;
          }
        }
      }
    }
  }, [stationsById, stations, selectedFuelType, selectedStationId, onSelectStation, mapStatus, smoothFlyTo, stableZoomLevel]);

  // List selection -> fly to station
  useEffect(() => {
    if (!selectedStationId) return;
    if (mapStatus !== "ready") return;

    const station = stationsById.get(selectedStationId);
    if (!station) return;

    smoothFlyTo(station.longitude, station.latitude, 14, 1200);
  }, [selectedStationId, stationsById, mapStatus, smoothFlyTo]);

  // External locate trigger
  useEffect(() => {
    if (!locateSignal) return;
    geolocateRef.current?.trigger();
  }, [locateSignal]);

  // Selected marker z-index management
  useEffect(() => {
    if (!selectedStationId) return;
    const marker = markersRef.current.get(selectedStationId);
    if (!marker) return;

    const el = marker.getElement();
    el.style.zIndex = "100";

    // Reset after animation
    const timeout = setTimeout(() => {
      el.style.zIndex = "";
    }, 1500);

    return () => clearTimeout(timeout);
  }, [selectedStationId]);

  // Custom user location marker based on markerStyle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation || typeof userLocation.lng !== 'number' || typeof userLocation.lat !== 'number') return;
    if (mapStatus !== 'ready') return;

    try {
      // Create or update the custom marker
      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.className = `custom-user-marker custom-user-marker--${markerStyle}`;
        el.style.width = "40px";
        el.style.height = "40px";
        el.innerHTML = getMarkerHTML(markerStyle);
        
        loadMapboxGL().then(mb => {
          userMarkerRef.current = new mb.Marker({
            element: el,
            anchor: "center",
            pitchAlignment: "map",
            rotationAlignment: "map",
          })
            .setLngLat([userLocation.lng, userLocation.lat])
            .addTo(map);
        });
      } else {
        userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
        
        // Only update HTML if style changed
        const el = userMarkerRef.current.getElement();
        if (el && !el.className.includes(`custom-user-marker--${markerStyle}`)) {
          el.innerHTML = getMarkerHTML(markerStyle);
          el.className = `custom-user-marker custom-user-marker--${markerStyle}`;
        }
      }
    } catch (err) {
      console.error('[FuelStationsMapbox] Error creating user marker:', err);
    }
  }, [userLocation, markerStyle, mapStatus]);

  // Cleanup custom marker on unmount
  useEffect(() => {
    return () => {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    };
  }, []);
  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden",
        className
      )}
      style={{ minHeight: 0 }}
    >
      {/* Map container - fills entire space */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'pan-x pan-y' }}
      />

      {/* Loading/Error overlay */}
      {(mapStatus === "loading" || mapStatus === "error") && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="text-center space-y-3">
            {mapStatus === "loading" ? (
              <>
                <div className="relative mx-auto w-14 h-14">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="relative flex items-center justify-center w-full h-full bg-primary/10 rounded-full">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Kaart laden...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-sm">Kaart niet beschikbaar</p>
                  {errorMessage && (
                    <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
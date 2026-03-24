import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import type mapboxgl from "mapbox-gl";

type MapboxGL = typeof mapboxgl;
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BaseMapRef {
  map: mapboxgl.Map | null;
  flyTo: (center: [number, number], zoom?: number) => void;
  fitBounds: (bounds: mapboxgl.LngLatBoundsLike, options?: mapboxgl.FitBoundsOptions) => void;
  addMarker: (lngLat: [number, number], element: HTMLElement) => mapboxgl.Marker;
  clearMarkers: () => void;
  triggerGeolocate: () => void;
}

interface BaseMapProps {
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  style?: 'dark' | 'light' | 'streets' | 'satellite';
  showNavigation?: boolean;
  showGeolocate?: boolean;
  showTraffic?: boolean;
  className?: string;
  onLoad?: (map: mapboxgl.Map) => void;
  onLocationUpdate?: (coords: { lat: number; lng: number }) => void;
  children?: React.ReactNode;
}

const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

export const BaseMap = forwardRef<BaseMapRef, BaseMapProps>(({
  center = [5.2913, 52.1326],
  zoom = 10,
  pitch = 0,
  style = 'streets',
  showNavigation = true,
  showGeolocate = true,
  showTraffic = false,
  className,
  onLoad,
  onLocationUpdate,
  children,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const geolocate = useRef<mapboxgl.GeolocateControl | null>(null);
  const mapboxglRef = useRef<MapboxGL | null>(null);
  
  const { token, loading: tokenLoading, error: tokenError } = useMapboxToken();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trafficVisible, setTrafficVisible] = useState(showTraffic);
  // libLoading removed — loading overlay now shows until mapLoaded is true
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Expose map methods via ref
  useImperativeHandle(ref, () => ({
    map: map.current,
    flyTo: (newCenter: [number, number], newZoom?: number) => {
      map.current?.flyTo({ 
        center: newCenter, 
        zoom: newZoom ?? map.current.getZoom(),
        duration: 800 
      });
    },
    fitBounds: (bounds: mapboxgl.LngLatBoundsLike, options?: mapboxgl.FitBoundsOptions) => {
      map.current?.fitBounds(bounds, { padding: 50, maxZoom: 14, ...options });
    },
    addMarker: (lngLat: [number, number], element: HTMLElement) => {
      const mapboxgl = mapboxglRef.current!;
      const marker = new mapboxgl.Marker({ element })
        .setLngLat(lngLat)
        .addTo(map.current!);
      markers.current.push(marker);
      return marker;
    },
    clearMarkers: () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
    },
    triggerGeolocate: () => {
      geolocate.current?.trigger();
    },
  }), []);

  // Dynamically load mapbox-gl and initialize map
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

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
        
        if (cancelled || !mapContainer.current) return;

        const mapboxgl = mapboxModule.default;
        mapboxglRef.current = mapboxgl;
        mapboxgl.accessToken = token;
        // lib loaded

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: MAP_STYLES[style],
          center,
          zoom,
          pitch,
          attributionControl: false,
        });

        // Timeout: if "load" never fires within 15s, show error
        loadTimeout = setTimeout(() => {
          if (!cancelled && !mapLoaded) {
            setInitError("Kaart laden duurde te lang. Probeer opnieuw.");
            map.current?.remove();
            map.current = null;
          }
        }, 15_000);

        // Runtime error handler
        map.current.on("error", (e) => {
          console.warn("[BaseMap] runtime error:", e.error?.message || e);
        });

        if (showNavigation) {
          map.current.addControl(
            new mapboxgl.NavigationControl({ showCompass: false }),
            "top-right"
          );
        }

        if (showGeolocate) {
          geolocate.current = new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
            showAccuracyCircle: true,
            fitBoundsOptions: { maxZoom: 14 },
          });
          map.current.addControl(geolocate.current, "top-right");

          geolocate.current.on('geolocate', (e: any) => {
            onLocationUpdate?.({
              lat: e.coords.latitude,
              lng: e.coords.longitude,
            });
          });
        }

        map.current.on("load", () => {
          if (loadTimeout) clearTimeout(loadTimeout);
          setMapLoaded(true);
          
          
          if (showTraffic) {
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
                'line-color': [
                  'match', ['get', 'congestion'],
                  'low', '#4ade80',
                  'moderate', '#facc15',
                  'heavy', '#f97316',
                  'severe', '#ef4444',
                  '#888888'
                ],
                'line-width': 2,
                'line-opacity': 0.7,
              },
              minzoom: 6,
            });
          }

          onLoad?.(map.current!);
          
          if (showGeolocate) {
            geolocate.current?.trigger();
          }
        });
      } catch (err) {
        console.error("[BaseMap] init failed:", err);
        if (!cancelled) {
          // lib load failed
          setInitError("Kaart kon niet worden geladen. Controleer je verbinding.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      markers.current.forEach(m => m.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      geolocate.current = null;
    };
  }, [token, retryCount]);

  const toggleTraffic = () => {
    if (!map.current) return;
    const newVisible = !trafficVisible;
    setTrafficVisible(newVisible);
    if (map.current.getLayer('traffic-layer')) {
      map.current.setLayoutProperty(
        'traffic-layer',
        'visibility',
        newVisible ? 'visible' : 'none'
      );
    }
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Loading overlay */}
      {(tokenLoading || !mapLoaded) && !(tokenError || initError) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Kaart laden...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {(tokenError || initError) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3 text-center p-4 max-w-sm">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Kaart kon niet worden geladen</p>
            <p className="text-xs text-muted-foreground/80 break-words">{tokenError || initError}</p>
            {initError && (
              <button
                onClick={() => {
                  setInitError(null);
                  setMapLoaded(false);
                  setRetryCount(c => c + 1);
                }}
                className="mt-1 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Opnieuw proberen
              </button>
            )}
          </div>
        </div>
      )}

      {mapLoaded && showTraffic && (
        <button
          onClick={toggleTraffic}
          className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/50 shadow-md text-xs font-medium hover:bg-background transition-colors"
          title={trafficVisible ? 'Verkeer verbergen' : 'Verkeer tonen'}
        >
          {trafficVisible ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className={trafficVisible ? 'text-primary' : 'text-muted-foreground'}>Verkeer</span>
        </button>
      )}
      {mapLoaded && children}
    </div>
  );
});

BaseMap.displayName = "BaseMap";

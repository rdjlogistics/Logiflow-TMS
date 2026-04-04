import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DestinationData } from "./DestinationCard";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import type mapboxgl from "mapbox-gl";
import { loadMapboxGL } from "@/utils/mapbox-loader";
import { MapPin, Navigation, Clock, Route, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrderRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinations: DestinationData[];
  orderStatus?: string;
  firstStopCompleted?: boolean;
}

const OrderRouteDialog = ({ 
  open, 
  onOpenChange, 
  destinations,
  orderStatus = "gepland",
  firstStopCompleted = false
}: OrderRouteDialogProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { token, loading: isLoading } = useMapboxToken();
  const [routeInfo, setRouteInfo] = useState<{ 
    distance: number; 
    duration: number;
    eta: string | null;
  } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapLoadedRef = useRef(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyRouteLink = async () => {
    const stops = destinations
      .map((d) => {
        if (d.latitude && d.longitude) return `${d.latitude},${d.longitude}`;
        const addr = `${d.street} ${d.house_number}, ${d.postal_code} ${d.city}`.trim();
        return addr && addr !== ', ' ? addr : null;
      })
      .filter(Boolean);
    if (stops.length < 2) return;
    const url = `https://www.google.com/maps/dir/${stops.join('/')}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast.success('Route link gekopieerd!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Kopiëren mislukt');
    }
  };

  const calculateETA = (durationMinutes: number): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + durationMinutes);
    return now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  };

  // Geocode a single destination, using stored coords if available
  const resolveCoordinates = async (
    dest: DestinationData, 
    token: string
  ): Promise<[number, number] | null> => {
    // Use stored coordinates if available
    if (dest.latitude && dest.longitude) {
      return [dest.longitude, dest.latitude];
    }

    // Fallback: geocode via Mapbox
    const address = `${dest.street} ${dest.house_number}, ${dest.postal_code} ${dest.city}, ${dest.country || 'Netherlands'}`.trim();
    if (!address || address === ', ,') return null;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
      );
      const data = await response.json();
      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].center;
        
        // Backfill: save coords to route_stops if this dest has a valid id
        if (dest.id) {
          supabase
            .from('route_stops')
            .update({ latitude: lat, longitude: lng })
            .eq('id', dest.id)
            .then(() => {});
        }
        
        return [lng, lat];
      }
    } catch (error) {
      console.error("Geocoding error for:", address, error);
    }
    return null;
  };

  useEffect(() => {
    if (!open || !token || isLoading) return;

    setRouteError(null);
    setRouteInfo(null);
    mapLoadedRef.current = false;

    let cancelled = false;
    let loadTimeout: ReturnType<typeof setTimeout>;
    let initTimeout: ReturnType<typeof setTimeout>;
    let mb: typeof import("mapbox-gl").default;

    let resizeObserver: ResizeObserver | null = null;

    // Defer map creation — Radix Dialog portal hasn't mounted yet when open flips
    const setup = async () => {
      mb = await loadMapboxGL();
      if (cancelled) return;
      mb.accessToken = token;

      initTimeout = setTimeout(() => {
        if (cancelled || !mapContainer.current) {
          if (!cancelled) {
            setRouteError('Kaartcontainer niet beschikbaar. Probeer opnieuw.');
            setRouteInfo({ distance: 0, duration: 0, eta: null });
          }
          return;
        }

        initMap();
      }, 120);
    };
    setup();

    const initMap = () => {
      map.current = new mb.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [5.2913, 52.1326],
        zoom: 7,
      });

      // ResizeObserver for reliable resizes during dialog animation
      if (mapContainer.current) {
        resizeObserver = new ResizeObserver(() => {
          if (!cancelled && map.current) map.current.resize();
        });
        resizeObserver.observe(mapContainer.current);
      }

      // Fallback resize
      const resizeMap = () => {
        if (!cancelled && map.current) map.current.resize();
      };
      setTimeout(resizeMap, 300);

      map.current.addControl(new mb.NavigationControl(), "top-right");

      const geocodeAndAddMarkers = async () => {
        if (cancelled) return;
        setMapLoaded(true);
        setCalculatingRoute(true);
        mapLoadedRef.current = true;
        map.current?.resize();

        const coordinates: [number, number][] = [];
        const destIndices: number[] = [];

        const results = await Promise.all(
          destinations.map(dest => resolveCoordinates(dest, token))
        );

        if (cancelled) return;

        for (let i = 0; i < results.length; i++) {
          const coord = results[i];
          if (!coord) continue;
          
          coordinates.push(coord);
          destIndices.push(i);
          const dest = destinations[i];
          const [lng, lat] = coord;

          const isFirst = destIndices.length === 1;
          const isPickup = dest.stop_type === 'pickup';
          
          let bgColor = '#3b82f6';
          let label = `${destIndices.length}`;
          
          if (isFirst) {
            bgColor = '#22c55e';
            label = 'A';
          } else if (isPickup) {
            bgColor = '#f59e0b';
          }

          const el = document.createElement('div');
          el.innerHTML = `
            <div style="
              width: 36px; height: 36px; background: ${bgColor};
              border: 3px solid white; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              color: white; font-weight: bold; font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            ">${label}</div>
          `;

          new mb.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(
              new mb.Popup({ offset: 25 }).setHTML(`
                <div style="padding: 8px;">
                  <strong style="font-size: 14px;">${dest.company_name || dest.city}</strong>
                  <p style="font-size: 12px; margin: 4px 0 0 0; color: #666;">
                    ${dest.street} ${dest.house_number}<br/>
                    ${dest.postal_code} ${dest.city}
                  </p>
                  <span style="
                    display: inline-block; margin-top: 6px; padding: 2px 8px;
                    background: ${isPickup ? '#fef3c7' : '#fee2e2'};
                    color: ${isPickup ? '#92400e' : '#991b1b'};
                    border-radius: 4px; font-size: 11px; font-weight: 500;
                  ">${isPickup ? 'Ophalen' : 'Afleveren'}</span>
                </div>
              `)
            )
            .addTo(map.current!);
        }

        if (coordinates.length >= 2) {
          try {
            const coordsString = coordinates.map(c => c.join(',')).join(';');
            const routeResponse = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordsString}?geometries=geojson&overview=full&annotations=congestion&access_token=${token}`
            );
            const routeData = await routeResponse.json();

            if (cancelled) return;

            if (routeData.routes?.length > 0) {
              const route = routeData.routes[0];
              const durationMinutes = Math.round(route.duration / 60);
              
              setRouteInfo({
                distance: Math.round(route.distance / 1000),
                duration: durationMinutes,
                eta: firstStopCompleted ? calculateETA(durationMinutes) : null,
              });

              if (map.current) {
                // Remove old route layers
                if (map.current.getSource('route')) {
                  map.current.removeLayer('route');
                  map.current.removeSource('route');
                }
                // Remove old congestion layers
                for (let i = 0; i < 5000; i++) {
                  if (map.current.getLayer(`route-congestion-${i}`)) {
                    map.current.removeLayer(`route-congestion-${i}`);
                  } else break;
                }
                if (map.current.getSource('route-congestion')) {
                  map.current.removeSource('route-congestion');
                }

                // Build congestion-colored segments
                const congestionColors: Record<string, string> = {
                  low: '#4ade80',
                  moderate: '#facc15',
                  heavy: '#f97316',
                  severe: '#ef4444',
                  unknown: '#3b82f6',
                };

                const routeCoords = route.geometry.coordinates;
                const congestionData = route.legs?.flatMap((leg: any) => leg.annotation?.congestion || []) || [];

                if (congestionData.length > 0 && routeCoords.length > 1) {
                  // Group consecutive segments by congestion level
                  const segments: { coords: [number, number][]; level: string }[] = [];
                  let currentLevel = congestionData[0] || 'unknown';
                  let currentCoords: [number, number][] = [routeCoords[0]];

                  for (let i = 0; i < congestionData.length; i++) {
                    const level = congestionData[i] || 'unknown';
                    if (level !== currentLevel) {
                      currentCoords.push(routeCoords[i + 1]);
                      segments.push({ coords: [...currentCoords], level: currentLevel });
                      currentLevel = level;
                      currentCoords = [routeCoords[i + 1]];
                    } else {
                      currentCoords.push(routeCoords[i + 1]);
                    }
                  }
                  segments.push({ coords: currentCoords, level: currentLevel });

                  const features = segments.map((seg) => ({
                    type: 'Feature' as const,
                    properties: { congestion: seg.level },
                    geometry: { type: 'LineString' as const, coordinates: seg.coords },
                  }));

                  map.current.addSource('route-congestion', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features },
                  });

                  map.current.addLayer({
                    id: 'route-congestion-bg',
                    type: 'line',
                    source: 'route-congestion',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#1e293b', 'line-width': 8, 'line-opacity': 0.4 },
                  });

                  map.current.addLayer({
                    id: 'route-congestion-line',
                    type: 'line',
                    source: 'route-congestion',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                      'line-color': [
                        'match', ['get', 'congestion'],
                        'low', congestionColors.low,
                        'moderate', congestionColors.moderate,
                        'heavy', congestionColors.heavy,
                        'severe', congestionColors.severe,
                        congestionColors.unknown,
                      ],
                      'line-width': 5,
                      'line-opacity': 0.9,
                    },
                  });
                } else {
                  // Fallback: single blue line
                  map.current.addSource('route', {
                    type: 'geojson',
                    data: { type: 'Feature', properties: {}, geometry: route.geometry },
                  });
                  map.current.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.8 },
                  });
                }
              }

              const bounds = new mb.LngLatBounds();
              coordinates.forEach(coord => bounds.extend(coord));
              map.current?.fitBounds(bounds, { 
                padding: { top: 60, bottom: 60, left: 40, right: 40 },
                duration: 1000
              });
              setCalculatingRoute(false);
            } else {
              setRouteError('Geen route gevonden tussen de stops');
              setRouteInfo({ distance: 0, duration: 0, eta: null });
              setCalculatingRoute(false);
            }
          } catch (error) {
            console.error("Routing error:", error);
            if (!cancelled) {
              setRouteError('Fout bij het berekenen van de route');
              setRouteInfo({ distance: 0, duration: 0, eta: null });
              setCalculatingRoute(false);
            }
          }
        } else if (coordinates.length === 1) {
          map.current?.flyTo({ center: coordinates[0], zoom: 14 });
          setRouteInfo({ distance: 0, duration: 0, eta: null });
          setRouteError('Slechts 1 stop kon worden gelokaliseerd — minimaal 2 nodig voor een route');
          setCalculatingRoute(false);
        } else {
          setRouteError('Geen stops konden worden gelokaliseerd');
          setRouteInfo({ distance: 0, duration: 0, eta: null });
          setCalculatingRoute(false);
        }
      };

      // Wait for map to load — handle race condition where map may already be loaded
      const startGeocoding = () => {
        if (!cancelled) geocodeAndAddMarkers();
      };
      if (map.current.loaded()) {
        startGeocoding();
      } else {
        map.current.on('load', startGeocoding);
        // Also listen for 'idle' as fallback in case 'load' was missed
        map.current.once('idle', () => {
          if (!mapLoadedRef.current && !cancelled) startGeocoding();
        });
      }

      // 15-second timeout — use ref to avoid stale closure
      loadTimeout = setTimeout(() => {
        if (!mapLoadedRef.current && !cancelled) {
          setRouteError('Kaart kon niet geladen worden. Probeer opnieuw.');
          setRouteInfo({ distance: 0, duration: 0, eta: null });
        }
      }, 15000);
    };

    return () => {
      cancelled = true;
      clearTimeout(initTimeout);
      clearTimeout(loadTimeout);
      resizeObserver?.disconnect();
      setMapLoaded(false);
      setCalculatingRoute(false);
      mapLoadedRef.current = false;
      map.current?.remove();
    };
  }, [open, token, isLoading, destinations, firstStopCompleted, retryKey]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}u ${mins}min` : `${hours}u`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="sheet"
        className="h-[min(88dvh,calc(100dvh-1rem))] sm:h-[min(85dvh,calc(100dvh-3rem))] sm:max-w-4xl !flex !flex-col p-0 gap-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 flex-1">
            <Route className="h-5 w-5 text-primary" />
            Route weergave
            <button
              onClick={copyRouteLink}
              disabled={destinations.filter(d => d.latitude && d.longitude || (d.street && d.city)).length < 2}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border/50 bg-background hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
              title="Kopieer Google Maps route link"
            >
              {linkCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span className={linkCopied ? 'text-green-500' : ''}>
                {linkCopied ? 'Gekopieerd!' : 'Kopieer route link'}
              </span>
            </button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ minHeight: '200px' >
          <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
          
          {(isLoading || (!mapLoaded && !routeError)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                <span className="text-muted-foreground text-sm">Kaart laden...</span>
              </div>
            </div>
          )}
          
          {mapLoaded && calculatingRoute && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-muted-foreground">Route berekenen...</span>
            </div>
          )}
        </div>

        <div className="border-t bg-card p-3 md:p-4 shrink-0 overflow-y-auto max-h-[35%]">
          {routeError && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{routeError}</span>
              <button 
                onClick={() => setRetryKey(k => k + 1)}
                className="ml-2 px-3 py-1 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Opnieuw proberen
              </button>
            </div>
          )}
          
          {routeInfo ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Afstand</p>
                  <p className="text-lg font-semibold">{routeInfo.distance} km</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Reistijd</p>
                  <p className="text-lg font-semibold">{formatDuration(routeInfo.duration)} <span className="text-xs font-normal text-muted-foreground">incl. verkeer</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  routeInfo.eta ? 'bg-green-500/10' : 'bg-muted'
                }`}>
                  <MapPin className={`h-5 w-5 ${routeInfo.eta ? 'text-green-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">ETA</p>
                  {routeInfo.eta ? (
                    <p className="text-lg font-semibold text-green-600">{routeInfo.eta}</p>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Wacht op ophaling</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <p className="text-muted-foreground text-sm">Route berekenen...</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow" />
              <span className="text-xs text-muted-foreground">Vertrek</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-red-500 border-2 border-white shadow" />
              <span className="text-xs text-muted-foreground">Bestemming</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-orange-500 border-2 border-white shadow" />
              <span className="text-xs text-muted-foreground">Tussenstop (ophalen)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-6 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Route</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="h-1 w-2 rounded-full bg-green-500" />
                <div className="h-1 w-2 rounded-full bg-yellow-400" />
                <div className="h-1 w-2 rounded-full bg-orange-500" />
                <div className="h-1 w-2 rounded-full bg-red-500" />
              </div>
              <span className="text-xs text-muted-foreground">Live verkeer</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderRouteDialog;

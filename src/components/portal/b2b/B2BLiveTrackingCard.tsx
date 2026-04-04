import { useRef, useEffect, useState, useCallback } from "react";
import type mapboxgl from 'mapbox-gl';
import { loadMapboxGL } from '@/utils/mapbox-loader';
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useRealtimeDriverLocation } from "@/hooks/useRealtimeDriverLocation";
import { useDeliveryProximity } from "@/hooks/useDeliveryProximity";
import { useLiveETA } from "@/hooks/useLiveETA";
import { geocodeAddress } from "@/utils/geocoding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation, Gauge, Signal, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface B2BLiveTrackingCardProps {
  tripId: string;
  deliveryCity?: string;
  deliveryAddress?: string;
  customerId?: string;
  onProximityChange?: (isWithinRadius: boolean, distanceKm: number | null) => void;
  onETAUpdate?: (etaMinutes: number | null, routeDistanceKm: number | null, isCalculating: boolean) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};

export const B2BLiveTrackingCard = ({ tripId, deliveryCity, deliveryAddress, customerId, onProximityChange, onETAUpdate }: B2BLiveTrackingCardProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkerEl = useRef<HTMLDivElement | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);

  const { token, loading: tokenLoading, error: tokenError } = useMapboxToken();
  const { location, loading: locationLoading } = useRealtimeDriverLocation(tripId);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);

  // Geocode delivery address once
  useEffect(() => {
    if (!deliveryAddress && !deliveryCity) return;
    geocodeAddress(deliveryAddress || "", undefined, deliveryCity).then((result) => {
      if (result) setDestination({ lat: result.latitude, lng: result.longitude });
    });
  }, [deliveryAddress, deliveryCity]);

  // Live ETA calculation
  const driverLoc = location ? { latitude: location.latitude, longitude: location.longitude } : null;
  const { etaMinutes, routeDistanceKm, isCalculating } = useLiveETA(driverLoc, destination);

  // Notify parent of ETA changes
  useEffect(() => {
    onETAUpdate?.(etaMinutes, routeDistanceKm, isCalculating);
  }, [etaMinutes, routeDistanceKm, isCalculating, onETAUpdate]);

  const { distanceKm, isWithinRadius } = useDeliveryProximity(
    tripId,
    location?.latitude ?? null,
    location?.longitude ?? null,
    customerId
  );

  // Notify parent of proximity changes
  useEffect(() => {
    onProximityChange?.(isWithinRadius, distanceKm);
  }, [isWithinRadius, distanceKm, onProximityChange]);

  // Init map
  useEffect(() => {
    if (!token || !mapContainer.current || map.current) return;

    let cancelled = false;
    loadMapboxGL().then(mb => {
      if (cancelled || !mapContainer.current) return;

      mb.accessToken = token;

      const m = new mb.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [5.2913, 52.1326],
        zoom: 7,
        attributionControl: false,
      });

      m.addControl(new mb.NavigationControl({ showCompass: false }), "top-right");

      m.on("load", () => {
        setMapLoaded(true);
      });

      map.current = m;
    });

    return () => {
      cancelled = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [token]);

  // Update driver marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !location) return;

    const { latitude, longitude, heading } = location;

    if (!driverMarker.current) {
      // Create Elite Class driver marker
      const el = document.createElement("div");
      el.className = "b2b-driver-marker";
      el.innerHTML = `
        <div class="b2b-driver-radar"></div>
        <div class="b2b-driver-radar b2b-driver-radar-2"></div>
        <div class="b2b-driver-dot">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
      `;
      driverMarkerEl.current = el;

      loadMapboxGL().then(mb => {
        driverMarker.current = new mb.Marker({ element: el, rotationAlignment: "map" })
          .setLngLat([longitude, latitude])
          .addTo(map.current!);

        map.current!.flyTo({ center: [longitude, latitude], zoom: 13, duration: 1500 });
      });
    } else {
      driverMarker.current.setLngLat([longitude, latitude]);
    }

    // Rotate marker based on heading
    if (heading !== null && driverMarkerEl.current) {
      const dot = driverMarkerEl.current.querySelector(".b2b-driver-dot") as HTMLElement;
      if (dot) dot.style.transform = `rotate(${heading}deg)`;
    }
  }, [location, mapLoaded]);

  const isWaiting = !location && !locationLoading;
  const speedKmh = location?.speed ? Math.round(location.speed * 3.6) : null;

  return (
    <div>
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="relative">
              <Navigation className="h-4 w-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            Live Tracking
            {location && (
              <span className="ml-auto text-[10px] text-muted-foreground font-normal flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(location.recorded_at), "HH:mm:ss", { locale: nl })}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Map */}
          <div className="relative h-[280px] sm:h-[340px]">
            {tokenLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Kaart laden...</span>
                </div>
              </div>
            )}
            {tokenError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <span className="text-xs text-muted-foreground">Kaart niet beschikbaar</span>
              </div>
            )}
            {isWaiting && mapLoaded && (
              <div className="absolute bottom-3 left-3 z-10 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/30">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Signal className="h-3 w-3 animate-pulse text-amber-400" />
                  Wacht op GPS signaal...
                </div>
              </div>
            )}
            <div ref={mapContainer} className="w-full h-full" />
          </div>

          {/* Stats bar */}
          {location && (
            <div
              className={cn("grid gap-px bg-border/20", etaMinutes != null ? "grid-cols-4" : "grid-cols-3")}
            >
              <div className="bg-card/80 px-3 py-2.5 flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Snelheid</p>
                  <p className="text-sm font-semibold">{speedKmh !== null ? `${speedKmh} km/u` : "-"}</p>
                </div>
              </div>
              <div className="bg-card/80 px-3 py-2.5 flex items-center gap-2">
                <Navigation className={cn("h-3.5 w-3.5 text-primary", location.heading !== null && `rotate-[${location.heading}deg]`)} />
                <div>
                  <p className="text-[10px] text-muted-foreground">Richting</p>
                  <p className="text-sm font-semibold">{location.heading !== null ? `${Math.round(location.heading)}°` : "-"}</p>
                </div>
              </div>
              <div className="bg-card/80 px-3 py-2.5 flex items-center gap-2">
                <Signal className={cn("h-3.5 w-3.5", location.accuracy && location.accuracy < 20 ? "text-emerald-500" : "text-amber-400")} />
                <div>
                  <p className="text-[10px] text-muted-foreground">GPS</p>
                  <p className="text-sm font-semibold">{location.accuracy ? `±${Math.round(location.accuracy)}m` : "-"}</p>
                </div>
              </div>
              {etaMinutes != null && (
                <div className="bg-card/80 px-3 py-2.5 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">ETA</p>
                    <p className="text-sm font-semibold">
                      {etaMinutes < 60 ? `${etaMinutes} min` : `${Math.floor(etaMinutes / 60)}u ${etaMinutes % 60}m`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline styles for marker animation */}
      <style>{`
        .b2b-driver-marker {
          position: relative;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .b2b-driver-radar {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid hsl(var(--primary));
          opacity: 0;
          animation: b2b-radar 2s ease-out infinite;
        }
        .b2b-driver-radar-2 {
          animation-delay: 1s;
        }
        .b2b-driver-dot {
          width: 28px;
          height: 28px;
          background: hsl(var(--primary));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px 4px hsl(var(--primary) / 0.4);
          z-index: 1;
          transition: transform 0.3s ease;
        }
        @keyframes b2b-radar {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

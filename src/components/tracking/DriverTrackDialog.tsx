import React, { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useRealtimeDriverLocation } from "@/hooks/useRealtimeDriverLocation";
import {
  Navigation2,
  Loader2,
  MapPin,
  Clock,
  Gauge,
  Signal,
  X,
  Maximize2,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { IsolatedErrorBoundary } from "@/components/error/ErrorBoundary";

interface DriverTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  driverName?: string;
  vehiclePlate?: string;
  destination?: {
    address: string;
    latitude: number;
    longitude: number;
  };
}

const DriverTrackDialog: React.FC<DriverTrackDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  driverName,
  vehiclePlate,
  destination,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const destMarker = useRef<mapboxgl.Marker | null>(null);

  const { token, loading: tokenLoading, error: tokenError } = useMapboxToken();
  const { location, loading: locationLoading } = useRealtimeDriverLocation(tripId);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!open || !mapContainer.current || !token || map.current) return;

    let cancelled = false;
    const init = async () => {
      const mb = (await import("mapbox-gl")).default;
      await Promise.all([import("mapbox-gl/dist/mapbox-gl.css"), import("@/styles/map-styles.css")]);
      if (cancelled || !mapContainer.current || map.current) return;

      mb.accessToken = token;

      const initialCenter: [number, number] = location
        ? [location.longitude, location.latitude]
        : destination
        ? [destination.longitude, destination.latitude]
        : [5.2913, 52.1326];

      map.current = new mb.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: initialCenter,
        zoom: 14,
      });

      map.current.addControl(new mb.NavigationControl(), "top-right");

      map.current.on("load", () => {
        setMapLoaded(true);
      });
    };
    init();

    return () => {
      cancelled = true;
      if (driverMarker.current) {
        driverMarker.current.remove();
        driverMarker.current = null;
      }
      if (destMarker.current) {
        destMarker.current.remove();
        destMarker.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [open, token]);

  // Update driver marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !location) return;

    const update = async () => {
      const mb = (await import("mapbox-gl")).default;
      const { latitude, longitude, heading } = location;

      if (!driverMarker.current) {
        const el = document.createElement("div");
        el.innerHTML = `
          <div class="relative flex items-center justify-center" style="width: 64px; height: 64px;">
            <div class="absolute w-12 h-12 bg-primary/30 rounded-full animate-ping" style="animation-duration: 2s;"></div>
            <div class="absolute w-16 h-16 bg-primary/15 rounded-full animate-ping" style="animation-duration: 2.5s; animation-delay: 0.5s;"></div>
            <div class="relative w-12 h-12 rounded-full bg-primary flex items-center justify-center border-3 border-background z-10" style="box-shadow: 0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.3);">
              <svg class="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24" style="transform: rotate(${heading || 0}deg)">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
          </div>
        `;

        driverMarker.current = new mb.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(map.current);
      } else {
        driverMarker.current.setLngLat([longitude, latitude]);
      }

      map.current.easeTo({
        center: [longitude, latitude],
        duration: 1000,
      });
    };
    update();
  }, [location, mapLoaded]);

  // Add destination marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !destination || destMarker.current) return;

    const addDest = async () => {
      const mb = (await import("mapbox-gl")).default;

    const el = document.createElement("div");
    el.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-lg border-2 border-background">
        <svg class="w-4 h-4 text-destructive-foreground" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    `;

      destMarker.current = new mb.Marker({ element: el })
        .setLngLat([destination.longitude, destination.latitude])
        .setPopup(new mb.Popup().setHTML(`<p class="text-sm font-medium">${destination.address}</p>`))
        .addTo(map.current);
    };
    addDest();
  }, [destination, mapLoaded]);

  const getSignalQuality = (accuracy: number | null): { label: string; color: string; bars: number } => {
    if (!accuracy) return { label: "Onbekend", color: "text-muted-foreground", bars: 0 };
    if (accuracy <= 10) return { label: "Excellent", color: "text-green-500", bars: 4 };
    if (accuracy <= 25) return { label: "Goed", color: "text-green-400", bars: 3 };
    if (accuracy <= 50) return { label: "Matig", color: "text-yellow-500", bars: 2 };
    return { label: "Zwak", color: "text-red-500", bars: 1 };
  };

  const signalQuality = location ? getSignalQuality(location.accuracy) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Navigation2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">
                  {driverName || "Chauffeur"} volgen
                </DialogTitle>
                {vehiclePlate && (
                  <p className="text-xs text-muted-foreground">{vehiclePlate}</p>
                )}
              </div>
            </div>

            {location && (
              <div className="flex items-center gap-3">
                {/* Speed */}
                {location.speed !== null && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{Math.round(location.speed * 3.6)} km/u</span>
                  </div>
                )}

                {/* Signal quality */}
                {signalQuality && (
                  <div className="flex items-center gap-1.5">
                    <Signal className={`h-4 w-4 ${signalQuality.color}`} />
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`w-1 rounded-full ${
                            bar <= signalQuality.bars
                              ? signalQuality.color.replace("text-", "bg-")
                              : "bg-muted"
                          }`}
                          style={{ height: `${bar * 3 + 4}px` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Last update */}
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(location.recorded_at), "HH:mm:ss", { locale: nl })}
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 relative">
          <IsolatedErrorBoundary name="DriverTrackMap">
            {tokenLoading || locationLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Locatie laden...</p>
                </div>
              </div>
            ) : tokenError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-foreground font-medium">Kaart niet beschikbaar</p>
                <p className="text-sm text-muted-foreground">{tokenError}</p>
              </div>
            ) : !location ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
                <Signal className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-foreground font-medium">Geen GPS signaal</p>
                <p className="text-sm text-muted-foreground">Wacht op locatie van chauffeur...</p>
              </div>
            ) : null}

            <div ref={mapContainer} className="absolute inset-0" />
          </IsolatedErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverTrackDialog;

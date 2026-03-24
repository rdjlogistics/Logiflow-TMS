import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Stop {
  lat: number;
  lng: number;
  type: "pickup" | "delivery";
  city: string;
}

interface OrderRoutePreviewProps {
  stops: Stop[];
  onClose?: () => void;
  onExpand?: () => void;
  className?: string;
  compact?: boolean;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

const OrderRoutePreview = ({
  stops,
  onClose,
  onExpand,
  className,
  compact = false,
}: OrderRoutePreviewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || stops.length < 2) return;

    let cancelled = false;
    const init = async () => {
      const mb = (await import("mapbox-gl")).default;
      await Promise.all([import("mapbox-gl/dist/mapbox-gl.css"), import("@/styles/map-styles.css")]);
      if (cancelled || !mapContainer.current) return;

      try {
        mb.accessToken = MAPBOX_TOKEN;

        const map = new mb.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [stops[0].lng, stops[0].lat],
          zoom: 6,
          interactive: !compact,
          attributionControl: false,
        });

        mapRef.current = map;

        map.on("load", () => {
          setLoading(false);

          // Add markers for each stop
          stops.forEach((stop, index) => {
            const el = document.createElement("div");
            el.className = "flex items-center justify-center";
            el.innerHTML = `
              <div class="w-6 h-6 rounded-full ${
                stop.type === "pickup" 
                  ? "bg-green-500" 
                  : "bg-red-500"
              } flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white">
                ${index + 1}
              </div>
            `;

            new mb.Marker({ element: el })
              .setLngLat([stop.lng, stop.lat])
              .addTo(map);
          });

          // Draw route line
          const coordinates = stops.map(s => [s.lng, s.lat]);
          
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates,
              },
            },
          });

          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#3b82f6",
              "line-width": 3,
              "line-dasharray": [2, 1],
            },
          });

          // Fit bounds to show all stops
          const bounds = new mb.LngLatBounds();
          stops.forEach(stop => bounds.extend([stop.lng, stop.lat]));
          map.fitBounds(bounds, { padding: 40 });
        });

        map.on("error", () => {
          setError("Kaart kon niet worden geladen");
          setLoading(false);
        });
      } catch (err) {
        setError("Kaart kon niet worden geïnitialiseerd");
        setLoading(false);
      }
    };
    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stops, compact]);

  if (stops.length < 2) {
    return null;
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className={cn("p-0 relative", compact ? "h-32" : "h-48")}>
        {/* Map container */}
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <span className="text-xs text-muted-foreground">{error}</span>
          </div>
        )}

        {/* Controls */}
        {!compact && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            {onExpand && (
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                onClick={onExpand}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Stop labels */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-medium truncate max-w-[80px]">{stops[0]?.city}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1">
            <span className="font-medium truncate max-w-[80px]">{stops[stops.length - 1]?.city}</span>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderRoutePreview;

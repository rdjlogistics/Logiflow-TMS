import React, { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { Loader2, MapPin } from "lucide-react";

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  recorded_at?: string;
}

interface TrackingMapProps {
  driverLocation?: DriverLocation | null;
  deliveryLocation?: { latitude: number; longitude: number; address?: string };
  pickupLocation?: { latitude: number; longitude: number; address?: string };
  routeStops?: Array<{ latitude: number; longitude: number; address: string; status: string }>;
  showDriverMarker?: boolean;
  showRoute?: boolean;
  className?: string;
}

const TrackingMap: React.FC<TrackingMapProps> = ({
  driverLocation,
  deliveryLocation,
  pickupLocation,
  routeStops = [],
  showDriverMarker = true,
  showRoute = true,
  className = "",
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const { token, loading, error } = useMapboxToken();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    let cancelled = false;
    const init = async () => {
      const mb = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !mapContainer.current || map.current) return;

      mb.accessToken = token;

      const initialCenter: [number, number] = driverLocation
        ? [driverLocation.longitude, driverLocation.latitude]
        : deliveryLocation
        ? [deliveryLocation.longitude, deliveryLocation.latitude]
        : [5.2913, 52.1326];

      map.current = new mb.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: initialCenter,
        zoom: 12,
        pitch: 0,
      });

      map.current.addControl(new mb.NavigationControl(), "top-right");
      map.current.addControl(new mb.FullscreenControl(), "top-right");

      map.current.on("load", () => {
        setMapLoaded(true);
      });
    };
    init();

    return () => {
      cancelled = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [token]);

  // Update driver marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const update = async () => {
      const mb = (await import("mapbox-gl")).default;

      if (driverLocation && showDriverMarker) {
        const el = document.createElement("div");
        el.className = "driver-marker";
        el.innerHTML = `
          <div class="relative flex items-center justify-center" style="width: 64px; height: 64px;">
            <div class="absolute w-12 h-12 bg-primary/30 rounded-full animate-ping" style="animation-duration: 2s;"></div>
            <div class="absolute w-16 h-16 bg-primary/15 rounded-full animate-ping" style="animation-duration: 2.5s; animation-delay: 0.5s;"></div>
            <div class="relative w-12 h-12 bg-primary rounded-full flex items-center justify-center border-4 border-background z-10" style="box-shadow: 0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.3);">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H15a2 2 0 0 1 2 2v0"/>
                <circle cx="7" cy="18" r="2"/>
                <path d="M15 18H9"/>
                <circle cx="17" cy="18" r="2"/>
                <path d="M21 11h-5a2 2 0 0 0-2 2v5"/>
                <path d="M21 8v6"/>
              </svg>
            </div>
            ${driverLocation.heading ? `<div class="absolute -top-1 left-1/2 w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-primary z-20" style="transform: translateX(-50%) rotate(${driverLocation.heading}deg);"></div>` : ''}
          </div>
        `;

        if (driverMarker.current) {
          driverMarker.current.setLngLat([driverLocation.longitude, driverLocation.latitude]);
        } else {
          driverMarker.current = new mb.Marker({ element: el })
            .setLngLat([driverLocation.longitude, driverLocation.latitude])
            .addTo(map.current);
        }

        map.current.easeTo({
          center: [driverLocation.longitude, driverLocation.latitude],
          duration: 1000,
        });
      } else if (driverMarker.current) {
        driverMarker.current.remove();
        driverMarker.current = null;
      }
    };
    update();
  }, [driverLocation, showDriverMarker, mapLoaded]);

  // Update delivery marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !deliveryLocation) return;

    const update = async () => {
      const mb = (await import("mapbox-gl")).default;

      const el = document.createElement("div");
      el.className = "delivery-marker";
      el.innerHTML = `
        <div class="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg border-2 border-background">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      if (deliveryMarker.current) {
        deliveryMarker.current.setLngLat([deliveryLocation.longitude, deliveryLocation.latitude]);
      } else {
        deliveryMarker.current = new mb.Marker({ element: el })
          .setLngLat([deliveryLocation.longitude, deliveryLocation.latitude])
          .setPopup(
            new mb.Popup({ offset: 25 }).setHTML(
              `<div class="p-2"><strong>Afleveradres</strong><br/>${deliveryLocation.address || ""}</div>`
            )
          )
          .addTo(map.current);
      }
    };
    update();
  }, [deliveryLocation, mapLoaded]);

  // Update pickup marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !pickupLocation) return;

    const update = async () => {
      const mb = (await import("mapbox-gl")).default;

      const el = document.createElement("div");
      el.className = "pickup-marker";
      el.innerHTML = `
      <div class="w-10 h-10 bg-secondary rounded-full flex items-center justify-center shadow-lg border-2 border-background">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      </div>
    `;

      if (pickupMarker.current) {
        pickupMarker.current.setLngLat([pickupLocation.longitude, pickupLocation.latitude]);
      } else {
        pickupMarker.current = new mb.Marker({ element: el })
          .setLngLat([pickupLocation.longitude, pickupLocation.latitude])
          .setPopup(
            new mb.Popup({ offset: 25 }).setHTML(
              `<div class="p-2"><strong>Ophaaladres</strong><br/>${pickupLocation.address || ""}</div>`
            )
          )
          .addTo(map.current);
      }
    };
    update();
  }, [pickupLocation, mapLoaded]);

  // Draw route
  useEffect(() => {
    if (!map.current || !mapLoaded || !showRoute) return;

    const drawRoute = async () => {
      const mb = (await import("mapbox-gl")).default;

      const points: [number, number][] = [];
      if (pickupLocation) points.push([pickupLocation.longitude, pickupLocation.latitude]);
      if (driverLocation && showDriverMarker) points.push([driverLocation.longitude, driverLocation.latitude]);
      routeStops.forEach((stop) => {
        if (stop.latitude && stop.longitude) {
          points.push([stop.longitude, stop.latitude]);
        }
      });
      if (deliveryLocation) points.push([deliveryLocation.longitude, deliveryLocation.latitude]);

      if (points.length >= 2 && token) {
        const coordinates = points.map((p) => p.join(",")).join(";");
        
        try {
          const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${token}`
          );
          const data = await res.json();

          if (data.routes && data.routes[0]) {
            const route = data.routes[0].geometry;
            const geojsonData: GeoJSON.Feature = {
              type: "Feature",
              properties: {},
              geometry: route,
            };

            if (map.current?.getSource("route")) {
              (map.current.getSource("route") as any).setData(geojsonData);
            } else {
              map.current?.addSource("route", {
                type: "geojson",
                data: geojsonData,
              });

              map.current?.addLayer({
                id: "route-bg",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#6366f1", "line-width": 8, "line-opacity": 0.3 },
              });

              map.current?.addLayer({
                id: "route-arrows",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#818cf8", "line-width": 4, "line-opacity": 0.9, "line-dasharray": [0, 4, 3] },
              });
            }

            const routeCoords = route.coordinates as [number, number][];
            const bounds = new mb.LngLatBounds(routeCoords[0], routeCoords[0]);
            routeCoords.forEach((coord: [number, number]) => bounds.extend(coord));
            map.current?.fitBounds(bounds, { padding: 50 });
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    drawRoute();
  }, [driverLocation, deliveryLocation, pickupLocation, routeStops, showRoute, mapLoaded, token, showDriverMarker]);

  // Animate dash-array on route-arrows layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const dashArraySequence: number[][] = [
      [0, 4, 3],
      [0.5, 4, 2.5],
      [1, 4, 2],
      [1.5, 4, 1.5],
      [2, 4, 1],
      [2.5, 4, 0.5],
      [3, 4, 0],
      [0, 0.5, 3, 3.5],
    ];

    let step = 0;
    let animationId: number;
    let lastTime = 0;
    const interval = 150; // ms per step

    const animate = (timestamp: number) => {
      if (timestamp - lastTime >= interval) {
        lastTime = timestamp;
        if (map.current?.getLayer("route-arrows")) {
          map.current.setPaintProperty("route-arrows", "line-dasharray", dashArraySequence[step]);
          step = (step + 1) % dashArraySequence.length;
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [mapLoaded]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-xl ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted rounded-xl ${className}`}>
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Kaart kon niet worden geladen</p>
        <p className="text-sm text-muted-foreground/60">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-lg ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/10 rounded-xl" />
    </div>
  );
};

export default TrackingMap;

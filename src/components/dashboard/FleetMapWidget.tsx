import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import type mapboxgl from "mapbox-gl";
import { loadMapboxGL } from "@/utils/mapbox-loader";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useAllDriverLocations } from "@/hooks/useAllDriverLocations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Map, 
  Truck, 
  Navigation2, 
  Loader2, 
  AlertTriangle,
  Maximize2,
  RefreshCw,
  MapPin,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";


const FleetMapWidget = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { token, loading: tokenLoading, error: tokenError } = useMapboxToken();
  const { locations: realLocations, loading: locationsLoading, refetch } = useAllDriverLocations();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const locations = realLocations;

  // Active = has speed > 0 or recorded in last 10 minutes
  const activeVehicles = locations.filter(l => 
    (l.speed && l.speed > 0) || 
    (new Date().getTime() - new Date(l.recorded_at).getTime() < 10 * 60 * 1000)
  ).length;
  const totalVehicles = locations.length;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !token || mapRef.current) return;

    let cancelled = false;
    const init = async () => {
      const mb = await loadMapboxGL();
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      mb.accessToken = token;

      mapRef.current = new mb.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [5.2913, 52.1326],
        zoom: 7,
        pitch: 35,
        bearing: 0,
        attributionControl: false,
      });

      mapRef.current.addControl(
        new mb.NavigationControl({ showCompass: false }),
        "top-right"
      );

      mapRef.current.on("load", () => {
        setMapLoaded(true);
        mapRef.current?.setFog({
          color: 'rgb(10, 10, 20)',
          'high-color': 'rgb(20, 20, 40)',
          'horizon-blend': 0.1,
        });
      });
    };
    init();

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [token]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const updateMarkers = async () => {
      const mb = await loadMapboxGL();

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add new markers
      locations.forEach((location) => {
        const el = document.createElement("div");
        el.className = "fleet-marker";
        
        const isActive = (location.speed && location.speed > 0) || 
          (new Date().getTime() - new Date(location.recorded_at).getTime() < 10 * 60 * 1000);
        const markerColor = isActive ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))';
        
        el.innerHTML = `
          <div class="relative group cursor-pointer">
            <div class="absolute inset-0 ${isActive ? 'bg-success' : 'bg-muted'} rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <div class="relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-transform group-hover:scale-110" style="background: ${markerColor}; border-color: rgba(255,255,255,0.3);">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 17h4V5H2v12h3"/>
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
                <path d="M14 17h1"/>
                <circle cx="7.5" cy="17.5" r="2.5"/>
                <circle cx="17.5" cy="17.5" r="2.5"/>
              </svg>
            </div>
            ${isActive ? `
              <div class="absolute -top-1 -right-1">
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-success border border-background"></span>
                </span>
              </div>
            ` : ''}
          </div>
        `;

        const marker = new mb.Marker({ element: el })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(
            new mb.Popup({ offset: 25, className: 'fleet-popup' }).setHTML(`
              <div class="p-3 min-w-[180px]">
                <p class="font-bold text-sm mb-1">${location.driver_name || 'Chauffeur'}</p>
                <p class="text-xs text-muted-foreground mb-2">${location.trip_id ? `Trip ${location.trip_id.slice(0, 8)}` : 'Geen actieve trip'}</p>
                <div class="flex items-center gap-2 text-xs">
                  <span class="px-2 py-0.5 rounded-full ${isActive ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'} font-medium">
                    ${isActive ? 'Onderweg' : 'Gestopt'}
                  </span>
                  ${location.speed ? `<span class="text-muted-foreground">${Math.round(location.speed)} km/h</span>` : ''}
                </div>
              </div>
            `)
          )
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });

      // Fit bounds if we have locations
      if (locations.length > 0) {
        const bounds = new mb.LngLatBounds();
        locations.forEach(loc => {
          bounds.extend([loc.longitude, loc.latitude]);
        });
        
        if (locations.length > 1) {
          mapRef.current!.fitBounds(bounds, { 
            padding: 60,
            maxZoom: 12,
            duration: 1000 
          });
        } else {
          mapRef.current!.flyTo({
            center: [locations[0].longitude, locations[0].latitude],
            zoom: 12,
            duration: 1000
          });
        }
      }
    };
    updateMarkers();
  }, [locations, mapLoaded]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetch]);

  // Loading state
  if (tokenLoading) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15">
              <Map className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold">Live Fleet</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[320px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-destructive/15">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-lg font-bold">Live Fleet</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[320px] text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Kaart niet beschikbaar</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{tokenError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden h-full relative">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
      
      <CardHeader className="pb-4 border-b border-border/30 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl bg-primary/15"
            >
              <Map className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Live Fleet</CardTitle>
                <Badge variant="premium" className="text-[10px]">
                  <span className="relative flex h-1.5 w-1.5 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                  Real-time
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="text-success font-bold">{activeVehicles}</span> actief van {totalVehicles} voertuigen
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
              <Link to="/track-chauffeurs">
                <Maximize2 className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        {/* Map container */}
        <div ref={mapContainerRef} className="h-[320px] w-full" />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-card via-transparent to-transparent" />
        
        {/* Quick stats overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 pointer-events-none">
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/30 shadow-lg pointer-events-auto"
          >
            <Truck className="h-4 w-4 text-success" />
            <span className="text-sm font-bold">{activeVehicles}</span>
            <span className="text-xs text-muted-foreground">onderweg</span>
          </div>
          
          {locations.some(l => l.speed && l.speed > 0) && (
            <div 
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border/30 shadow-lg pointer-events-auto"
            >
              <Navigation2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">
                {Math.round(locations.reduce((sum, l) => sum + (l.speed || 0), 0) / Math.max(activeVehicles, 1))}
              </span>
              <span className="text-xs text-muted-foreground">gem. km/h</span>
            </div>
          )}
        </div>
        
        {/* Loading overlay */}
        {locationsLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        
        {/* No vehicles message */}
        {!locationsLoading && locations.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Zap className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Geen actieve voertuigen</p>
            <p className="text-xs text-muted-foreground/60">GPS-tracking is niet actief</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(FleetMapWidget);

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useDriverTrips } from '@/hooks/useDriverTrips';
import { useVehicleInspection } from '@/hooks/useVehicleInspection';

import { DriverStopCard } from '@/components/driver/DriverStopCard';
import { VehicleInspectionSheet } from '@/components/driver/VehicleInspectionSheet';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BaseMap, BaseMapRef } from '@/components/map/BaseMap';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentsSheet } from '@/components/driver/DocumentsSheet';
import { 
  Route, 
  Clock, 
  Play,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Navigation,
  Package,
  Euro,
  FileText,
} from 'lucide-react';
import { isToday, isTomorrow, isAfter, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DriverRittenTabProps {
  onStartRoute?: (tripId: string) => void;
  gpsPermissionStatus?: PermissionState | null;
  onRequestGPSPermission?: () => Promise<boolean>;
}

interface RouteStop {
  id: string;
  trip_id: string;
  stop_order: number;
  stop_type: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  time_window_start: string | null;
  time_window_end: string | null;
  actual_arrival: string | null;
  customer_reference: string | null;
  waybill_number: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cargo_description?: string | null;
  weight_kg?: number | null;
  colli_count?: number | null;
  dimensions?: string | null;
  country?: string | null;
}

export function DriverRittenTab({ onStartRoute, gpsPermissionStatus, onRequestGPSPermission }: DriverRittenTabProps) {
  const { trips, loading, startTrip, fetchTrips } = useDriverTrips();
  const { data: tenantSettings } = useTenantSettings();
  const { todayInspection, isRequired: inspectionRequired } = useVehicleInspection();
  const { toast } = useToast();
  
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [expandedCompleted, setExpandedCompleted] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const mapRef = useRef<BaseMapRef>(null);
  const { token: mapboxToken } = useMapboxToken();

  const permissionStatus = gpsPermissionStatus ?? null;
  const requestPermission = onRequestGPSPermission ?? (async () => false);
  const gpsEnabled = permissionStatus === 'granted';

  const segmentedTrips = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(new Date(Date.now() + 86400000));
    const pastTrips = trips.filter(t => isBefore(startOfDay(new Date(t.trip_date + 'T00:00:00')), today));
    const todayTrips = trips.filter(t => isToday(startOfDay(new Date(t.trip_date + 'T00:00:00'))));
    const tomorrowTrips = trips.filter(t => isTomorrow(startOfDay(new Date(t.trip_date + 'T00:00:00'))));
    const laterTrips = trips.filter(t => isAfter(startOfDay(new Date(t.trip_date + 'T00:00:00')), tomorrow));
    return { pastTrips, todayTrips, tomorrowTrips, laterTrips };
  }, [trips]);

  const selectedTrip = trips.find(t => t.id === selectedTripId);

  const animationRef = useRef<number | null>(null);

  // Cleanup animation on unmount or trip change
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [selectedTripId]);

  const startRouteAnimation = useCallback((map: mapboxgl.Map) => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const dashSeq: number[][] = [
      [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5],
      [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5],
      [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2],
      [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
    ];
    let step = 0;
    let last = 0;
    const animate = (ts: number) => {
      if (ts - last >= 120) {
        if (map.getLayer('route-line')) {
          map.setPaintProperty('route-line', 'line-dasharray', dashSeq[step]);
          step = (step + 1) % dashSeq.length;
        }
        last = ts;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleMapLoad = useCallback((map: mapboxgl.Map) => {
    if (!selectedTrip || !mapRef.current) return;
    const pLng = selectedTrip.pickup_longitude;
    const pLat = selectedTrip.pickup_latitude;
    const dLng = selectedTrip.delivery_longitude;
    const dLat = selectedTrip.delivery_latitude;
    if (!pLng || !pLat || !dLng || !dLat) return;

    mapRef.current.clearMarkers();

    // Helper: create labeled marker
    const createMarker = (color: string, label: string, icon: string, size = 40) => {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;';
      el.innerHTML = `
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 0 12px ${color}80, 0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
          ${icon}
        </div>
        <div style="background:rgba(0,0,0,0.75);color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;white-space:nowrap;margin-top:2px">${label}</div>
      `;
      return el;
    };

    // Pickup marker (green + label)
    const pickupEl = createMarker('#22c55e', 'Ophalen', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>');
    mapRef.current.addMarker([pLng, pLat], pickupEl);

    // Delivery marker (red + label)
    const deliveryEl = createMarker('#ef4444', 'Afleveren', '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>');
    mapRef.current.addMarker([dLng, dLat], deliveryEl);

    // All stops
    const allStops = [...(selectedTrip.route_stops || [])]
      .sort((a, b) => a.stop_order - b.stop_order);

    // Geocode stops missing coordinates
    const geocodeStop = async (stop: RouteStop): Promise<RouteStop> => {
      if (stop.latitude && stop.longitude) return stop;
      if (!mapboxToken || !stop.address) return stop;
      try {
        const query = encodeURIComponent(`${stop.address}${stop.city ? ', ' + stop.city : ''}`);
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&limit=1`);
        const data = await res.json();
        const coords = data?.features?.[0]?.center;
        if (coords) {
          const [lng, lat] = coords;
          supabase.from('route_stops').update({ latitude: lat, longitude: lng }).eq('id', stop.id).then(() => {});
          return { ...stop, latitude: lat, longitude: lng };
        }
      } catch (e) {
        console.warn('Inline geocode failed for stop', stop.id, e);
      }
      return stop;
    };

    Promise.all(allStops.map(geocodeStop)).then((geocodedStops) => {
      if (!mapRef.current) return;
      const sortedStops = geocodedStops.filter(s => s.latitude && s.longitude);

      // Color-coded stop markers with labels
      for (const stop of sortedStops) {
        const stopColor = stop.stop_type === 'pickup' ? '#22c55e' : stop.stop_type === 'delivery' ? '#ef4444' : '#3b82f6';
        const stopLabel = stop.company_name || stop.city || `Stop ${stop.stop_order}`;
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;';
        el.innerHTML = `
          <div style="width:36px;height:36px;border-radius:50%;background:${stopColor};border:3px solid white;box-shadow:0 0 10px ${stopColor}60, 0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:800">${stop.stop_order}</div>
          <div style="background:rgba(0,0,0,0.75);color:white;padding:2px 6px;border-radius:8px;font-size:9px;font-weight:600;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis">${stopLabel}</div>
        `;
        mapRef.current!.addMarker([stop.longitude!, stop.latitude!], el);
      }

      // Bounds - use mapRef.fitBounds with raw coordinates
      const allCoords: [number, number][] = [[pLng, pLat], [dLng, dLat], ...sortedStops.map(s => [s.longitude!, s.latitude!] as [number, number])];
      const lngs = allCoords.map(c => c[0]);
      const lats = allCoords.map(c => c[1]);
      mapRef.current!.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 50, maxZoom: 14 }
      );

      // Build route with driving-traffic
      if (mapboxToken) {
        const waypointCoords = sortedStops.map(s => `${s.longitude},${s.latitude}`);
        const allCoords = [`${pLng},${pLat}`, ...waypointCoords, `${dLng},${dLat}`].slice(0, 25).join(';');

        fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${allCoords}?geometries=geojson&overview=full&access_token=${mapboxToken}`)
          .then(r => r.json())
          .then(data => {
            if (!data.routes?.[0]?.geometry || !map) return;
            // Clean up previous layers
            ['route-glow', 'route-line-bg', 'route-line'].forEach(id => {
              if (map.getLayer(id)) map.removeLayer(id);
            });
            if (map.getSource('route')) map.removeSource('route');

            map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: data.routes[0].geometry } });

            // Layer 1: Glow
            map.addLayer({
              id: 'route-glow', type: 'line', source: 'route',
              paint: { 'line-color': '#3b82f6', 'line-width': 14, 'line-opacity': 0.15, 'line-blur': 8 },
            });
            // Layer 2: Background
            map.addLayer({
              id: 'route-line-bg', type: 'line', source: 'route',
              paint: { 'line-color': '#3b82f6', 'line-width': 6, 'line-opacity': 0.3 },
            });
            // Layer 3: Animated foreground
            map.addLayer({
              id: 'route-line', type: 'line', source: 'route',
              paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.85, 'line-dasharray': [0, 4, 3] },
            });

            startRouteAnimation(map);
          })
          .catch(err => console.warn('Route fetch failed:', err));
      }
    });
  }, [selectedTrip, mapboxToken, startRouteAnimation]);

  const [confirmStartTrip, setConfirmStartTrip] = useState<string | null>(null);

  const handleStartTrip = async (tripId: string) => {
    // Show confirmation dialog instead of starting immediately
    setConfirmStartTrip(tripId);
  };

  const executeStartTrip = async (tripId: string) => {
    if (!gpsEnabled) {
      toast({
        title: 'GPS niet beschikbaar',
        description: 'Locatie wordt niet geregistreerd. Je kunt de rit wel starten.',
        variant: 'default',
      });
    }
    // Check if inspection is required
    if (inspectionRequired) {
      const trip = trips.find(t => t.id === tripId);
      if (!trip?.vehicle_id) {
        toast({ title: 'Geen voertuig gekoppeld', description: 'Koppel eerst een voertuig aan deze rit', variant: 'destructive' });
        return;
      }
      setSelectedTripId(tripId);
      setInspectionOpen(true);
      return;
    }
    await startTrip(tripId);
    onStartRoute?.(tripId);
    setConfirmStartTrip(null);
  };

  const handleInspectionCompleted = async (passed: boolean) => {
    if (passed && selectedTripId) {
      // Auto-start trip after passed inspection
      const trip = trips.find(t => t.id === selectedTripId);
      if (trip?.status === 'gepland') {
        await startTrip(selectedTripId);
        onStartRoute?.(selectedTripId);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'geladen':
        return <Badge variant="warning">Geladen</Badge>;
      case 'onderweg':
        return <Badge variant="info">Actief</Badge>;
      case 'afgeleverd':
      case 'afgerond':
      case 'gecontroleerd':
      case 'gefactureerd':
        return <Badge variant="success">Voltooid</Badge>;
      default:
        return <Badge variant="outline">Gepland</Badge>;
    }
  };

  const showPurchasePrice = tenantSettings?.show_purchase_price_to_driver ?? false;

  const RouteListItem = ({ trip }: { trip: typeof trips[0] }) => {
    const stops = trip.route_stops || [];
    const completedStops = stops.filter(s => s.status === 'completed').length;
    const isActive = ['onderweg', 'geladen'].includes(trip.status);

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <Card 
          className={cn(
            "cursor-pointer transition-all border-border/40",
            isActive && "border-blue-500/50 bg-blue-500/5"
          )}
          onClick={() => setSelectedTripId(trip.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusBadge(trip.status)}
                <span className="text-xs text-muted-foreground font-mono">
                  {trip.order_number}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {trip.pickup_city} → {trip.delivery_city}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {completedStops}/{stops.length} stops
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showPurchasePrice && trip.purchase_total != null && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Euro className="h-3 w-3 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">
                      {Number(trip.purchase_total).toFixed(0)}
                    </span>
                  </div>
                )}
                {isActive && (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Ritten laden...</p>
        </div>
      </div>
    );
  }

  // Route Detail View
  if (selectedTrip) {
    const stops = (selectedTrip.route_stops || []) as RouteStop[];
    const pendingStops = stops.filter(s => s.status !== 'completed');
    const completedStops = stops.filter(s => s.status === 'completed');
    const isActive = ['onderweg', 'geladen'].includes(selectedTrip.status);
    const isCompletedTrip = ['afgeleverd', 'afgerond', 'gecontroleerd', 'gefactureerd'].includes(selectedTrip.status);

    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTripId(null)}>
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTrip.status)}
                <span className="text-sm font-mono text-muted-foreground">
                  {selectedTrip.order_number}
                </span>
              </div>
              <p className="font-semibold">
                {selectedTrip.pickup_city} → {selectedTrip.delivery_city}
              </p>
            </div>
            {showPurchasePrice && selectedTrip.purchase_total != null && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Euro className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">
                  €{Number(selectedTrip.purchase_total).toFixed(2)}
                </span>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setDocumentsOpen(true)} className="h-10 w-10">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Mapbox kaart met verkeer */}
        <div className="relative w-full h-[200px] flex-shrink-0">
          <BaseMap
            ref={mapRef}
            key={selectedTrip.id}
            style="streets"
            showTraffic={true}
            showGeolocate={true}
            showNavigation={false}
            zoom={12}
            className="w-full h-full"
            onLoad={handleMapLoad}
          />
        </div>

        {/* GPS Warning */}
        {!gpsEnabled && !isActive && (
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/30">
            <div className="flex items-center gap-3">
              <Navigation className="h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Locatie vereist</p>
                <p className="text-xs text-muted-foreground">Activeer locatie om te starten</p>
              </div>
              <Button size="sm" onClick={requestPermission} className="bg-amber-500 hover:bg-amber-600">
                Toestaan
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 scroll-smooth-touch">
          <div className="px-4 pt-4 pb-36 space-y-4 bottom-nav-safe">
            {/* Start Button */}
            {selectedTrip.status === 'gepland' && (
              <Button 
                className="w-full h-14 text-lg font-bold"
                onClick={() => handleStartTrip(selectedTrip.id)}
                disabled={!gpsEnabled}
              >
                <Play className="h-5 w-5 mr-2" />
                Start rit
              </Button>
            )}

            {/* Pending Stops */}
            {pendingStops.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Te doen ({pendingStops.length})</h3>
                {pendingStops.map((stop, index) => (
                  <DriverStopCard
                    key={stop.id}
                    stop={stop}
                    tripId={selectedTrip.id}
                    isActive={index === 0 && isActive}
                    isCompleted={false}
                    onRefresh={fetchTrips}
                    showPurchasePrice={tenantSettings?.show_purchase_price_to_driver ?? false}
                    purchaseTotal={selectedTrip.purchase_total}
                    tripStatus={selectedTrip.status}
                  />
                ))}
              </div>
            )}

            {/* Completed Stops - Elite animated section */}
            {completedStops.length > 0 && (
              <div className="space-y-2">
                <motion.button
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors"
                  onClick={() => setExpandedCompleted(!expandedCompleted)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-emerald-400">{completedStops.length}</span>
                    </div>
                    <span className="text-sm font-medium text-emerald-400/80">Voltooid</span>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedCompleted ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <ChevronDown className="h-4 w-4 text-emerald-400/60" />
                  </motion.div>
                </motion.button>

                <AnimatePresence initial={false}>
                  {expandedCompleted && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="overflow-hidden space-y-2"
                    >
                      {completedStops.map((stop, i) => (
                        <motion.div
                          key={stop.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <DriverStopCard
                            stop={stop}
                            tripId={selectedTrip.id}
                            isActive={false}
                            isCompleted={true}
                            onRefresh={fetchTrips}
                            showPurchasePrice={tenantSettings?.show_purchase_price_to_driver ?? false}
                            purchaseTotal={selectedTrip.purchase_total}
                            tripStatus={selectedTrip.status}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        <DocumentsSheet
          open={documentsOpen}
          onOpenChange={setDocumentsOpen}
          tripId={selectedTrip.id}
          orderNumber={selectedTrip.order_number}
        />
      </div>
    );
  }

  // Route List View
  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
        <Route className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="font-semibold mb-1">Geen ritten</p>
      <p className="text-sm text-muted-foreground">
        Ritten verschijnen zodra je een dienst hebt.
      </p>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overscroll-contain">
      {/* Header */}
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold">Ritten</h1>
      </div>

      <Tabs defaultValue="today" className="flex-1 flex flex-col">
        <div className="px-4">
         <TabsList className="grid w-full grid-cols-4 h-10">
            <TabsTrigger value="today" className="gap-1 text-xs">
              Vandaag
              {segmentedTrips.todayTrips.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {segmentedTrips.todayTrips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="gap-1 text-xs">
              Morgen
              {segmentedTrips.tomorrowTrips.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {segmentedTrips.tomorrowTrips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="later" className="gap-1 text-xs">
              Later
              {segmentedTrips.laterTrips.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {segmentedTrips.laterTrips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1 text-xs">
              Eerder
              {segmentedTrips.pastTrips.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {segmentedTrips.pastTrips.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 scroll-smooth-touch">
          <TabsContent value="today" className="px-4 pt-4 space-y-3 mt-0 bottom-nav-safe">
            {segmentedTrips.todayTrips.length === 0 ? (
              <EmptyState />
            ) : (
              segmentedTrips.todayTrips.map(trip => (
                <RouteListItem key={trip.id} trip={trip} />
              ))
            )}
          </TabsContent>

          <TabsContent value="tomorrow" className="px-4 pt-4 space-y-3 mt-0 bottom-nav-safe">
            {segmentedTrips.tomorrowTrips.length === 0 ? (
              <EmptyState />
            ) : (
              segmentedTrips.tomorrowTrips.map(trip => (
                <RouteListItem key={trip.id} trip={trip} />
              ))
            )}
          </TabsContent>

          <TabsContent value="later" className="px-4 pt-4 space-y-3 mt-0 bottom-nav-safe">
            {segmentedTrips.laterTrips.length === 0 ? (
              <EmptyState />
            ) : (
              segmentedTrips.laterTrips.map(trip => (
                <RouteListItem key={trip.id} trip={trip} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="px-4 pt-4 space-y-3 mt-0 bottom-nav-safe">
            {segmentedTrips.pastTrips.length === 0 ? (
              <EmptyState />
            ) : (
              segmentedTrips.pastTrips.map(trip => (
                <RouteListItem key={trip.id} trip={trip} />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
      {/* Vehicle Inspection Sheet */}
      <VehicleInspectionSheet
        open={inspectionOpen}
        onOpenChange={setInspectionOpen}
        vehicleId={(selectedTrip as any)?.vehicle_id || ''}
        tripId={selectedTripId || undefined}
        onCompleted={handleInspectionCompleted}
      />
    </div>
  );
}
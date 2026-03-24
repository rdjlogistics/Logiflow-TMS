import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type mapboxgl from 'mapbox-gl';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useFuelStationsDE, FuelStationDE } from '@/hooks/useFuelStationsDE';
import { FuelStationsMapGeoJSON } from '@/components/fuel-stations/FuelStationsMapGeoJSON';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Fuel,
  Navigation,
  MapPin,
  Locate,
  List,
  Map as MapIcon,
  Loader2,
  ChevronRight,
  Store,
  Droplets,
  Truck,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FuelTypeDE = 'diesel' | 'e10' | 'e5';

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
};

export function DriverTankstationsTab() {
  const { token, loading: tokenLoading, error: tokenError, refetch: refetchToken } = useMapboxToken();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  
  const {
    stations,
    geoJSON,
    loading: stationsLoading,
    error: stationsError,
    mockMode,
    userLocation,
    locationStatus,
    requestLocation,
    selectedFuelType,
    setSelectedFuelType,
    navigateToStation,
    getNearbyStations,
    fetchStations,
  } = useFuelStationsDE({ autoFetch: true, refreshInterval: 90000 });

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedStation, setSelectedStation] = useState<FuelStationDE | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Get nearby stations
  const nearbyStations = getNearbyStations(15);

  // Map center based on user location
  const mapCenter = userLocation 
    ? { lng: userLocation.lng, lat: userLocation.lat } 
    : { lng: 5.2913, lat: 52.1326 }; // NL center

  // Handle station selection from map
  const handleSelectStation = useCallback((stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    if (station) {
      setSelectedStation(station);
    }
  }, [stations]);

  // Handle locate button
  const handleLocate = () => {
    if (locationStatus !== 'granted') {
      requestLocation();
    }
  };

  const fuelTypes: { type: FuelTypeDE; label: string }[] = [
    { type: 'diesel', label: 'Diesel' },
    { type: 'e5', label: 'E5' },
    { type: 'e10', label: 'E10' },
  ];

  const getFacilityIcon = (facility: string) => {
    switch (facility) {
      case 'shop': return <Store className="h-3 w-3" />;
      case 'car_wash': return <Droplets className="h-3 w-3" />;
      case 'truck_parking': return <Truck className="h-3 w-3" />;
      default: return null;
    }
  };

  // Loading state for token
  if (tokenLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Kaart laden...</p>
        </motion.div>
      </div>
    );
  }

  // Error state for token
  if (tokenError || !token) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="py-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold">Kaart niet beschikbaar</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {tokenError || 'Kon geen verbinding maken met de kaartservice'}
              </p>
            </div>
            <Button onClick={refetchToken} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Opnieuw proberen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state for stations
  if (stationsLoading && stations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div 
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Tankstations laden...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Top Controls */}
      <div className="flex-shrink-0 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50 space-y-3">
        {/* Fuel Type Pills */}
        <div className="flex items-center gap-2">
          {fuelTypes.map(({ type, label }) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedFuelType(type)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                selectedFuelType === type
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* View Toggle & Locate */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 bg-muted rounded-xl">
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                viewMode === 'map' 
                  ? "bg-background shadow text-foreground" 
                  : "text-muted-foreground"
              )}
            >
              <MapIcon className="h-4 w-4" />
              Kaart
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                viewMode === 'list' 
                  ? "bg-background shadow text-foreground" 
                  : "text-muted-foreground"
              )}
            >
              <List className="h-4 w-4" />
              Lijst
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {stationsLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleLocate}
              className="h-10 w-10 rounded-xl"
            >
              <Locate className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mock mode indicator */}
        {mockMode && (
          <div className="text-xs text-amber-500 text-center bg-amber-500/10 rounded-lg px-3 py-1.5">
            Demo modus - echte prijzen alleen beschikbaar in Duitsland
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        <div className="flex-1 relative min-h-0">
          <FuelStationsMapGeoJSON
            token={token}
            mapStyle={MAP_STYLES.streets}
            center={mapCenter}
            geoJSON={geoJSON}
            selectedFuelType={selectedFuelType}
            selectedStationId={selectedStation?.id || null}
            onSelectStation={handleSelectStation}
            onMapReady={() => setMapReady(true)}
            onMapRef={(map) => { mapRef.current = map; }}
            userLocation={userLocation}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* Selected Station Bottom Sheet */}
          <AnimatePresence>
            {selectedStation && (
              <motion.div 
                className="absolute bottom-20 left-4 right-4 z-10"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
              >
                <Card className="border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Fuel className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{selectedStation.name}</h3>
                          <p className="text-xs text-muted-foreground">{selectedStation.brand}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedStation(null)}
                        className="h-8 w-8 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{selectedStation.address}</span>
                      {selectedStation.distanceKm !== null && (
                        <Badge variant="secondary" className="ml-auto">
                          {selectedStation.distanceKm.toFixed(1)} km
                        </Badge>
                      )}
                    </div>

                    {/* Price Display */}
                    {selectedStation.priceLabel && (
                      <div className="mb-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground uppercase">{selectedFuelType}</span>
                          <span className="text-2xl font-bold text-primary">{selectedStation.priceLabel}</span>
                        </div>
                      </div>
                    )}

                    {/* Open Status */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge 
                        className={cn(
                          "text-xs",
                          selectedStation.isOpen 
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}
                      >
                        {selectedStation.isOpen ? 'Open' : 'Gesloten'}
                      </Badge>
                      {selectedStation.isHighway && (
                        <Badge variant="outline" className="text-xs">
                          Snelweg
                        </Badge>
                      )}
                    </div>

                    {/* Navigate Button */}
                    <Button 
                      className="w-full h-12 gap-2"
                      onClick={() => navigateToStation(selectedStation)}
                    >
                      <Navigation className="h-5 w-5" />
                      Navigeer
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 pb-24 space-y-3">
            {nearbyStations.length === 0 ? (
              <div className="text-center py-12">
                <Fuel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Geen tankstations gevonden</p>
                <Button variant="outline" onClick={() => fetchStations()} className="mt-4 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Opnieuw zoeken
                </Button>
              </div>
            ) : (
              nearbyStations.map((station, index) => (
                <motion.div
                  key={station.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card 
                    className="border-border/40 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedStation(station);
                      setViewMode('map');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Fuel className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate">{station.name}</h3>
                              {station.isOpen && (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                                  Open
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {station.distanceKm !== null 
                                ? `${station.distanceKm.toFixed(1)} km` 
                                : station.address}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {station.priceLabel && (
                            <div className="text-right">
                              <p className="font-bold text-primary text-lg">
                                {station.priceLabel}
                              </p>
                              <p className="text-[10px] text-muted-foreground uppercase">
                                {selectedFuelType}
                              </p>
                            </div>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

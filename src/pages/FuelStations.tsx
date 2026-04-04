import { useState, useEffect, useCallback, useRef } from 'react';
import type mapboxgl from 'mapbox-gl';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { useFuelStationsDE, FuelStationDE } from '@/hooks/useFuelStationsDE';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Fuel,
  Navigation,
  X,
  Heart,
  MapPin,
  Search,
  ChevronDown,
  Locate,
  List,
  Map as MapIcon,
  ArrowUpDown,
  Check,
  Droplets,
  TrendingDown,
  Wallet,
  ChevronLeft,
  Info,
  RefreshCw,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FuelStationsMapGeoJSON } from '@/components/fuel-stations/FuelStationsMapGeoJSON';
import { MapStyleSelector, getInitialMapStyle, type MapStyleId } from '@/components/fuel-stations/MapStyleSelector';
import { NavigationChooser } from '@/components/fuel-stations/NavigationChooser';
import { formatDistance } from '@/utils/fuelStationUtils';
import { hapticSelection, hapticNavigate, hapticSwitch } from '@/lib/haptics';
import { LayerMenu, type LayerVisibility } from '@/components/fuel-stations/LayerMenu';
import { TollLayer } from '@/components/fuel-stations/TollLayer';
import { ParkingLayer } from '@/components/fuel-stations/ParkingLayer';
import { TollInfoSheet } from '@/components/fuel-stations/TollInfoSheet';
import { ParkingInfoSheet } from '@/components/fuel-stations/ParkingInfoSheet';
import type { TollCountryInfo } from '@/services/toll/types';
import type { ParkingLocation } from '@/services/parking/types';

const FuelStationsMap = () => {
  const { token, loading: tokenLoading, error: tokenError } = useMapboxToken();
  const navigate = useNavigate();
  
  const {
    stations,
    geoJSON,
    loading: stationsLoading,
    error: stationsError,
    mockMode,
    mockMessage,
    userLocation,
    locationStatus,
    requestLocation,
    selectedFuelType,
    setSelectedFuelType,
    sortBy,
    setSortBy,
    radiusKm,
    setRadiusKm,
    navigateToStation,
    fetchStations,
  } = useFuelStationsDE({ autoFetch: true, refreshInterval: 90000 });

  const [selectedStation, setSelectedStation] = useState<FuelStationDE | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [mapReady, setMapReady] = useState(false);

  // Map style state
  const [mapStyleId, setMapStyleId] = useState<MapStyleId>(() => getInitialMapStyle().id);
  const [mapStyleUrl, setMapStyleUrl] = useState(() => getInitialMapStyle().url);

  // Navigation chooser state
  const [navChooserOpen, setNavChooserOpen] = useState(false);
  const [navChooserStation, setNavChooserStation] = useState<FuelStationDE | null>(null);

  // Layer visibility state (fuel enabled by default, toll/parking disabled)
  const [layers, setLayers] = useState<LayerVisibility>({
    fuel: true,
    toll: false,
    parking: false,
  });

  // Selected toll info and parking location for info sheets
  const [selectedTollInfo, setSelectedTollInfo] = useState<TollCountryInfo | null>(null);
  const [selectedParking, setSelectedParking] = useState<ParkingLocation | null>(null);

  // Map ref for layers
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const mapCenter = userLocation 
    ? { lng: userLocation.lng, lat: userLocation.lat } 
    : { lng: 6.7735, lat: 51.2277 };

  // Filter stations by search
  const filteredStations = stations.filter(station => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      station.name.toLowerCase().includes(query) ||
      station.brand.toLowerCase().includes(query) ||
      station.address.toLowerCase().includes(query)
    );
  });

  // Sort stations
  const sortedStations = [...filteredStations].sort((a, b) => {
    if (sortBy === 'price') {
      const priceA = a.priceValue ?? Infinity;
      const priceB = b.priceValue ?? Infinity;
      return priceA - priceB;
    }
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  // Get cheapest price
  const cheapestPrice = sortedStations.reduce((min, s) => {
    const price = s.priceValue;
    if (price !== null && price < min) return price;
    return min;
  }, Infinity);

  // Select station helper with haptic
  const handleSelectStation = useCallback((station: FuelStationDE) => {
    hapticSelection();
    setSelectedStation(station);
  }, []);

  // Open navigation chooser with haptic
  const handleNavigate = useCallback((station: FuelStationDE) => {
    hapticNavigate();
    setNavChooserStation(station);
    setNavChooserOpen(true);
  }, []);

  // Handle map style change with haptic
  const handleStyleChange = useCallback((styleId: MapStyleId, url: string) => {
    hapticSwitch();
    setMapStyleId(styleId);
    setMapStyleUrl(url);
  }, []);

  const fuelTypeLabels: Record<string, { short: string; full: string }> = {
    diesel: { short: 'Diesel', full: 'Diesel' },
    e10: { short: 'E10', full: 'Super E10' },
    e5: { short: 'E5', full: 'Super E5' },
  };

  const radiusOptions = [5, 10, 25];

  // Is map view active (for showing map-only UI elements)
  const isMapView = viewMode === 'map';
  const hasStations = sortedStations.length > 0;

  // Loading state
  if (tokenLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative flex items-center justify-center w-full h-full bg-primary/10 rounded-full">
              <Fuel className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground">Tankstations laden...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
        <Card className="p-8 text-center max-w-md">
          <Fuel className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Kaart niet beschikbaar</h3>
          <p className="text-muted-foreground text-sm">
            Er is een probleem met het laden van de kaart. Probeer het later opnieuw.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* ===== FIXED HEADER ===== */}
      <header 
        className="flex-shrink-0 bg-background/95 backdrop-blur-xl border-b border-border/40 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 -ml-2"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Tankstations</h1>
              {/* Demo badge - subtle info style */}
              {mockMode && (
                <p className="text-[10px] text-blue-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Demo-weergave
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Toggle - Mobile */}
            <div className="flex lg:hidden bg-muted/60 rounded-lg p-0.5">
              <Button
                size="icon"
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                onClick={() => { hapticSwitch(); setViewMode('map'); }}
                className="h-8 w-8"
              >
                <MapIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                onClick={() => { hapticSwitch(); setViewMode('list'); }}
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Map Style Selector - ONLY in map view */}
            {isMapView && (
              <MapStyleSelector
                currentStyle={mapStyleId}
                onStyleChange={handleStyleChange}
              />
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px] max-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Zoek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 text-sm"
            />
          </div>

          {/* Fuel Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 gap-1.5 whitespace-nowrap flex-shrink-0 bg-muted/50 border-0"
              >
                <Droplets className="h-3.5 w-3.5" />
                {fuelTypeLabels[selectedFuelType]?.short}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100]">
              {Object.entries(fuelTypeLabels).map(([key, labels]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => { hapticSwitch(); setSelectedFuelType(key as 'diesel' | 'e10' | 'e5'); }}
                  className="gap-2"
                >
                  {selectedFuelType === key && <Check className="h-4 w-4" />}
                  <span className={selectedFuelType !== key ? 'ml-6' : ''}>{labels.full}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Radius */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 gap-1 whitespace-nowrap flex-shrink-0 bg-muted/50 border-0"
              >
                <MapPin className="h-3.5 w-3.5" />
                {radiusKm} km
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100]">
              {radiusOptions.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => { hapticSwitch(); setRadiusKm(r); }}
                  className="gap-2"
                >
                  {radiusKm === r && <Check className="h-4 w-4" />}
                  <span className={radiusKm !== r ? 'ml-6' : ''}>{r} km</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 gap-1.5 whitespace-nowrap flex-shrink-0 bg-muted/50 border-0"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortBy === 'price' ? 'Prijs' : 'Afstand'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100]">
              <DropdownMenuItem onClick={() => { hapticSwitch(); setSortBy('distance'); }} className="gap-2">
                {sortBy === 'distance' && <Check className="h-4 w-4" />}
                <span className={sortBy !== 'distance' ? 'ml-6' : ''}>Dichtbij mij</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { hapticSwitch(); setSortBy('price'); }} className="gap-2">
                {sortBy === 'price' && <Check className="h-4 w-4" />}
                <span className={sortBy !== 'price' ? 'ml-6' : ''}>Goedkoopste eerst</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cheapest Price Badge */}
          {cheapestPrice !== Infinity && (
            <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-green-500/15 border border-green-500/30 flex-shrink-0">
              <TrendingDown className="h-3.5 w-3.5 text-green-500" />
              <span className="text-sm font-bold text-green-500 tabular-nums">
                €{cheapestPrice.toFixed(3).replace('.', ',')}
              </span>
            </div>
          )}

          {/* Station Count */}
          <Badge variant="secondary" className="h-9 px-3 flex-shrink-0 bg-muted/50 border-0">
            <Fuel className="h-3.5 w-3.5 mr-1.5" />
            {filteredStations.length}
          </Badge>
        </div>
      </header>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-[360px] border-r border-border/40 bg-background/50 z-10">
          {/* Stats Header */}
          <div className="p-4 border-b border-border/30 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Dichtbij mij</h2>
              <Badge variant="secondary" className="bg-muted/80">
                {filteredStations.length} gevonden
              </Badge>
            </div>
            
            {/* Quick Stats */}
            {cheapestPrice !== Infinity && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 mb-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Goedkoopste</span>
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                    €{cheapestPrice.toFixed(3).replace('.', ',')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-1.5 text-primary mb-1">
                    <Wallet className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Besparing*</span>
                  </div>
                  <p className="text-lg font-bold text-primary tabular-nums">
                    €{Math.max(0, (1.85 - cheapestPrice) * 50).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            )}

            {/* Demo Mode Notice - subtle info style */}
            {mockMode && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {mockMessage || 'Demo-weergave actief — voorbeeld tankstations worden getoond'}
                </p>
              </div>
            )}

            {/* Error Notice */}
            {stationsError && !mockMode && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Info className="h-4 w-4 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Prijzen tijdelijk niet beschikbaar
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2 text-xs"
                  onClick={() => fetchStations(true)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Opnieuw
                </Button>
              </div>
            )}
          </div>

          {/* Station List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {stationsLoading && stations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30 animate-pulse" />
                  <p className="text-sm">Tankstations laden...</p>
                </div>
              ) : sortedStations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Geen tankstations in bereik</p>
                  <p className="text-xs mt-1 mb-4">Er zijn geen stations binnen {radiusKm} km.</p>
                  <Button variant="outline" size="sm" onClick={() => setRadiusKm(25)} className="gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Zoek in 25 km
                  </Button>
                </div>
              ) : (
                sortedStations.slice(0, 50).map((station, index) => (
                  <div
                    key={station.id}
                  >
                    <StationListItem
                      station={station}
                      isSelected={selectedStation?.id === station.id}
                      cheapestPrice={cheapestPrice !== Infinity ? cheapestPrice : undefined}
                      onSelect={() => handleSelectStation(station)}
                      onNavigate={() => handleNavigate(station)}
                    />
                  </div>
                ))
              )}
            </div>
            <p className="px-3 pb-4 text-[10px] text-muted-foreground">
              * Geschatte besparing o.b.v. 50L tank vs. gemiddeld. Bron: MTS-K / Tankerkoenig (CC BY 4.0)
            </p>
          </ScrollArea>
        </aside>

        {/* ===== MAP CONTAINER ===== */}
        <div className="flex-1 min-h-0 min-w-0 relative">
          {/* Map - Full Size */}
          <FuelStationsMapGeoJSON
            token={token ?? ''}
            mapStyle={mapStyleUrl}
            center={mapCenter}
            geoJSON={layers.fuel ? geoJSON : null}
            selectedFuelType={selectedFuelType}
            selectedStationId={selectedStation?.id ?? null}
            userLocation={userLocation ? { lng: userLocation.lng, lat: userLocation.lat } : null}
            onSelectStation={(stationId) => {
              const station = stations.find((s) => s.id === stationId);
              if (station) handleSelectStation(station);
            }}
            onMapReady={() => setMapReady(true)}
            onMapRef={(map) => { mapRef.current = map; }}
            className={cn(
              "absolute inset-0 w-full h-full",
              viewMode === 'list' && "hidden lg:block"
            )}
          />

          {/* Toll & Parking Layers */}
          <TollLayer 
            map={mapRef.current} 
            visible={layers.toll} 
            onTollZoneClick={(info) => setSelectedTollInfo(info)}
          />
          <ParkingLayer 
            map={mapRef.current} 
            visible={layers.parking}
            userLocation={userLocation}
            onParkingClick={(loc) => setSelectedParking(loc)}
          />

          {/* ===== MAP-ONLY UI ELEMENTS ===== */}
          {/* These are ONLY rendered in map view and REMOVED from DOM in list view */}
          {isMapView && (
            <>
              {/* Price Legend - Bottom Left - positioned over Mapbox logo */}
              {hasStations && (
                <div 
                  className="absolute left-0 z-30 pointer-events-none"
                  style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0px)' }}
                >
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-tr-xl bg-background/95 backdrop-blur-lg border-t border-r border-border/40 shadow-lg">
                    <span className="text-xs font-semibold text-foreground">Prijs</span>
                    <div className="h-3 w-px bg-border/50" />
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <span className="text-[11px] text-muted-foreground">Laag</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <span className="text-[11px] text-muted-foreground">Midden</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span className="text-[11px] text-muted-foreground">Hoog</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Permission Banner */}
              {locationStatus === 'denied' && (
                <div
                  className="absolute left-3 right-3 lg:left-auto lg:right-3 lg:max-w-sm z-30"
                  style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 60px)' }}
                >
                  <Card className="bg-amber-500/10 border-amber-500/30 backdrop-blur-lg shadow-xl">
                    <div className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Locate className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Locatie niet beschikbaar</p>
                        <p className="text-xs text-muted-foreground">
                          Sta locatietoegang toe voor stations dichtbij mij.
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={requestLocation}
                        className="bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 text-xs font-semibold"
                      >
                        Toestaan
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Layer Menu - Bottom Right above geolocate */}
              <div 
                className="absolute right-3 z-30"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)' }}
              >
                <LayerMenu
                  layers={layers}
                  onLayersChange={setLayers}
                />
              </div>
            </>
          )}

          {/* Mobile List View */}
          {viewMode === 'list' && (
            <div 
              className="absolute inset-0 bg-background z-20 lg:hidden overflow-y-auto overscroll-contain"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
              }}
            >
              {/* Demo Mode Notice - Mobile - subtle */}
              {mockMode && (
                <div className="mx-3 mt-3 flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {mockMessage || 'Demo-weergave actief — voorbeeld tankstations worden getoond'}
                  </p>
                </div>
              )}

              <div className="p-3 space-y-2">
                {stationsLoading && stations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30 animate-pulse" />
                    <p className="text-sm">Tankstations laden...</p>
                  </div>
                ) : sortedStations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Fuel className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Geen tankstations in bereik</p>
                    <p className="text-xs mt-1 mb-4">Er zijn geen stations binnen {radiusKm} km.</p>
                    <Button variant="outline" size="sm" onClick={() => setRadiusKm(25)} className="gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Zoek in 25 km
                    </Button>
                  </div>
                ) : (
                  sortedStations.slice(0, 50).map(station => (
                    <StationListItem
                      key={station.id}
                      station={station}
                      isSelected={selectedStation?.id === station.id}
                      cheapestPrice={cheapestPrice !== Infinity ? cheapestPrice : undefined}
                      onSelect={() => handleSelectStation(station)}
                      onNavigate={() => handleNavigate(station)}
                    />
                  ))
                )}
              </div>
              <p className="px-3 pb-4 text-[10px] text-muted-foreground text-center">
                Bron: MTS-K / Tankerkoenig (CC BY 4.0)
              </p>
            </div>
          )}

          {/* ===== SELECTED STATION BOTTOM SHEET ===== */}
            {selectedStation && (
              <div
                className="absolute bottom-0 left-0 right-0 z-40 lg:left-auto lg:right-4 lg:bottom-4 lg:w-[380px]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                <StationBottomSheet
                  station={selectedStation}
                  cheapestPrice={cheapestPrice !== Infinity ? cheapestPrice : undefined}
                  onClose={() => setSelectedStation(null)}
                  onNavigate={() => handleNavigate(selectedStation)}
                />
              </div>
            )}
        </div>
      </div>

      {/* Navigation Chooser Modal */}
      <NavigationChooser
        isOpen={navChooserOpen}
        onClose={() => setNavChooserOpen(false)}
        stationName={navChooserStation?.name ?? ''}
        onNavigate={(app) => {
          hapticNavigate();
          if (navChooserStation) {
            navigateToStation(navChooserStation, app);
          }
        }}
      />

      {/* Toll Info Sheet */}
      <TollInfoSheet
        tollInfo={selectedTollInfo}
        open={!!selectedTollInfo}
        onOpenChange={(open) => { if (!open) setSelectedTollInfo(null); }}
      />

      {/* Parking Info Sheet */}
      <ParkingInfoSheet
        location={selectedParking}
        open={!!selectedParking}
        onOpenChange={(open) => { if (!open) setSelectedParking(null); }}
      />
    </div>
  );
};

// ===== STATION LIST ITEM =====
const StationListItem = ({
  station,
  isSelected,
  cheapestPrice,
  onSelect,
  onNavigate,
}: {
  station: FuelStationDE;
  isSelected?: boolean;
  cheapestPrice?: number;
  onSelect: () => void;
  onNavigate: () => void;
}) => {
  const price = station.priceValue;
  const isCheapest = price !== null && cheapestPrice !== undefined && price <= cheapestPrice;

  return (
    <button
      className={cn(
        "w-full text-left p-3 rounded-xl bg-card border transition-all duration-75 touch-manipulation",
        isSelected 
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" 
          : "border-border/40 hover:border-border/60 active:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-bold text-base truncate">{station.brand}</span>
            {isCheapest && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-semibold">
                Goedkoopst
              </span>
            )}
            {station.isHighway && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                <Route className="h-2.5 w-2.5" />
                Snelweg
              </span>
            )}
            {!station.isOpen && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                Gesloten
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {station.address}
          </p>
          {station.distanceKm !== null && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatDistance(station.distanceKm)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {price !== null ? (
            <div className="text-right">
              <p className={cn(
                "text-lg font-bold tabular-nums",
                isCheapest ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}>
                {station.priceLabel}
              </p>
              <p className="text-[10px] text-muted-foreground">per liter</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Prijs onbekend</p>
            </div>
          )}
          <Button 
            size="sm" 
            className="h-9 w-9 p-0 flex-shrink-0 bg-primary hover:bg-primary/90 active:scale-95" 
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </button>
  );
};

// ===== BOTTOM SHEET =====
const StationBottomSheet = ({
  station,
  cheapestPrice,
  onClose,
  onNavigate,
}: {
  station: FuelStationDE;
  cheapestPrice?: number;
  onClose: () => void;
  onNavigate: () => void;
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const price = station.priceValue;
  const isCheapest = price !== null && cheapestPrice !== undefined && price <= cheapestPrice;

  return (
    <Card className="rounded-t-2xl lg:rounded-2xl border-b-0 lg:border-b shadow-2xl bg-card/98 backdrop-blur-xl overflow-hidden">
      {/* Grabber */}
      <div className="flex justify-center pt-3 pb-1 lg:hidden">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
      </div>

      {/* Close Button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8 rounded-full z-10"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Content */}
      <div 
        className="px-4 pb-4 lg:pb-4 space-y-3 max-h-[65vh] lg:max-h-[500px] overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <div className="pr-8">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{station.brand}</h2>
            {station.isHighway && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                <Route className="h-2.5 w-2.5" />
                Snelwegstation
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {station.distanceKm !== null && (
              <span className="font-medium text-foreground">
                {formatDistance(station.distanceKm)}
              </span>
            )}
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate">{station.address}</span>
          </p>
        </div>

        {/* Main Price Card */}
        {station.priceValue !== null ? (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl border",
            isCheapest 
              ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
              : "bg-muted/30 border-border/30"
          )}>
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground uppercase font-medium tracking-wide">
                {station.prices.diesel !== null ? 'Diesel' : station.prices.e10 !== null ? 'Super E10' : 'Super E5'}
              </p>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  "text-2xl font-bold tabular-nums",
                  isCheapest ? "text-green-600 dark:text-green-400" : "text-foreground"
                )}>
                  {station.priceLabel}
                </span>
                <span className="text-muted-foreground text-xs">/ liter</span>
              </div>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isCheapest ? "bg-green-500/20" : "bg-muted"
            )}>
              <Fuel className={cn(
                "h-6 w-6",
                isCheapest ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30 border-border/30">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Prijs onbekend</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            station.isOpen 
              ? "bg-green-500/15 text-green-600 dark:text-green-400" 
              : "bg-muted text-muted-foreground"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              station.isOpen ? "bg-green-500" : "bg-muted-foreground"
            )} />
            {station.isOpen ? 'Nu open' : 'Gesloten'}
          </div>
        </div>

        {/* All Prices - 3 decimals, single € */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { key: 'diesel', label: 'Diesel', value: station.prices.diesel },
            { key: 'e10', label: 'E10', value: station.prices.e10 },
            { key: 'e5', label: 'E5', value: station.prices.e5 },
          ].map(({ key, label, value }) => (
            value !== null && (
              <div
                key={key}
                className="p-2 rounded-lg text-center border bg-muted/30 border-transparent"
              >
                <p className="text-[10px] text-muted-foreground uppercase font-medium">
                  {label}
                </p>
                <p className="font-bold text-sm tabular-nums text-foreground">
                  €{value.toFixed(3).replace('.', ',')}
                </p>
              </div>
            )
          ))}
        </div>

        {/* Last Updated + Attribution */}
        <p className="text-[11px] text-muted-foreground/70">
          Bijgewerkt {formatDistanceToNow(new Date(station.lastUpdated), { addSuffix: true, locale: nl })}
          <span className="mx-1">·</span>
          {station.attribution}
        </p>
      </div>

      {/* Sticky CTA */}
      <div 
        className="flex gap-2 p-4 pt-3 border-t border-border/30 bg-card"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
      >
        <Button 
          variant="outline" 
          size="lg" 
          className={cn(
            "h-12 w-12 p-0 rounded-xl transition-all flex-shrink-0 active:scale-95",
            isFavorite && "bg-red-500/10 border-red-500/30 text-red-500"
          )}
          onClick={() => { hapticSelection(); setIsFavorite(!isFavorite); }}
        >
          <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
        </Button>
        <Button 
          size="lg" 
          className="flex-1 text-base font-bold h-12 rounded-xl gap-2 active:scale-[0.98]" 
          onClick={onNavigate}
        >
          <Navigation className="h-5 w-5" />
          Navigeren
        </Button>
      </div>
    </Card>
  );
};

export default FuelStationsMap;

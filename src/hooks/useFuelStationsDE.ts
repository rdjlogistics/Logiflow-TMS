import { useState, useEffect, useCallback, useRef } from 'react';
import { edgeFunctionUrl, backendAnonKey } from '@/lib/backendConfig';

export interface FuelStationDE {
  id: string;
  name: string;
  brand: string;
  address: string;
  latitude: number;
  longitude: number;
  isOpen: boolean;
  distanceKm: number | null;
  prices: {
    diesel: number | null;
    e10: number | null;
    e5: number | null;
    lpg: number | null;
  };
  priceValue: number | null;
  priceLabel: string | null;
  priceTier: 'cheap' | 'medium' | 'expensive' | 'unknown';
  isHighway: boolean;
  lastUpdated: string;
  source: string;
  attribution: string;
}

export interface FuelStationsGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: FuelStationDE;
  }>;
}

type FuelTypeDE = 'diesel' | 'e10' | 'e5';
type SortBy = 'price' | 'distance';
type NavApp = 'google' | 'apple' | 'waze';

interface UseFuelStationsDEOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
}

// Highway detection
const HIGHWAY_KEYWORDS = ['autobahn', 'raststätte', 'rasthof', 'autohof', 'highway', 'motorway'];

function isHighwayStation(brand: string, name: string, address: string): boolean {
  const searchText = `${brand} ${name} ${address}`.toLowerCase();
  return HIGHWAY_KEYWORDS.some(k => searchText.includes(k));
}

// Production-safe logging
const isDev = import.meta.env.DEV;
function devLog(...args: any[]) {
  if (isDev) console.log('[useFuelStationsDE]', ...args);
}

export function useFuelStationsDE(options: UseFuelStationsDEOptions = {}) {
  const { autoFetch = true, refreshInterval = 90000 } = options;

  // Data state
  const [stations, setStations] = useState<FuelStationDE[]>([]);
  const [geoJSON, setGeoJSON] = useState<FuelStationsGeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [mockMessage, setMockMessage] = useState<string | null>(null);

  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');

  // Filter state
  const [selectedFuelType, setSelectedFuelType] = useState<FuelTypeDE>('diesel');
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [radiusKm, setRadiusKm] = useState(10);

  // Refs for cleanup and deduplication
  const lastFetchParams = useRef<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  // Track page visibility
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Request user location
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unavailable');
      // Default to Düsseldorf (works globally with demo mode)
      setUserLocation({ lat: 51.2277, lng: 6.7735 });
      return;
    }

    setLocationStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setLocationStatus('granted');
        devLog('Location granted:', loc);
      },
      (err) => {
        devLog('Geolocation error:', err.message);
        setLocationStatus('denied');
        // Default location - demo will still work
        setUserLocation({ lat: 51.2277, lng: 6.7735 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // Fetch stations from edge function
  const fetchStations = useCallback(async (forceRefresh = false) => {
    if (!userLocation) return;

    const params = `${userLocation.lat.toFixed(3)}_${userLocation.lng.toFixed(3)}_${radiusKm}_${selectedFuelType}_${sortBy}`;
    
    // Skip if same params and not forced
    if (!forceRefresh && lastFetchParams.current === params && stations.length > 0) {
      return;
    }

    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    if (!forceRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const endpoint = sortBy === 'distance' ? 'nearest' : '';
      const queryParams = new URLSearchParams({
        lat: userLocation.lat.toString(),
        lon: userLocation.lng.toString(),
        rad: radiusKm.toString(),
        fuelType: selectedFuelType,
        sort: sortBy === 'distance' ? 'dist' : 'price',
        limit: '100',
      });

      const baseUrl = edgeFunctionUrl('fuel-stations-de');
      const url = endpoint ? `${baseUrl}/${endpoint}?${queryParams}` : `${baseUrl}?${queryParams}`;
      
      devLog('Fetching:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': backendAnonKey,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'Unknown error');
      }

      lastFetchParams.current = params;
      setMockMode(result.mockMode ?? false);
      setMockMessage(result.message ?? null);

      devLog(result.mockMode ? '⚠️ DEMO MODE' : '✓ LIVE DATA', `- ${result.data?.features?.length || 0} stations`);

      const geo = result.data as FuelStationsGeoJSON;
      
      // Enhance with highway detection
      const enhancedFeatures = geo.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          isHighway: f.properties.isHighway || isHighwayStation(
            f.properties.brand, 
            f.properties.name, 
            f.properties.address
          ),
        },
      }));

      const enhancedGeo: FuelStationsGeoJSON = {
        ...geo,
        features: enhancedFeatures,
      };

      setGeoJSON(enhancedGeo);

      // Convert to flat array for list display
      const stationList: FuelStationDE[] = enhancedFeatures.map(f => ({
        ...f.properties,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }));

      setStations(stationList);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      devLog('Fetch error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation, radiusKm, selectedFuelType, sortBy, stations.length]);

  // Refresh prices only (lightweight)
  const refreshPrices = useCallback(async () => {
    if (isRefreshingRef.current || !isVisibleRef.current || stations.length === 0) {
      return;
    }

    isRefreshingRef.current = true;
    const ids = stations.slice(0, 50).map(s => s.id);
    
    try {
      const baseUrl = edgeFunctionUrl('fuel-stations-de/prices');
      const url = `${baseUrl}?ids=${ids.join(',')}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': backendAnonKey,
        },
      });

      if (!response.ok) return;

      const result = await response.json();
      if (!result.ok || !result.prices) return;

      // Update stations with new prices
      setStations(prev => prev.map(station => {
        const newPrices = result.prices[station.id];
        if (!newPrices) return station;

        const priceValue = newPrices[selectedFuelType] ?? station.priceValue;
        return {
          ...station,
          prices: {
            diesel: newPrices.diesel ?? station.prices.diesel,
            e10: newPrices.e10 ?? station.prices.e10,
            e5: newPrices.e5 ?? station.prices.e5,
            lpg: station.prices.lpg,
          },
          priceValue,
          priceLabel: priceValue != null ? `€${priceValue.toFixed(3).replace('.', ',')}` : null,
          lastUpdated: result.lastUpdated,
          isOpen: newPrices.status === 'open',
        };
      }));

      // Update GeoJSON too
      setGeoJSON(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          features: prev.features.map(f => {
            const newPrices = result.prices[f.properties.id];
            if (!newPrices) return f;

            const priceValue = newPrices[selectedFuelType] ?? f.properties.priceValue;
            return {
              ...f,
              properties: {
                ...f.properties,
                prices: {
                  diesel: newPrices.diesel ?? f.properties.prices.diesel,
                  e10: newPrices.e10 ?? f.properties.prices.e10,
                  e5: newPrices.e5 ?? f.properties.prices.e5,
                  lpg: f.properties.prices.lpg,
                },
                priceValue,
                priceLabel: priceValue != null ? `€${priceValue.toFixed(3).replace('.', ',')}` : null,
                lastUpdated: result.lastUpdated,
                isOpen: newPrices.status === 'open',
              },
            };
          }),
        };
      });

      devLog('Prices refreshed for', ids.length, 'stations');
    } catch (err: any) {
      devLog('Price refresh error:', err.message);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [stations, selectedFuelType]);

  // Initialize location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Fetch stations when location or params change
  useEffect(() => {
    if (autoFetch && userLocation) {
      fetchStations();
    }
  }, [autoFetch, userLocation, radiusKm, selectedFuelType, sortBy, fetchStations]);

  // Live price refresh interval
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    if (stations.length > 0 && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(refreshPrices, refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [stations.length, refreshInterval, refreshPrices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ========== Utility functions ==========

  const getSortedStations = useCallback(() => {
    const sorted = [...stations];
    if (sortBy === 'price') {
      sorted.sort((a, b) => (a.priceValue ?? Infinity) - (b.priceValue ?? Infinity));
    } else {
      sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return sorted;
  }, [stations, sortBy]);

  const getNearbyStations = useCallback((limit = 10) => {
    return [...stations]
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, limit);
  }, [stations]);

  const getCheapestStations = useCallback((limit = 10) => {
    return [...stations]
      .filter(s => s.priceValue != null)
      .sort((a, b) => (a.priceValue ?? Infinity) - (b.priceValue ?? Infinity))
      .slice(0, limit);
  }, [stations]);

  const getNavigationUrl = useCallback((station: FuelStationDE, app: NavApp = 'google') => {
    const { latitude, longitude, name } = station;
    const label = encodeURIComponent(name);

    switch (app) {
      case 'apple':
        return `maps://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`;
      case 'waze':
        return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
      case 'google':
      default:
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }
  }, []);

  const navigateToStation = useCallback((station: FuelStationDE, app: NavApp = 'google') => {
    const url = getNavigationUrl(station, app);
    window.open(url, '_blank');
  }, [getNavigationUrl]);

  return {
    // Data
    stations,
    geoJSON,
    loading,
    error,
    mockMode,
    mockMessage,

    // Location
    userLocation,
    locationStatus,
    requestLocation,

    // Filters
    selectedFuelType,
    setSelectedFuelType,
    sortBy,
    setSortBy,
    radiusKm,
    setRadiusKm,

    // Actions
    fetchStations,
    refreshPrices,
    getSortedStations,
    getNearbyStations,
    getCheapestStations,
    navigateToStation,
    getNavigationUrl,
  };
}

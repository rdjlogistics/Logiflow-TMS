import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchRealFuelStations, RealFuelStation } from '@/utils/fuelStationsAPI';
import { logger } from '@/lib/logger';

export interface FuelStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  prices: {
    diesel: number | null;
    euro95: number | null;
    euro98: number | null;
    lpg: number | null;
  };
  isOpen: boolean;
  openingHours: string;
  facilities: string[];
  lastUpdated: string;
  distance?: number;
}

// Generate simulated prices for real stations (since OSM doesn't have price data)
// In production, you'd integrate with a real price API like TankerKönig
function generatePricesForStation(brand: string): FuelStation['prices'] {
  // Brand-based price variation (some brands are typically cheaper/more expensive)
  const brandModifiers: Record<string, number> = {
    'tango': -0.08,
    'tinq': -0.06,
    'argos': -0.05,
    'avia': -0.03,
    'gulf': 0.02,
    'shell': 0.04,
    'bp': 0.03,
    'esso': 0.02,
    'texaco': 0.01,
    'total': 0.02,
    'q8': 0.01,
  };
  
  const brandKey = brand.toLowerCase().replace(/[^a-z]/g, '');
  const modifier = brandModifiers[brandKey] || 0;
  
  // Base NL prices with slight random variation
  const baseDiesel = 1.689 + modifier + (Math.random() - 0.5) * 0.12;
  const baseEuro95 = 2.049 + modifier + (Math.random() - 0.5) * 0.10;
  
  return {
    diesel: Math.round(baseDiesel * 1000) / 1000,
    euro95: Math.round(baseEuro95 * 1000) / 1000,
    euro98: Math.round((baseEuro95 + 0.08 + Math.random() * 0.04) * 1000) / 1000,
    lpg: Math.random() > 0.6 ? Math.round((0.85 + Math.random() * 0.12) * 1000) / 1000 : null,
  };
}

// Convert real OSM station to our FuelStation format
function convertToFuelStation(real: RealFuelStation): FuelStation {
  return {
    id: real.id,
    name: real.name,
    brand: real.brand,
    address: real.address || 'Adres onbekend',
    city: real.city || '',
    country: real.country || 'NL',
    latitude: real.latitude,
    longitude: real.longitude,
    prices: generatePricesForStation(real.brand),
    isOpen: true, // Would need real-time data
    openingHours: real.openingHours || '24/7',
    facilities: real.facilities,
    lastUpdated: new Date().toISOString(),
  };
}

// Removed: generateMockStations — no longer needed

// Calculate distance between two points using Haversine formula
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function useFuelStations() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
  const [selectedFuelType, setSelectedFuelType] = useState<'diesel' | 'euro95' | 'euro98' | 'lpg'>('diesel');
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('distance');
  
  // Track if we've already fetched for this location
  const lastFetchedLocation = useRef<string | null>(null);

  // Request user location
  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unavailable');
      // Default to Netherlands center
      setUserLocation({ lat: 52.1326, lng: 5.2913 });
      return;
    }

    setLocationStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('granted');
      },
      (error) => {
        logger.log('Geolocation error:', error.message);
        setLocationStatus('denied');
        // Default to Netherlands center if location not available
        setUserLocation({ lat: 52.1326, lng: 5.2913 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  }, []);

  // Get user location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // No mock fallback — return empty if API fails

  // Load REAL stations from OpenStreetMap
  useEffect(() => {
    const loadStations = async () => {
      const centerLat = userLocation?.lat ?? 52.1326;
      const centerLng = userLocation?.lng ?? 5.2913;
      
      // Create location key to prevent duplicate fetches
      const locationKey = `${centerLat.toFixed(2)}_${centerLng.toFixed(2)}`;
      if (lastFetchedLocation.current === locationKey && stations.length > 0) {
        return; // Already fetched for this location
      }
      
      setLoading(true);
      lastFetchedLocation.current = locationKey;
      
      try {
        // Fetch real stations from OpenStreetMap (responsive radius)
        const realStations = await fetchRealFuelStations(centerLat, centerLng, 30);
        
        if (realStations.length > 0) {
          const convertedStations = realStations.map(convertToFuelStation);
          logger.log(`[useFuelStations] Loaded ${convertedStations.length} real stations from OpenStreetMap`);
          setStations(convertedStations);
        } else {
          logger.log('[useFuelStations] No real stations found');
          setStations([]);
        }
      } catch (error) {
        logger.error('[useFuelStations] Error loading stations:', error);
        setStations([]);
      }
      
      setLoading(false);
    };

    loadStations();
  }, [userLocation, generateLocalMockStations]);

  // Add distance to stations and sort
  const stationsWithDistance = stations.map(station => ({
    ...station,
    distance: userLocation
      ? calculateDistance(
          userLocation.lat,
          userLocation.lng,
          station.latitude,
          station.longitude
        )
      : undefined,
  }));

  // Get sorted and filtered stations
  const getSortedStations = useCallback(() => {
    let sorted = [...stationsWithDistance];
    
    if (sortBy === 'price') {
      sorted.sort((a, b) => {
        const priceA = a.prices[selectedFuelType] ?? Infinity;
        const priceB = b.prices[selectedFuelType] ?? Infinity;
        return priceA - priceB;
      });
    } else {
      sorted.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }
    
    return sorted;
  }, [stationsWithDistance, sortBy, selectedFuelType]);

  // Get nearby stations (within radius, or fallback to closest if none found)
  const getNearbyStations = useCallback(
    (radiusKm: number = 50, minResults: number = 10) => {
      // If no user location, return first N stations (sorted by price or just first available)
      if (!userLocation) {
        return stationsWithDistance.slice(0, minResults);
      }

      // First, get stations within radius
      const withinRadius = stationsWithDistance
        .filter(s => s.distance !== undefined && s.distance <= radiusKm)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

      // If we have enough stations within radius, return them
      if (withinRadius.length >= minResults) {
        return withinRadius;
      }

      // Otherwise, return the closest stations regardless of distance
      const allSorted = [...stationsWithDistance]
        .filter(s => s.distance !== undefined)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

      // Return at least minResults stations (or all if less available)
      return allSorted.slice(0, Math.max(minResults, withinRadius.length));
    },
    [stationsWithDistance, userLocation]
  );

  // Get cheapest stations
  const getCheapestStations = useCallback(
    (limit: number = 10) => {
      return [...stationsWithDistance]
        .filter(s => s.prices[selectedFuelType] !== null)
        .sort((a, b) => {
          const priceA = a.prices[selectedFuelType] ?? Infinity;
          const priceB = b.prices[selectedFuelType] ?? Infinity;
          return priceA - priceB;
        })
        .slice(0, limit);
    },
    [stationsWithDistance, selectedFuelType]
  );

  // Navigate to station
  const navigateToStation = useCallback((station: FuelStation) => {
    const destination = `${station.latitude},${station.longitude}`;
    const label = encodeURIComponent(station.name);
    
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Open in Apple Maps
      window.open(`maps://maps.google.com/maps?daddr=${destination}&amp;ll=`, '_blank');
    } else {
      // Open in Google Maps
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${label}`,
        '_blank'
      );
    }
  }, []);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStations(prev => 
        prev.map(station => {
          // 5% chance of price update per station
          if (Math.random() > 0.95) {
            const change = (Math.random() - 0.5) * 0.02;
            return {
              ...station,
              prices: {
                ...station.prices,
                diesel: station.prices.diesel 
                  ? Math.round((station.prices.diesel + change) * 1000) / 1000 
                  : null,
                euro95: station.prices.euro95 
                  ? Math.round((station.prices.euro95 + change) * 1000) / 1000 
                  : null,
              },
              lastUpdated: new Date().toISOString(),
            };
          }
          return station;
        })
      );
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    stations: stationsWithDistance,
    loading,
    userLocation,
    locationStatus,
    requestLocation,
    selectedFuelType,
    setSelectedFuelType,
    sortBy,
    setSortBy,
    getSortedStations,
    getNearbyStations,
    getCheapestStations,
    navigateToStation,
  };
}
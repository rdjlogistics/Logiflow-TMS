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

const generateMockStations = (): FuelStation[] => {
  const brands = ['Shell', 'BP', 'Esso', 'Total', 'TinQ', 'Texaco', 'Gulf', 'Q8', 'Tango', 'Avia'];
  const facilities = ['Shop', 'Toilet', 'Wasstraat', 'AdBlue', 'Truckparking', 'Restaurant'];
  
  // Extended European locations for broader coverage
  const locations = [
    // Netherlands - more cities
    { city: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
    { city: 'Rotterdam', country: 'NL', lat: 51.9244, lng: 4.4777 },
    { city: 'Utrecht', country: 'NL', lat: 52.0907, lng: 5.1214 },
    { city: 'Eindhoven', country: 'NL', lat: 51.4416, lng: 5.4697 },
    { city: 'Den Haag', country: 'NL', lat: 52.0705, lng: 4.3007 },
    { city: 'Groningen', country: 'NL', lat: 53.2194, lng: 6.5665 },
    { city: 'Tilburg', country: 'NL', lat: 51.5555, lng: 5.0913 },
    { city: 'Breda', country: 'NL', lat: 51.5719, lng: 4.7683 },
    { city: 'Nijmegen', country: 'NL', lat: 51.8426, lng: 5.8546 },
    { city: 'Arnhem', country: 'NL', lat: 51.9851, lng: 5.8987 },
    { city: 'Maastricht', country: 'NL', lat: 50.8514, lng: 5.6910 },
    { city: 'Zwolle', country: 'NL', lat: 52.5168, lng: 6.0830 },
    { city: 'Leiden', country: 'NL', lat: 52.1601, lng: 4.4970 },
    { city: 'Dordrecht', country: 'NL', lat: 51.8133, lng: 4.6901 },
    { city: 'Haarlem', country: 'NL', lat: 52.3874, lng: 4.6462 },
    // Belgium
    { city: 'Brussel', country: 'BE', lat: 50.8503, lng: 4.3517 },
    { city: 'Antwerpen', country: 'BE', lat: 51.2213, lng: 4.4051 },
    { city: 'Gent', country: 'BE', lat: 51.0543, lng: 3.7174 },
    { city: 'Luik', country: 'BE', lat: 50.6326, lng: 5.5797 },
    { city: 'Brugge', country: 'BE', lat: 51.2093, lng: 3.2247 },
    // Germany
    { city: 'Düsseldorf', country: 'DE', lat: 51.2277, lng: 6.7735 },
    { city: 'Köln', country: 'DE', lat: 50.9375, lng: 6.9603 },
    { city: 'Hamburg', country: 'DE', lat: 53.5511, lng: 9.9937 },
    { city: 'Berlin', country: 'DE', lat: 52.5200, lng: 13.4050 },
    { city: 'München', country: 'DE', lat: 48.1351, lng: 11.5820 },
    { city: 'Frankfurt', country: 'DE', lat: 50.1109, lng: 8.6821 },
    { city: 'Essen', country: 'DE', lat: 51.4556, lng: 7.0116 },
    { city: 'Dortmund', country: 'DE', lat: 51.5136, lng: 7.4653 },
    { city: 'Bremen', country: 'DE', lat: 53.0793, lng: 8.8017 },
    { city: 'Hannover', country: 'DE', lat: 52.3759, lng: 9.7320 },
    // France
    { city: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
    { city: 'Lyon', country: 'FR', lat: 45.7640, lng: 4.8357 },
    { city: 'Marseille', country: 'FR', lat: 43.2965, lng: 5.3698 },
    { city: 'Lille', country: 'FR', lat: 50.6292, lng: 3.0573 },
    { city: 'Bordeaux', country: 'FR', lat: 44.8378, lng: -0.5792 },
    { city: 'Toulouse', country: 'FR', lat: 43.6047, lng: 1.4442 },
    // UK
    { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
    { city: 'Birmingham', country: 'UK', lat: 52.4862, lng: -1.8904 },
    { city: 'Manchester', country: 'UK', lat: 53.4808, lng: -2.2426 },
    { city: 'Leeds', country: 'UK', lat: 53.8008, lng: -1.5491 },
    { city: 'Liverpool', country: 'UK', lat: 53.4084, lng: -2.9916 },
    { city: 'Glasgow', country: 'UK', lat: 55.8642, lng: -4.2518 },
    { city: 'Edinburgh', country: 'UK', lat: 55.9533, lng: -3.1883 },
    { city: 'Bristol', country: 'UK', lat: 51.4545, lng: -2.5879 },
    { city: 'Sheffield', country: 'UK', lat: 53.3811, lng: -1.4701 },
    { city: 'Newcastle', country: 'UK', lat: 54.9783, lng: -1.6178 },
    // Spain
    { city: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
    { city: 'Barcelona', country: 'ES', lat: 41.3851, lng: 2.1734 },
    { city: 'Valencia', country: 'ES', lat: 39.4699, lng: -0.3763 },
    // Italy
    { city: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964 },
    { city: 'Milan', country: 'IT', lat: 45.4642, lng: 9.1900 },
    { city: 'Naples', country: 'IT', lat: 40.8518, lng: 14.2681 },
    // Poland
    { city: 'Warsaw', country: 'PL', lat: 52.2297, lng: 21.0122 },
    { city: 'Krakow', country: 'PL', lat: 50.0647, lng: 19.9450 },
    // Austria
    { city: 'Vienna', country: 'AT', lat: 48.2082, lng: 16.3738 },
    // Switzerland
    { city: 'Zurich', country: 'CH', lat: 47.3769, lng: 8.5417 },
    { city: 'Geneva', country: 'CH', lat: 46.2044, lng: 6.1432 },
    // Czech Republic
    { city: 'Prague', country: 'CZ', lat: 50.0755, lng: 14.4378 },
    // Denmark
    { city: 'Copenhagen', country: 'DK', lat: 55.6761, lng: 12.5683 },
    // Portugal
    { city: 'Lisbon', country: 'PT', lat: 38.7223, lng: -9.1393 },
  ];

  const stations: FuelStation[] = [];
  let idCounter = 1;

  // Generate multiple stations per city
  locations.forEach(location => {
    const stationsPerCity = 5 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < stationsPerCity; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      // Larger spread for more natural distribution
      const latOffset = (Math.random() - 0.5) * 0.25;
      const lngOffset = (Math.random() - 0.5) * 0.25;
      
      // Country-specific base prices
      const basePrices: Record<string, { diesel: number; euro95: number }> = {
        'NL': { diesel: 1.65, euro95: 2.05 },
        'BE': { diesel: 1.72, euro95: 1.78 },
        'DE': { diesel: 1.58, euro95: 1.72 },
        'FR': { diesel: 1.68, euro95: 1.85 },
        'UK': { diesel: 1.45, euro95: 1.42 },
        'ES': { diesel: 1.52, euro95: 1.58 },
        'IT': { diesel: 1.75, euro95: 1.82 },
        'PL': { diesel: 1.42, euro95: 1.52 },
        'AT': { diesel: 1.55, euro95: 1.65 },
        'CH': { diesel: 1.85, euro95: 1.95 },
        'CZ': { diesel: 1.40, euro95: 1.50 },
        'DK': { diesel: 1.70, euro95: 1.80 },
        'PT': { diesel: 1.60, euro95: 1.70 },
      };
      
      const countryPrices = basePrices[location.country] || { diesel: 1.60, euro95: 1.75 };
      
      // Add variation to prices
      const dieselPrice = countryPrices.diesel + (Math.random() - 0.5) * 0.18;
      const euro95Price = countryPrices.euro95 + (Math.random() - 0.5) * 0.15;
      
      const stationFacilities = facilities
        .filter(() => Math.random() > 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 3));
      
      const streetNames = ['Hoofdweg', 'Industrieweg', 'Rijksweg', 'Europaweg', 'Randweg', 'Snelweg', 'Stationsweg'];
      const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
      
      stations.push({
        id: `station-${idCounter++}`,
        name: `${brand} ${location.city} ${i + 1}`,
        brand,
        address: `${streetName} ${Math.floor(Math.random() * 200) + 1}`,
        city: location.city,
        country: location.country,
        latitude: location.lat + latOffset,
        longitude: location.lng + lngOffset,
        prices: {
          diesel: Math.round(dieselPrice * 1000) / 1000,
          euro95: Math.round(euro95Price * 1000) / 1000,
          euro98: Math.round((euro95Price + 0.08 + Math.random() * 0.05) * 1000) / 1000,
          lpg: Math.random() > 0.6 ? Math.round((0.85 + Math.random() * 0.15) * 1000) / 1000 : null,
        },
        isOpen: Math.random() > 0.1,
        openingHours: Math.random() > 0.3 ? '24/7' : '06:00 - 22:00',
        facilities: stationFacilities,
        lastUpdated: new Date(Date.now() - Math.random() * 3600000 * 2).toISOString(),
      });
    }
  });

  return stations;
};

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

  // Generate mock stations around user location
  const generateLocalMockStations = useCallback((centerLat: number, centerLng: number): FuelStation[] => {
    const brands = ['Shell', 'BP', 'Esso', 'Total', 'TinQ', 'Texaco', 'Gulf', 'Q8', 'Tango', 'Avia'];
    const facilities = ['Shop', 'Toilet', 'Wasstraat', 'AdBlue', 'Truckparking'];
    const stations: FuelStation[] = [];

    // Generate 30 stations around user location within 30km
    for (let i = 0; i < 30; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      // Random offset within ~30km (0.27 degrees ≈ 30km at NL latitude)
      const latOffset = (Math.random() - 0.5) * 0.54;
      const lngOffset = (Math.random() - 0.5) * 0.54;
      
      const dieselPrice = 1.65 + (Math.random() - 0.5) * 0.20;
      const euro95Price = 2.05 + (Math.random() - 0.5) * 0.18;
      
      const stationFacilities = facilities
        .filter(() => Math.random() > 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 2));
      
      stations.push({
        id: `local-${i}`,
        name: `${brand} ${i + 1}`,
        brand,
        address: `Hoofdweg ${Math.floor(Math.random() * 200) + 1}`,
        city: 'Lokaal',
        country: 'NL',
        latitude: centerLat + latOffset,
        longitude: centerLng + lngOffset,
        prices: {
          diesel: Math.round(dieselPrice * 1000) / 1000,
          euro95: Math.round(euro95Price * 1000) / 1000,
          euro98: Math.round((euro95Price + 0.08) * 1000) / 1000,
          lpg: Math.random() > 0.6 ? Math.round((0.85 + Math.random() * 0.12) * 1000) / 1000 : null,
        },
        isOpen: Math.random() > 0.1,
        openingHours: Math.random() > 0.3 ? '24/7' : '06:00 - 22:00',
        facilities: stationFacilities,
        lastUpdated: new Date().toISOString(),
      });
    }
    
    return stations;
  }, []);

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
          // Convert real stations to our format
          const convertedStations = realStations.map(convertToFuelStation);
          logger.log(`[useFuelStations] Loaded ${convertedStations.length} real stations from OpenStreetMap`);
          setStations(convertedStations);
        } else {
          // Fallback to local mock data around user
          logger.log('[useFuelStations] No real stations found, generating local mock data');
          const localStations = generateLocalMockStations(centerLat, centerLng);
          setStations(localStations);
        }
      } catch (error) {
        console.error('[useFuelStations] Error loading stations:', error);
        // Fallback to local mock data
        const localStations = generateLocalMockStations(centerLat, centerLng);
        setStations(localStations);
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
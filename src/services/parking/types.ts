// Parking Service Types - Foundation for TMS integration

export type ParkingType = 'truck' | 'car' | 'mixed';
export type ParkingFacility = 
  | 'wc' 
  | 'shower' 
  | 'restaurant' 
  | 'shop' 
  | 'wifi' 
  | 'security' 
  | 'camera' 
  | 'lighting'
  | 'fuel'
  | 'charging'
  | 'rest_area';

export interface ParkingLocation {
  id: string;
  name: string;
  address: string;
  city?: string;
  country: string;
  countryCode: string;
  
  // Location
  latitude: number;
  longitude: number;
  
  // Type and capacity
  type: ParkingType;
  capacityTotal?: number;
  capacityTruck?: number;
  capacityCar?: number;
  
  // Pricing
  isFree: boolean;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerNight?: number;
  currency?: string;
  
  // Safety
  isSecured: boolean;
  isGuarded: boolean;
  hasCameras: boolean;
  hasLighting: boolean;
  safetyRating?: 1 | 2 | 3 | 4 | 5;
  
  // Facilities
  facilities: ParkingFacility[];
  
  // Availability
  isOpen24h: boolean;
  openingHours?: string;
  
  // Source
  source: 'demo' | 'opendata' | 'provider';
  sourceUrl?: string;
  lastUpdated: string;
  
  // Distance (calculated at runtime)
  distanceKm?: number;
}

export interface ParkingGeoJSON {
  type: 'FeatureCollection';
  features: GeoJSON.Feature<GeoJSON.Point, {
    id: string;
    name: string;
    type: ParkingType;
    isFree: boolean;
    isSecured: boolean;
    capacityTotal?: number;
    facilities: ParkingFacility[];
  }>[];
}

export interface ParkingProviderConfig {
  countryCode: string;
  apiEndpoint?: string;
  apiKey?: string;
  cacheSeconds: number;
}

// Abstract provider interface for future integrations
export interface IParkingProvider {
  getLocations(lat: number, lng: number, radiusKm: number): Promise<ParkingLocation[]>;
  getGeoJSON(lat: number, lng: number, radiusKm: number): Promise<ParkingGeoJSON>;
}

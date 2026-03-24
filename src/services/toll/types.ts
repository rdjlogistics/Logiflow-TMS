// Toll Service Types - Foundation for TMS integration

export type TollType = 'vignette' | 'per_km' | 'per_section' | 'hybrid';
export type TollVehicleClass = 'car' | 'truck_12t' | 'truck_18t' | 'truck_40t';

export interface TollZone {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  tollType: TollType;
  description: string;
  operator: string;
  website?: string;
  
  // Cost indication (not exact billing)
  costIndicationMin?: number;
  costIndicationMax?: number;
  costUnit?: 'per_km' | 'per_day' | 'per_year' | 'per_section';
  currency: string;
  
  // GeoJSON for map visualization
  geometry?: GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Polygon;
  
  // Vehicle restrictions
  appliesToVehicleClasses: TollVehicleClass[];
  
  // Additional info
  notes?: string;
  lastUpdated: string;
}

export interface TollCountryInfo {
  countryCode: string;
  countryName: string;
  tollTypes: TollType[];
  summary: string;
  operators: string[];
  vignetteRequired: boolean;
  truckTollRequired: boolean;
  paymentMethods: string[];
  sourceUrl?: string;
  purchaseUrl?: string;
  purchaseLabel?: string;
}

export interface TollProviderConfig {
  countryCode: string;
  apiEndpoint?: string;
  apiKey?: string;
  cacheSeconds: number;
}

// Abstract provider interface for future integrations
export interface ITollProvider {
  getCountryInfo(): Promise<TollCountryInfo>;
  getTollZones(): Promise<TollZone[]>;
  getGeoJSON(): Promise<GeoJSON.FeatureCollection>;
  estimateCost(distanceKm: number, vehicleClass: TollVehicleClass): Promise<{ min: number; max: number; currency: string }>;
}

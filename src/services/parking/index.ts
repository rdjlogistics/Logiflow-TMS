// Parking Service - Foundation Module
// Prepared for future TMS integration with Truck Parking Europe, TAPA, OEM feeds

export * from './types';
export * from './providers/DemoParkingProvider';

import { IParkingProvider, ParkingLocation, ParkingGeoJSON } from './types';
import { DemoParkingProvider } from './providers/DemoParkingProvider';

// Default provider (demo mode)
let currentProvider: IParkingProvider = new DemoParkingProvider();

/**
 * Set a custom parking provider
 */
export function setParkingProvider(provider: IParkingProvider): void {
  currentProvider = provider;
}

/**
 * Get parking locations near a coordinate
 */
export async function getParkingLocations(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<ParkingLocation[]> {
  return currentProvider.getLocations(lat, lng, radiusKm);
}

/**
 * Get parking locations as GeoJSON
 */
export async function getParkingGeoJSON(
  lat: number,
  lng: number,
  radiusKm: number = 50
): Promise<ParkingGeoJSON> {
  return currentProvider.getGeoJSON(lat, lng, radiusKm);
}

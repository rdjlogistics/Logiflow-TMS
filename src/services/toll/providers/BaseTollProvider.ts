import { ITollProvider, TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Base class for all toll providers.
 * Prepared for future integration with:
 * - DKV
 * - Toll Collect (Germany)
 * - ASFINAG (Austria)
 * - Telepass (Italy)
 */
export abstract class BaseTollProvider implements ITollProvider {
  protected countryCode: string;
  protected cache: Map<string, { data: unknown; expiry: number }> = new Map();
  protected cacheSeconds: number;

  constructor(countryCode: string, cacheSeconds: number = 300) {
    this.countryCode = countryCode;
    this.cacheSeconds = cacheSeconds;
  }

  abstract getCountryInfo(): Promise<TollCountryInfo>;
  abstract getTollZones(): Promise<TollZone[]>;

  async getGeoJSON(): Promise<GeoJSON.FeatureCollection> {
    const zones = await this.getTollZones();
    
    return {
      type: 'FeatureCollection',
      features: zones
        .filter(zone => zone.geometry)
        .map(zone => ({
          type: 'Feature' as const,
          id: zone.id,
          properties: {
            id: zone.id,
            name: zone.name,
            country: zone.country,
            tollType: zone.tollType,
            operator: zone.operator,
            costMin: zone.costIndicationMin,
            costMax: zone.costIndicationMax,
            costUnit: zone.costUnit,
            currency: zone.currency,
          },
          geometry: zone.geometry!,
        })),
    };
  }

  abstract estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }>;

  protected getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
    return null;
  }

  protected setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheSeconds * 1000,
    });
  }
}

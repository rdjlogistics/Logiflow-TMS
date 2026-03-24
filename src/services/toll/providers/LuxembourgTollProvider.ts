import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Luxembourg Toll Provider
 * No road tolls
 */
export class LuxembourgTollProvider extends BaseTollProvider {
  constructor() {
    super('LU', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'LU',
      countryName: 'Luxemburg',
      tollTypes: [],
      summary: 'Geen tolwegen of vignetplicht. Vrij gebruik van alle snelwegen.',
      operators: [],
      vignetteRequired: false,
      truckTollRequired: false,
      paymentMethods: [],
      sourceUrl: 'https://www.public.lu',
      purchaseUrl: undefined,
      purchaseLabel: undefined,
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    return { min: 0, max: 0, currency: 'EUR' };
  }
}

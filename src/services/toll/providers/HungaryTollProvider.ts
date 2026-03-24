import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Hungary Toll Provider
 * e-Matrica (e-vignette) for cars, HU-GO for trucks
 */
export class HungaryTollProvider extends BaseTollProvider {
  constructor() {
    super('HU', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'HU',
      countryName: 'Hongarije',
      tollTypes: ['vignette', 'per_km'],
      summary: 'e-Matrica (elektronische vignet) voor personenauto\'s. HU-GO kilometerheffing voor vrachtwagens >3,5t.',
      operators: ['NÚSZ (e-Matrica)', 'HU-GO'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['e-Matrica online', 'HU-GO OBU', 'DKV', 'Telepass'],
      sourceUrl: 'https://ematrica.nemzetiutdij.hu',
      purchaseUrl: 'https://ematrica.nemzetiutdij.hu',
      purchaseLabel: 'Koop e-Matrica',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'hu-ematrica',
        name: 'e-Matrica Vignetnetwerk',
        country: 'Hongarije',
        countryCode: 'HU',
        tollType: 'vignette',
        description: 'Elektronische vignet voor personenauto\'s',
        operator: 'NÚSZ',
        costIndicationMin: 5140,
        costIndicationMax: 60390,
        costUnit: 'per_year',
        currency: 'HUF',
        appliesToVehicleClasses: ['car'],
        notes: '10 dagen: 5140 HUF, 1 maand: 6530 HUF, 1 jaar: 60390 HUF',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[16.37, 47.69], [18.07, 47.49], [19.04, 47.50], [21.72, 47.95]],
            [[19.04, 47.50], [18.22, 46.08]],
            [[19.04, 47.50], [20.18, 46.25]],
          ],
        },
      },
      {
        id: 'hu-hugo',
        name: 'HU-GO Vrachtwagennetwerk',
        country: 'Hongarije',
        countryCode: 'HU',
        tollType: 'per_km',
        description: 'Kilometerheffing voor voertuigen >3,5t',
        operator: 'HU-GO',
        costIndicationMin: 34.22,
        costIndicationMax: 87.08,
        costUnit: 'per_km',
        currency: 'HUF',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van emissieklasse, wegtype en aantal assen',
        lastUpdated: '2024-01-01',
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    if (vehicleClass === 'car') {
      // 10-day vignette as reference
      return { min: 5140, max: 5140, currency: 'HUF' };
    }

    // HU-GO rates in HUF per km
    const rates: Record<string, number> = {
      truck_12t: 34.22,
      truck_18t: 55.35,
      truck_40t: 87.08,
    };

    const rate = rates[vehicleClass] || 55.35;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.9),
      max: Math.round(cost * 1.1),
      currency: 'HUF',
    };
  }
}

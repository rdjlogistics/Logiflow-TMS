import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Bulgaria Toll Provider
 * Vignette for cars, per-km toll for trucks (planned)
 */
export class BulgariaTollProvider extends BaseTollProvider {
  constructor() {
    super('BG', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'BG',
      countryName: 'Bulgarije',
      tollTypes: ['vignette', 'per_km'],
      summary: 'e-Vignette verplicht voor personenauto\'s. Vrachtwagens >3,5t betalen TOLL systeem (per km).',
      operators: ['Toll Road Infrastructure Agency'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['BGtoll online', 'Tankstations', 'OBU'],
      sourceUrl: 'https://www.bgtoll.bg',
      purchaseUrl: 'https://www.bgtoll.bg',
      purchaseLabel: 'Koop e-Vignet',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'bg-evignette',
        name: 'e-Vignette Netwerk',
        country: 'Bulgarije',
        countryCode: 'BG',
        tollType: 'vignette',
        description: 'Vignet voor personenauto\'s',
        operator: 'TRIA',
        costIndicationMin: 15,
        costIndicationMax: 97,
        costUnit: 'per_year',
        currency: 'BGN',
        appliesToVehicleClasses: ['car'],
        notes: 'Weekend: 15 BGN, Week: 30 BGN, Maand: 57 BGN, Jaar: 97 BGN',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[22.86, 43.85], [24.75, 42.70], [26.92, 42.14]],
            [[23.32, 42.70], [24.75, 42.70], [27.47, 42.50]],
          ],
        },
      },
      {
        id: 'bg-toll-trucks',
        name: 'Vrachtwagennetwerk',
        country: 'Bulgarije',
        countryCode: 'BG',
        tollType: 'per_km',
        description: 'Kilometerheffing voor voertuigen >3,5t',
        operator: 'TRIA',
        costIndicationMin: 0.05,
        costIndicationMax: 0.19,
        costUnit: 'per_km',
        currency: 'EUR',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    if (vehicleClass === 'car') {
      // Week vignette in EUR equivalent
      return { min: 15, max: 15, currency: 'BGN' };
    }

    const rates: Record<string, number> = {
      truck_12t: 0.05,
      truck_18t: 0.10,
      truck_40t: 0.19,
    };

    const rate = rates[vehicleClass] || 0.10;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.9 * 100) / 100,
      max: Math.round(cost * 1.1 * 100) / 100,
      currency: 'EUR',
    };
  }
}

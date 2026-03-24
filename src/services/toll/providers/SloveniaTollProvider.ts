import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Slovenia Toll Provider
 * e-Vinjeta for cars, DarsGo for trucks
 */
export class SloveniaTollProvider extends BaseTollProvider {
  constructor() {
    super('SI', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'SI',
      countryName: 'Slovenië',
      tollTypes: ['vignette', 'per_km'],
      summary: 'e-Vinjeta (elektronische vignet) voor personenauto\'s. DarsGo kilometerheffing voor vrachtwagens >3,5t.',
      operators: ['DARS (e-Vinjeta)', 'DarsGo'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['e-Vinjeta online', 'DarsGo OBU', 'DKV', 'Telepass'],
      sourceUrl: 'https://evinjeta.dars.si',
      purchaseUrl: 'https://evinjeta.dars.si',
      purchaseLabel: 'Koop e-Vignet',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'si-evinjeta',
        name: 'e-Vinjeta Netwerk',
        country: 'Slovenië',
        countryCode: 'SI',
        tollType: 'vignette',
        description: 'Elektronische vignet voor personenauto\'s',
        operator: 'DARS',
        costIndicationMin: 16,
        costIndicationMax: 117,
        costUnit: 'per_year',
        currency: 'EUR',
        appliesToVehicleClasses: ['car'],
        notes: '7 dagen: €16, 1 maand: €32, 1 jaar: €117',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[13.78, 46.05], [14.51, 46.06], [15.65, 46.55]],
            [[14.51, 46.06], [14.85, 45.80], [15.17, 45.47]],
            [[13.64, 45.53], [14.51, 46.06]],
          ],
        },
      },
      {
        id: 'si-darsgo',
        name: 'DarsGo Vrachtwagennetwerk',
        country: 'Slovenië',
        countryCode: 'SI',
        tollType: 'per_km',
        description: 'Kilometerheffing voor voertuigen >3,5t',
        operator: 'DarsGo',
        costIndicationMin: 0.118,
        costIndicationMax: 0.468,
        costUnit: 'per_km',
        currency: 'EUR',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van emissieklasse en aantal assen',
        lastUpdated: '2024-01-01',
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    if (vehicleClass === 'car') {
      // 7-day vignette as reference
      return { min: 16, max: 16, currency: 'EUR' };
    }

    // DarsGo rates in EUR per km
    const rates: Record<string, number> = {
      truck_12t: 0.118,
      truck_18t: 0.275,
      truck_40t: 0.468,
    };

    const rate = rates[vehicleClass] || 0.275;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.9 * 100) / 100,
      max: Math.round(cost * 1.1 * 100) / 100,
      currency: 'EUR',
    };
  }
}

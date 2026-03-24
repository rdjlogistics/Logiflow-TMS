import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Slovakia Toll Provider
 * e-Známka for cars, MYTO for trucks
 */
export class SlovakiaTollProvider extends BaseTollProvider {
  constructor() {
    super('SK', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'SK',
      countryName: 'Slowakije',
      tollTypes: ['vignette', 'per_km'],
      summary: 'e-Známka (elektronische vignet) voor personenauto\'s. MYTO kilometerheffing voor vrachtwagens >3,5t.',
      operators: ['NDS (e-Známka)', 'SkyToll (MYTO)'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['e-Známka online', 'MYTO OBU', 'DKV', 'Telepass'],
      sourceUrl: 'https://eznamka.sk',
      purchaseUrl: 'https://eznamka.sk',
      purchaseLabel: 'Koop e-Známka',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'sk-eznamka',
        name: 'e-Známka Vignetnetwerk',
        country: 'Slowakije',
        countryCode: 'SK',
        tollType: 'vignette',
        description: 'Elektronische vignet voor personenauto\'s',
        operator: 'NDS',
        costIndicationMin: 12,
        costIndicationMax: 60,
        costUnit: 'per_year',
        currency: 'EUR',
        appliesToVehicleClasses: ['car'],
        notes: '10 dagen: €12, 30 dagen: €17, 365 dagen: €60',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[17.12, 48.15], [18.74, 48.88], [21.26, 48.72]],
            [[17.12, 48.15], [17.67, 48.45], [18.74, 48.88]],
          ],
        },
      },
      {
        id: 'sk-myto',
        name: 'MYTO Vrachtwagennetwerk',
        country: 'Slowakije',
        countryCode: 'SK',
        tollType: 'per_km',
        description: 'Kilometerheffing voor voertuigen >3,5t',
        operator: 'SkyToll',
        costIndicationMin: 0.093,
        costIndicationMax: 0.209,
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
      // 10-day vignette as reference
      return { min: 12, max: 12, currency: 'EUR' };
    }

    // MYTO rates in EUR per km
    const rates: Record<string, number> = {
      truck_12t: 0.093,
      truck_18t: 0.143,
      truck_40t: 0.209,
    };

    const rate = rates[vehicleClass] || 0.143;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.9 * 100) / 100,
      max: Math.round(cost * 1.1 * 100) / 100,
      currency: 'EUR',
    };
  }
}

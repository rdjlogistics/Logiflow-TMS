import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Romania Toll Provider
 * Rovinieta (vignette) for all vehicles
 */
export class RomaniaTollProvider extends BaseTollProvider {
  constructor() {
    super('RO', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'RO',
      countryName: 'Roemenië',
      tollTypes: ['vignette'],
      summary: 'Rovinieta (vignet) verplicht voor alle voertuigen op nationale wegen en snelwegen.',
      operators: ['CNAIR (Rovinieta)'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['Rovinieta online', 'Tankstations', 'Grensposten'],
      sourceUrl: 'https://www.roviniete.ro',
      purchaseUrl: 'https://www.roviniete.ro',
      purchaseLabel: 'Koop Rovinieta',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'ro-rovinieta',
        name: 'Rovinieta Netwerk',
        country: 'Roemenië',
        countryCode: 'RO',
        tollType: 'vignette',
        description: 'Vignet verplicht voor alle nationale wegen',
        operator: 'CNAIR',
        costIndicationMin: 3,
        costIndicationMax: 1396,
        costUnit: 'per_year',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Auto 7 dagen: €3, 30 dagen: €7, 1 jaar: €28. Vrachtwagen 1 jaar: tot €1396',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[21.23, 45.75], [23.59, 44.43], [26.10, 44.43]],
            [[26.10, 44.43], [27.58, 47.16]],
            [[26.10, 44.43], [28.65, 44.17]],
          ],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Vignette prices (7 days as reference)
    const prices: Record<string, { min: number; max: number }> = {
      car: { min: 3, max: 3 },
      truck_12t: { min: 16, max: 16 },
      truck_18t: { min: 25, max: 25 },
      truck_40t: { min: 32, max: 32 },
    };

    return { ...prices[vehicleClass] || prices.car, currency: 'EUR' };
  }
}

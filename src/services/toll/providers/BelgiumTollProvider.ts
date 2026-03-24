import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Belgium Toll Provider
 * Viapass for trucks >3.5t, Liefkenshoektunnel for all vehicles
 */
export class BelgiumTollProvider extends BaseTollProvider {
  constructor() {
    super('BE', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'BE',
      countryName: 'België',
      tollTypes: ['per_km', 'per_section'],
      summary: 'Kilometerheffing voor vrachtwagens >3,5t via Viapass. Liefkenshoektunnel is tolplichtig voor alle voertuigen.',
      operators: ['Viapass', 'Liefkenshoek NV'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['Viapass OBU', 'Satellic', 'DKV', 'Telepass'],
      sourceUrl: 'https://www.viapass.be',
      purchaseUrl: 'https://www.satellic.be',
      purchaseLabel: 'Bestel OBU',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'be-viapass',
        name: 'Viapass Kilometerheffing',
        country: 'België',
        countryCode: 'BE',
        tollType: 'per_km',
        description: 'Kilometerheffing voor vrachtwagens >3,5t op alle snelwegen',
        operator: 'Viapass',
        costIndicationMin: 0.074,
        costIndicationMax: 0.198,
        costUnit: 'per_km',
        currency: 'EUR',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van gewicht, emissieklasse en regio (Vlaanderen/Wallonië/Brussel)',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[2.55, 51.05], [3.22, 51.21], [4.40, 51.22], [5.57, 50.63]],
            [[4.35, 50.85], [4.40, 51.22]],
            [[3.22, 50.42], [4.35, 50.85], [5.57, 50.63]],
          ],
        },
      },
      {
        id: 'be-liefkenshoek',
        name: 'Liefkenshoektunnel',
        country: 'België',
        countryCode: 'BE',
        tollType: 'per_section',
        description: 'Tolweg onder de Schelde bij Antwerpen',
        operator: 'Liefkenshoek NV',
        costIndicationMin: 6,
        costIndicationMax: 26,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[4.28, 51.30], [4.30, 51.28]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    if (vehicleClass === 'car') {
      return { min: 0, max: 0, currency: 'EUR' };
    }

    // Viapass rates per km (average)
    const rates: Record<string, number> = {
      truck_12t: 0.074,
      truck_18t: 0.132,
      truck_40t: 0.198,
    };

    const rate = rates[vehicleClass] || 0.132;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.9 * 100) / 100,
      max: Math.round(cost * 1.1 * 100) / 100,
      currency: 'EUR',
    };
  }
}

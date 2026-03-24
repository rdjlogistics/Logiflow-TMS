import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Greece Toll Provider
 * Toll booths on motorways
 */
export class GreeceTollProvider extends BaseTollProvider {
  constructor() {
    super('GR', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'GR',
      countryName: 'Griekenland',
      tollTypes: ['per_section'],
      summary: 'Tolpoorten op snelwegen. Betaling per traject. e-Pass beschikbaar.',
      operators: ['Attiki Odos', 'Olympia Odos', 'Nea Odos', 'Egnatia Odos'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['e-Pass', 'Contant', 'Creditcard'],
      sourceUrl: 'https://www.aodos.gr',
      purchaseUrl: 'https://www.aodos.gr',
      purchaseLabel: 'Koop e-Pass',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'gr-attiki-odos',
        name: 'Attiki Odos (Athene ringweg)',
        country: 'Griekenland',
        countryCode: 'GR',
        tollType: 'per_section',
        description: 'Ringweg rond Athene',
        operator: 'Attiki Odos',
        costIndicationMin: 2.80,
        costIndicationMax: 15,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[23.62, 38.05], [23.80, 38.02], [23.95, 37.97]],
        },
      },
      {
        id: 'gr-egnatia',
        name: 'Egnatia Odos',
        country: 'Griekenland',
        countryCode: 'GR',
        tollType: 'per_section',
        description: 'Noord-Griekenland oost-west corridor',
        operator: 'Egnatia Odos',
        costIndicationMin: 2,
        costIndicationMax: 40,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[20.85, 39.67], [22.95, 40.64], [24.40, 40.93], [26.14, 41.15]],
        },
      },
      {
        id: 'gr-olympia-odos',
        name: 'Olympia Odos',
        country: 'Griekenland',
        countryCode: 'GR',
        tollType: 'per_section',
        description: 'Athene - Patras corridor',
        operator: 'Olympia Odos',
        costIndicationMin: 3,
        costIndicationMax: 25,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[21.73, 38.25], [22.43, 38.02], [23.73, 38.02]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    const rates: Record<string, number> = {
      car: 0.06,
      truck_12t: 0.12,
      truck_18t: 0.18,
      truck_40t: 0.24,
    };

    const rate = rates[vehicleClass] || 0.08;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.8 * 100) / 100,
      max: Math.round(cost * 1.2 * 100) / 100,
      currency: 'EUR',
    };
  }
}

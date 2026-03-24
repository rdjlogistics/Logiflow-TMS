import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Portugal Toll Provider
 * Via Verde electronic tolling and SCUT roads
 */
export class PortugalTollProvider extends BaseTollProvider {
  constructor() {
    super('PT', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'PT',
      countryName: 'Portugal',
      tollTypes: ['per_section', 'per_km'],
      summary: 'Uitgebreid tolwegennetwerk met Via Verde (elektronisch) en betaalpoorten. Let op: SCUT-wegen alleen elektronisch.',
      operators: ['Brisa', 'Ascendi', 'Via Verde'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['Via Verde', 'Toll Card', 'EASYtoll', 'CTT betaalpunt'],
      sourceUrl: 'https://www.viaverde.pt',
      purchaseUrl: 'https://www.viaverde.pt',
      purchaseLabel: 'Koop Via Verde',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'pt-a1-lisboa-porto',
        name: 'A1 Lisboa - Porto',
        country: 'Portugal',
        countryCode: 'PT',
        tollType: 'per_section',
        description: 'Hoofdroute noord-zuid',
        operator: 'Brisa',
        costIndicationMin: 8,
        costIndicationMax: 35,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-9.14, 38.72], [-8.61, 40.20], [-8.61, 41.15]],
        },
      },
      {
        id: 'pt-a2-lisboa-algarve',
        name: 'A2 Lisboa - Algarve',
        country: 'Portugal',
        countryCode: 'PT',
        tollType: 'per_section',
        description: 'Route naar Zuid-Portugal',
        operator: 'Brisa',
        costIndicationMin: 10,
        costIndicationMax: 30,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-9.14, 38.72], [-8.46, 37.91], [-8.80, 37.02]],
        },
      },
      {
        id: 'pt-a22-algarve',
        name: 'A22 Via do Infante (Algarve)',
        country: 'Portugal',
        countryCode: 'PT',
        tollType: 'per_km',
        description: 'SCUT-weg (alleen elektronisch)',
        operator: 'Ascendi',
        costIndicationMin: 0.06,
        costIndicationMax: 0.15,
        costUnit: 'per_km',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Geen tolpoorten - alleen elektronische registratie',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-7.42, 37.18], [-8.06, 37.13], [-8.80, 37.02]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    const rates: Record<string, number> = {
      car: 0.08,
      truck_12t: 0.12,
      truck_18t: 0.18,
      truck_40t: 0.24,
    };

    const rate = rates[vehicleClass] || 0.10;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.8 * 100) / 100,
      max: Math.round(cost * 1.2 * 100) / 100,
      currency: 'EUR',
    };
  }
}

import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Denmark Toll Provider
 * Bridge tolls only (Øresund, Storebælt)
 */
export class DenmarkTollProvider extends BaseTollProvider {
  constructor() {
    super('DK', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'DK',
      countryName: 'Denemarken',
      tollTypes: ['per_section'],
      summary: 'Geen algemene tolwegen. Wel tol voor Storebæltbrug en Øresundbrug (naar Zweden).',
      operators: ['Storebælt A/S', 'Øresundsbro Konsortiet'],
      vignetteRequired: false,
      truckTollRequired: false,
      paymentMethods: ['BroBizz', 'BroPas', 'Contant', 'Creditcard'],
      sourceUrl: 'https://www.storebaelt.dk',
      purchaseUrl: 'https://www.brobizz.com',
      purchaseLabel: 'Koop BroBizz',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'dk-storebaelt',
        name: 'Storebæltbrug',
        country: 'Denemarken',
        countryCode: 'DK',
        tollType: 'per_section',
        description: 'Verbinding Funen - Seeland',
        operator: 'Storebælt A/S',
        costIndicationMin: 250,
        costIndicationMax: 1500,
        costUnit: 'per_section',
        currency: 'DKK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Auto: ~250 DKK, Vrachtwagen: tot 1500 DKK',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[10.67, 55.35], [11.08, 55.35]],
        },
      },
      {
        id: 'dk-oresund',
        name: 'Øresundbrug',
        country: 'Denemarken',
        countryCode: 'DK',
        tollType: 'per_section',
        description: 'Verbinding Kopenhagen - Malmö (Zweden)',
        operator: 'Øresundsbro Konsortiet',
        costIndicationMin: 375,
        costIndicationMax: 2000,
        costUnit: 'per_section',
        currency: 'DKK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Auto: ~375 DKK, Vrachtwagen: tot 2000 DKK',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[12.65, 55.57], [12.85, 55.58]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Bridge crossings are fixed cost, not distance-based
    // Return typical crossing costs
    const prices: Record<string, { min: number; max: number }> = {
      car: { min: 250, max: 375 },
      truck_12t: { min: 700, max: 1000 },
      truck_18t: { min: 1000, max: 1500 },
      truck_40t: { min: 1500, max: 2000 },
    };

    return { ...prices[vehicleClass] || prices.car, currency: 'DKK' };
  }
}

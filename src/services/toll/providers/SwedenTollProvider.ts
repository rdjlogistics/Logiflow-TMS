import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Sweden Toll Provider
 * Congestion charges and bridge tolls
 */
export class SwedenTollProvider extends BaseTollProvider {
  constructor() {
    super('SE', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'SE',
      countryName: 'Zweden',
      tollTypes: ['per_section', 'hybrid'],
      summary: 'Congestion charges in Stockholm en Göteborg. Tol voor Öresund- en Svinesundbrug. Geen vignet.',
      operators: ['Transportstyrelsen', 'Øresundsbro Konsortiet'],
      vignetteRequired: false,
      truckTollRequired: false,
      paymentMethods: ['Automatische registratie', 'BroBizz', 'Betaalverzoek per post'],
      sourceUrl: 'https://www.transportstyrelsen.se',
      purchaseUrl: 'https://www.brobizz.com',
      purchaseLabel: 'Koop BroBizz',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'se-stockholm-congestion',
        name: 'Stockholm Congestion Charge',
        country: 'Zweden',
        countryCode: 'SE',
        tollType: 'hybrid',
        description: 'Automatische heffing in stedelijke zone',
        operator: 'Transportstyrelsen',
        costIndicationMin: 11,
        costIndicationMax: 45,
        costUnit: 'per_day',
        currency: 'SEK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van tijdstip (spits/dal). Max 135 SEK/dag',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'Polygon',
          coordinates: [[[18.02, 59.35], [18.10, 59.35], [18.10, 59.32], [18.02, 59.32], [18.02, 59.35]]],
        },
      },
      {
        id: 'se-goteborg-congestion',
        name: 'Göteborg Congestion Charge',
        country: 'Zweden',
        countryCode: 'SE',
        tollType: 'hybrid',
        description: 'Automatische heffing in stedelijke zone',
        operator: 'Transportstyrelsen',
        costIndicationMin: 9,
        costIndicationMax: 22,
        costUnit: 'per_day',
        currency: 'SEK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Max 60 SEK/dag',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'Polygon',
          coordinates: [[[11.95, 57.72], [12.02, 57.72], [12.02, 57.68], [11.95, 57.68], [11.95, 57.72]]],
        },
      },
      {
        id: 'se-svinesund',
        name: 'Svinesundbrug',
        country: 'Zweden',
        countryCode: 'SE',
        tollType: 'per_section',
        description: 'Verbinding Zweden - Noorwegen',
        operator: 'Svinesundsförbindelsen',
        costIndicationMin: 30,
        costIndicationMax: 300,
        costUnit: 'per_section',
        currency: 'SEK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[11.26, 59.10], [11.28, 59.08]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Congestion charges are fixed, not distance-based
    const prices: Record<string, { min: number; max: number }> = {
      car: { min: 20, max: 135 },
      truck_12t: { min: 20, max: 135 },
      truck_18t: { min: 20, max: 135 },
      truck_40t: { min: 20, max: 135 },
    };

    return { ...prices[vehicleClass] || prices.car, currency: 'SEK' };
  }
}

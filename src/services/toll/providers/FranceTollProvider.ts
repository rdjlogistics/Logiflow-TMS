import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * France Toll Provider
 * Section-based toll via péage system
 * 
 * Future integration points:
 * - Télépéage (APRR, Sanef, Vinci)
 * - DKV integration
 */
export class FranceTollProvider extends BaseTollProvider {
  constructor() {
    super('FR', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'FR',
      countryName: 'Frankrijk',
      tollTypes: ['per_section'],
      summary: 'Péage-systeem met tolpoorten op autoroutes. Betaling per traject, personenauto\'s en vrachtwagens.',
      operators: ['APRR', 'Sanef', 'Vinci Autoroutes', 'AREA'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['Télépéage badge', 'Contant', 'Creditcard', 'DKV'],
      sourceUrl: 'https://www.autoroutes.fr',
      purchaseUrl: 'https://www.bipandgo.com',
      purchaseLabel: 'Koop Télépéage badge',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'fr-a1-paris-lille',
        name: 'A1 Paris - Lille',
        country: 'Frankrijk',
        countryCode: 'FR',
        tollType: 'per_section',
        description: 'Autoroute du Nord',
        operator: 'Sanef',
        costIndicationMin: 15,
        costIndicationMax: 85,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[2.35, 48.85], [2.45, 49.25], [2.82, 49.90], [3.06, 50.63]],
        },
      },
      {
        id: 'fr-a6-paris-lyon',
        name: 'A6 Paris - Lyon',
        country: 'Frankrijk',
        countryCode: 'FR',
        tollType: 'per_section',
        description: 'Autoroute du Soleil',
        operator: 'APRR',
        costIndicationMin: 25,
        costIndicationMax: 140,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[2.35, 48.85], [3.16, 47.32], [4.36, 46.20], [4.84, 45.76]],
        },
      },
      {
        id: 'fr-a7-lyon-marseille',
        name: 'A7 Lyon - Marseille',
        country: 'Frankrijk',
        countryCode: 'FR',
        tollType: 'per_section',
        description: 'Autoroute du Soleil (sud)',
        operator: 'Vinci Autoroutes',
        costIndicationMin: 20,
        costIndicationMax: 110,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[4.84, 45.76], [4.87, 44.93], [4.81, 43.95], [5.37, 43.30]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // France has higher rates for trucks (Class 3/4)
    const baseRatePerKm = vehicleClass === 'car' ? 0.09 :
                          vehicleClass === 'truck_40t' ? 0.35 :
                          vehicleClass === 'truck_18t' ? 0.28 : 0.22;

    return {
      min: Math.round(distanceKm * baseRatePerKm * 0.85 * 100) / 100,
      max: Math.round(distanceKm * baseRatePerKm * 1.15 * 100) / 100,
      currency: 'EUR',
    };
  }
}

import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Austria Toll Provider
 * Vignette for cars + GO-Maut for trucks via ASFINAG
 * 
 * Future integration points:
 * - ASFINAG GO-Box API
 * - DKV integration
 */
export class AustriaTollProvider extends BaseTollProvider {
  constructor() {
    super('AT', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'AT',
      countryName: 'Oostenrijk',
      tollTypes: ['vignette', 'per_km'],
      summary: 'Vignet verplicht voor personenauto\'s. Vrachtwagens >3,5t betalen per km via GO-Box.',
      operators: ['ASFINAG'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['Digitale Vignet', 'GO-Box', 'DKV', 'Shell Card'],
      sourceUrl: 'https://www.asfinag.at',
      purchaseUrl: 'https://shop.asfinag.at',
      purchaseLabel: 'Koop vignet / GO-Box',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'at-vignette-network',
        name: 'Oostenrijkse Snelwegen (Vignet)',
        country: 'Oostenrijk',
        countryCode: 'AT',
        tollType: 'vignette',
        description: 'Vignetplicht voor alle Autobahnen en Schnellstraßen',
        operator: 'ASFINAG',
        costIndicationMin: 9.90,
        costIndicationMax: 96.40,
        costUnit: 'per_year',
        currency: 'EUR',
        appliesToVehicleClasses: ['car'],
        notes: '10-dagen: €9,90 | 2 maanden: €29,00 | Jaar: €96,40',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            // A1: Wien - Salzburg
            [[16.37, 48.21], [14.29, 48.31], [13.04, 47.80]],
            // A2: Wien - Graz - Klagenfurt
            [[16.37, 48.21], [15.44, 47.07], [14.31, 46.62]],
            // A10: Salzburg - Villach (Tauern)
            [[13.04, 47.80], [13.18, 47.07], [13.85, 46.61]],
            // A13: Brenner
            [[11.46, 47.07], [11.51, 47.26]],
          ],
        },
      },
      {
        id: 'at-go-maut',
        name: 'GO-Maut Vrachtverkeer',
        country: 'Oostenrijk',
        countryCode: 'AT',
        tollType: 'per_km',
        description: 'Kilometergebaseerde tol voor voertuigen >3,5t',
        operator: 'ASFINAG',
        costIndicationMin: 0.22,
        costIndicationMax: 0.42,
        costUnit: 'per_km',
        currency: 'EUR',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van aantal assen en emissieklasse',
        lastUpdated: '2024-01-01',
      },
      {
        id: 'at-brenner-special',
        name: 'Brenner Autobahn (A13)',
        country: 'Oostenrijk',
        countryCode: 'AT',
        tollType: 'per_section',
        description: 'Speciale maut voor Brenner-route',
        operator: 'ASFINAG',
        costIndicationMin: 11,
        costIndicationMax: 120,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[11.46, 47.07], [11.51, 47.26]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    if (vehicleClass === 'car') {
      // Vignette cost (flat rate)
      return { min: 9.90, max: 96.40, currency: 'EUR' };
    }

    // GO-Maut rates
    const ratePerKm = vehicleClass === 'truck_40t' ? 0.42 :
                      vehicleClass === 'truck_18t' ? 0.35 : 0.22;

    return {
      min: Math.round(distanceKm * ratePerKm * 0.9 * 100) / 100,
      max: Math.round(distanceKm * ratePerKm * 1.1 * 100) / 100,
      currency: 'EUR',
    };
  }
}

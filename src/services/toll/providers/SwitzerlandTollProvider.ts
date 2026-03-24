import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Switzerland Toll Provider
 * Vignette for cars + LSVA for trucks
 */
export class SwitzerlandTollProvider extends BaseTollProvider {
  constructor() {
    super('CH', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'CH',
      countryName: 'Zwitserland',
      tollTypes: ['vignette', 'per_km'],
      summary: 'Vignet verplicht voor personenauto\'s (CHF 40). Vrachtwagens betalen LSVA (Leistungsabhängige Schwerverkehrsabgabe).',
      operators: ['BAZG (Douane)', 'LSVA'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['Vignet (jaarlijks)', 'LSVA-apparaat', 'Tripon'],
      sourceUrl: 'https://www.bazg.admin.ch',
      purchaseUrl: 'https://www.e-vignette.ch',
      purchaseLabel: 'Koop e-Vignet',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'ch-vignette-network',
        name: 'Zwitserse Snelwegen (Vignet)',
        country: 'Zwitserland',
        countryCode: 'CH',
        tollType: 'vignette',
        description: 'Jaarlijkse vignet verplicht voor alle Nationalstraßen',
        operator: 'BAZG',
        costIndicationMin: 40,
        costIndicationMax: 40,
        costUnit: 'per_year',
        currency: 'CHF',
        appliesToVehicleClasses: ['car'],
        notes: 'Geldig van 1 dec tot 31 jan volgend jaar (14 maanden)',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            // A1: Genève - Zürich - St. Gallen
            [[6.14, 46.21], [6.63, 46.52], [7.45, 46.95], [8.54, 47.38], [9.37, 47.42]],
            // A2: Basel - Gotthard - Chiasso
            [[7.59, 47.56], [8.31, 47.05], [8.65, 46.50], [9.02, 46.00]],
            // A3: Zürich - Chur
            [[8.54, 47.38], [9.02, 47.17], [9.53, 46.85]],
          ],
        },
      },
      {
        id: 'ch-lsva',
        name: 'LSVA Vrachtwagenbelasting',
        country: 'Zwitserland',
        countryCode: 'CH',
        tollType: 'per_km',
        description: 'Kilometergebaseerde heffing voor alle wegen, voertuigen >3,5t',
        operator: 'BAZG',
        costIndicationMin: 2.28,
        costIndicationMax: 3.10,
        costUnit: 'per_km',
        currency: 'CHF',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief per 100 tkm (ton-kilometer), afhankelijk van gewicht en emissieklasse',
        lastUpdated: '2024-01-01',
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    if (vehicleClass === 'car') {
      return { min: 40, max: 40, currency: 'CHF' };
    }

    // LSVA is very expensive in Switzerland
    // Rate per tkm (ton-kilometer), simplified
    const weight = vehicleClass === 'truck_40t' ? 40 :
                   vehicleClass === 'truck_18t' ? 18 : 12;
    const ratePerTkm = 0.031; // CHF per ton-km

    const cost = distanceKm * weight * ratePerTkm;
    return {
      min: Math.round(cost * 0.9 * 100) / 100,
      max: Math.round(cost * 1.1 * 100) / 100,
      currency: 'CHF',
    };
  }
}

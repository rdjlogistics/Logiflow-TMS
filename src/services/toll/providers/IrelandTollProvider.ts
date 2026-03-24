import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Ireland Toll Provider
 * M50 eFlow and barrier tolls
 */
export class IrelandTollProvider extends BaseTollProvider {
  constructor() {
    super('IE', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'IE',
      countryName: 'Ierland',
      tollTypes: ['per_section'],
      summary: 'Tolwegen op belangrijke snelwegen. M50 eFlow (barrier-free) rond Dublin.',
      operators: ['eFlow', 'TII (Transport Infrastructure Ireland)'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['eFlow Tag', 'Video tolling', 'Contant', 'Creditcard'],
      sourceUrl: 'https://www.eflow.ie',
      purchaseUrl: 'https://www.eflow.ie',
      purchaseLabel: 'Koop eFlow Tag',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'ie-m50-eflow',
        name: 'M50 eFlow',
        country: 'Ierland',
        countryCode: 'IE',
        tollType: 'per_section',
        description: 'Barrier-free toll op Dublin ringweg',
        operator: 'eFlow',
        costIndicationMin: 3.10,
        costIndicationMax: 5.20,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Automatische registratie via video. Binnen 24u betalen of registreren',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-6.35, 53.42], [-6.28, 53.38], [-6.22, 53.30]],
        },
      },
      {
        id: 'ie-m1',
        name: 'M1 (Dublin - Belfast)',
        country: 'Ierland',
        countryCode: 'IE',
        tollType: 'per_section',
        description: 'Hoofdroute Dublin - grens',
        operator: 'TII',
        costIndicationMin: 1.90,
        costIndicationMax: 3.50,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-6.26, 53.35], [-6.42, 53.90], [-6.35, 54.05]],
        },
      },
      {
        id: 'ie-m4-m6',
        name: 'M4/M6 (Dublin - Galway)',
        country: 'Ierland',
        countryCode: 'IE',
        tollType: 'per_section',
        description: 'Westelijke corridor',
        operator: 'TII',
        costIndicationMin: 2.90,
        costIndicationMax: 5.50,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-6.45, 53.38], [-7.45, 53.43], [-8.63, 53.35]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Ireland has limited toll roads
    const rates: Record<string, number> = {
      car: 0.04,
      truck_12t: 0.06,
      truck_18t: 0.08,
      truck_40t: 0.10,
    };

    const rate = rates[vehicleClass] || 0.05;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.8 * 100) / 100,
      max: Math.round(cost * 1.2 * 100) / 100,
      currency: 'EUR',
    };
  }
}

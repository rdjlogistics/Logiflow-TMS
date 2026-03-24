import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

export class GermanyTollProvider extends BaseTollProvider {
  constructor() {
    super('DE', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'DE',
      countryName: 'Duitsland',
      tollTypes: ['per_km'],
      summary: 'LKW-Maut voor vrachtwagens >7,5t op snelwegen en sommige Bundesstraßen. Personenauto\'s rijden tolvrij.',
      operators: ['Toll Collect'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['OBU (On-Board Unit)', 'Handmatige boeking', 'DKV', 'Shell Card'],
      sourceUrl: 'https://www.toll-collect.de',
      purchaseUrl: 'https://www.toll-collect.de',
      purchaseLabel: 'Bestel OBU',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'de-autobahn-network',
        name: 'Bundesautobahnen (Mautpflichtig)',
        country: 'Duitsland',
        countryCode: 'DE',
        tollType: 'per_km',
        description: 'LKW-Maut op alle snelwegen voor voertuigen >7,5t',
        operator: 'Toll Collect',
        costIndicationMin: 0.187,
        costIndicationMax: 0.228,
        costUnit: 'per_km',
        currency: 'EUR',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarieven afhankelijk van emissie- en gewichtsklasse',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[9.99, 53.55], [10.01, 52.37], [7.47, 51.23], [6.96, 50.94]],
            [[6.78, 51.45], [8.80, 52.27], [11.63, 52.13], [13.40, 52.52]],
            [[6.02, 51.96], [6.96, 50.94], [8.68, 50.11], [13.47, 48.57]],
            [[9.99, 53.55], [9.73, 52.37], [9.93, 49.80], [10.70, 47.57]],
            [[13.40, 52.52], [12.37, 51.34], [11.58, 50.98], [11.78, 48.14]],
          ],
        },
      },
      {
        id: 'de-bundesstrassen',
        name: 'Mautpflichtige Bundesstraßen',
        country: 'Duitsland',
        countryCode: 'DE',
        tollType: 'per_km',
        description: 'Geselecteerde Bundesstraßen met tol voor >7,5t',
        operator: 'Toll Collect',
        costIndicationMin: 0.187,
        costIndicationMax: 0.228,
        costUnit: 'per_km',
        currency: 'EUR',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
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
    const ratePerKm = vehicleClass === 'truck_40t' ? 0.228 : 
                      vehicleClass === 'truck_18t' ? 0.207 : 0.187;
    return {
      min: Math.round(distanceKm * ratePerKm * 0.9 * 100) / 100,
      max: Math.round(distanceKm * ratePerKm * 1.1 * 100) / 100,
      currency: 'EUR',
    };
  }
}

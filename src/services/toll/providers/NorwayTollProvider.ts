import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Norway Toll Provider
 * AutoPASS system with extensive toll network
 */
export class NorwayTollProvider extends BaseTollProvider {
  constructor() {
    super('NO', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'NO',
      countryName: 'Noorwegen',
      tollTypes: ['per_section', 'hybrid'],
      summary: 'Uitgebreid tolnetwerk met AutoPASS. Veel tolstations, stadsringen en tunnels. Geen vignet.',
      operators: ['AutoPASS', 'Fjellinjen', 'BomPengeSelskapene'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['AutoPASS brikke', 'EPC brikke', 'Automatische registratie + factuur'],
      sourceUrl: 'https://www.autopass.no',
      purchaseUrl: 'https://www.autopass.no',
      purchaseLabel: 'Koop AutoPASS',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'no-oslo-ring',
        name: 'Oslo Bomring',
        country: 'Noorwegen',
        countryCode: 'NO',
        tollType: 'hybrid',
        description: 'Stadsring met tijdsafhankelijke tarieven',
        operator: 'Fjellinjen',
        costIndicationMin: 17,
        costIndicationMax: 85,
        costUnit: 'per_section',
        currency: 'NOK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van tijdstip en voertuigtype',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'Polygon',
          coordinates: [[[10.70, 59.95], [10.82, 59.95], [10.82, 59.90], [10.70, 59.90], [10.70, 59.95]]],
        },
      },
      {
        id: 'no-e18-vestfold',
        name: 'E18 Vestfold',
        country: 'Noorwegen',
        countryCode: 'NO',
        tollType: 'per_section',
        description: 'Tolweg zuidwest van Oslo',
        operator: 'AutoPASS',
        costIndicationMin: 30,
        costIndicationMax: 150,
        costUnit: 'per_section',
        currency: 'NOK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[10.40, 59.26], [10.04, 59.05], [9.60, 59.13]],
        },
      },
      {
        id: 'no-e6-trondheim',
        name: 'Trondheim Bomstasjon',
        country: 'Noorwegen',
        countryCode: 'NO',
        tollType: 'hybrid',
        description: 'Tolring Trondheim',
        operator: 'AutoPASS',
        costIndicationMin: 14,
        costIndicationMax: 70,
        costUnit: 'per_section',
        currency: 'NOK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'Polygon',
          coordinates: [[[10.35, 63.45], [10.45, 63.45], [10.45, 63.40], [10.35, 63.40], [10.35, 63.45]]],
        },
      },
      {
        id: 'no-e6-main',
        name: 'E6 Hoofdroute',
        country: 'Noorwegen',
        countryCode: 'NO',
        tollType: 'per_section',
        description: 'Hoofdweg Oslo - Trondheim - Tromsø',
        operator: 'AutoPASS',
        costIndicationMin: 50,
        costIndicationMax: 500,
        costUnit: 'per_section',
        currency: 'NOK',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Veel tolstations langs de route',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[10.75, 59.91], [11.07, 62.57], [10.40, 63.43], [17.43, 68.44], [18.95, 69.65]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Norway has extensive tolls - estimate per km
    const rates: Record<string, number> = {
      car: 0.30,
      truck_12t: 0.60,
      truck_18t: 0.90,
      truck_40t: 1.20,
    };

    const rate = rates[vehicleClass] || 0.40;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.7 * 100) / 100,
      max: Math.round(cost * 1.3 * 100) / 100,
      currency: 'NOK',
    };
  }
}

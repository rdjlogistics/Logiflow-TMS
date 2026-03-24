import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Spain Toll Provider
 * Extensive autopista (motorway) toll network
 */
export class SpainTollProvider extends BaseTollProvider {
  constructor() {
    super('ES', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'ES',
      countryName: 'Spanje',
      tollTypes: ['per_section', 'per_km'],
      summary: 'Uitgebreid netwerk van tolwegen (autopistas). Tarieven per traject, afhankelijk van voertuigcategorie.',
      operators: ['Abertis', 'Globalvia', 'Itinere', 'Cintra'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['VIA-T', 'Telepass', 'Bip&Go', 'Contant', 'Creditcard'],
      sourceUrl: 'https://www.autopistas.com',
      purchaseUrl: 'https://www.viat.es',
      purchaseLabel: 'Koop Via-T badge',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'es-ap7-barcelona-french-border',
        name: 'AP-7 Barcelona - Franse grens',
        country: 'Spanje',
        countryCode: 'ES',
        tollType: 'per_section',
        description: 'Mediterrane corridor naar Frankrijk',
        operator: 'Abertis',
        costIndicationMin: 12,
        costIndicationMax: 45,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[2.17, 41.39], [2.82, 41.98], [3.03, 42.32]],
        },
      },
      {
        id: 'es-ap7-valencia',
        name: 'AP-7 Valencia regio',
        country: 'Spanje',
        countryCode: 'ES',
        tollType: 'per_section',
        description: 'Kustroute Valencia',
        operator: 'Abertis',
        costIndicationMin: 8,
        costIndicationMax: 35,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-0.38, 39.47], [0.05, 39.99], [0.68, 40.47]],
        },
      },
      {
        id: 'es-ap68-bilbao-zaragoza',
        name: 'AP-68 Bilbao - Zaragoza',
        country: 'Spanje',
        countryCode: 'ES',
        tollType: 'per_section',
        description: 'Verbinding Baskenland - Aragón',
        operator: 'Itinere',
        costIndicationMin: 15,
        costIndicationMax: 55,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-2.93, 43.26], [-1.64, 42.56], [-0.88, 41.65]],
        },
      },
      {
        id: 'es-ap1-burgos-armiñon',
        name: 'AP-1 Burgos - Armiñón',
        country: 'Spanje',
        countryCode: 'ES',
        tollType: 'per_section',
        description: 'Noord-corridor richting Frankrijk',
        operator: 'Itinere',
        costIndicationMin: 10,
        costIndicationMax: 40,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-3.70, 42.34], [-2.75, 42.72]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Spain uses section-based tolls, estimate per km
    const rates: Record<string, number> = {
      car: 0.08,
      truck_12t: 0.12,
      truck_18t: 0.16,
      truck_40t: 0.20,
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

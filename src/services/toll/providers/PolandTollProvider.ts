import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Poland Toll Provider
 * e-TOLL system for trucks and buses, vignette for cars on some roads
 */
export class PolandTollProvider extends BaseTollProvider {
  constructor() {
    super('PL', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'PL',
      countryName: 'Polen',
      tollTypes: ['per_km', 'per_section'],
      summary: 'e-TOLL systeem voor vrachtwagens en bussen. Personenauto\'s betalen op geselecteerde trajecten.',
      operators: ['e-TOLL (KGIT)', 'Stalexport', 'GDDKiA'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['e-TOLL OBU', 'e-TOLL App', 'DKV', 'Telepass'],
      sourceUrl: 'https://etoll.gov.pl',
      purchaseUrl: 'https://etoll.gov.pl',
      purchaseLabel: 'Registreer e-TOLL',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'pl-etoll-network',
        name: 'e-TOLL Netwerk',
        country: 'Polen',
        countryCode: 'PL',
        tollType: 'per_km',
        description: 'Nationaal tolnetwerk voor voertuigen >3,5t',
        operator: 'e-TOLL',
        costIndicationMin: 0.16,
        costIndicationMax: 0.53,
        costUnit: 'per_km',
        currency: 'PLN',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van emissieklasse en wegtype',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[14.55, 53.43], [16.93, 52.41], [19.02, 52.23], [21.01, 52.23]],
            [[19.02, 52.23], [19.94, 50.06], [19.04, 49.68]],
            [[18.64, 54.35], [18.02, 53.13], [17.93, 51.76]],
          ],
        },
      },
      {
        id: 'pl-a4-katowice-krakow',
        name: 'A4 Katowice - Kraków',
        country: 'Polen',
        countryCode: 'PL',
        tollType: 'per_section',
        description: 'Tolweg Stalexport',
        operator: 'Stalexport Autostrada',
        costIndicationMin: 10,
        costIndicationMax: 45,
        costUnit: 'per_section',
        currency: 'PLN',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[19.04, 50.26], [19.94, 50.06]],
        },
      },
      {
        id: 'pl-a2-konin-stryków',
        name: 'A2 Konin - Stryków',
        country: 'Polen',
        countryCode: 'PL',
        tollType: 'per_section',
        description: 'Tolweg A2',
        operator: 'Autostrada Wielkopolska',
        costIndicationMin: 15,
        costIndicationMax: 60,
        costUnit: 'per_section',
        currency: 'PLN',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[18.25, 52.22], [19.50, 51.90]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // e-TOLL rates in PLN
    const rates: Record<string, number> = {
      car: 0.05,
      truck_12t: 0.16,
      truck_18t: 0.32,
      truck_40t: 0.53,
    };

    const rate = rates[vehicleClass] || 0.16;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.9 * 100) / 100,
      max: Math.round(cost * 1.1 * 100) / 100,
      currency: 'PLN',
    };
  }
}

import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Croatia Toll Provider
 * HAC (Croatian Motorways) toll system
 */
export class CroatiaTollProvider extends BaseTollProvider {
  constructor() {
    super('HR', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'HR',
      countryName: 'Kroatië',
      tollTypes: ['per_section'],
      summary: 'Tolwegen met ticketsysteem. ENC (Electronic Toll Collection) beschikbaar voor alle voertuigen.',
      operators: ['HAC', 'ARZ', 'BINA-ISTRA'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['ENC', 'Contant', 'Creditcard', 'DKV', 'Telepass'],
      sourceUrl: 'https://www.hac.hr',
      purchaseUrl: 'https://www.hac.hr',
      purchaseLabel: 'Bestel ENC apparaat',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'hr-a1-zagreb-split',
        name: 'A1 Zagreb - Split - Dubrovnik',
        country: 'Kroatië',
        countryCode: 'HR',
        tollType: 'per_section',
        description: 'Hoofdroute langs de Dalmatische kust',
        operator: 'HAC',
        costIndicationMin: 5,
        costIndicationMax: 35,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[15.98, 45.81], [16.43, 43.51], [17.59, 43.15], [18.09, 42.65]],
        },
      },
      {
        id: 'hr-a3-bregana-lipovac',
        name: 'A3 Bregana - Lipovac',
        country: 'Kroatië',
        countryCode: 'HR',
        tollType: 'per_section',
        description: 'Oost-west corridor (Slovenië - Servië)',
        operator: 'HAC',
        costIndicationMin: 3,
        costIndicationMax: 25,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[15.70, 45.85], [15.98, 45.81], [18.03, 45.28], [19.06, 45.15]],
        },
      },
      {
        id: 'hr-a6-rijeka',
        name: 'A6 Rijeka - Zagreb',
        country: 'Kroatië',
        countryCode: 'HR',
        tollType: 'per_section',
        description: 'Verbinding haven Rijeka met Zagreb',
        operator: 'ARZ',
        costIndicationMin: 4,
        costIndicationMax: 18,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[14.44, 45.33], [15.30, 45.47], [15.98, 45.81]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Croatia uses section-based tolls, estimate per km
    const rates: Record<string, number> = {
      car: 0.07,
      truck_12t: 0.14,
      truck_18t: 0.21,
      truck_40t: 0.28,
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

import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Italy Toll Provider
 * Section-based toll via Autostrade
 * 
 * Future integration points:
 * - Telepass API
 * - DKV integration
 */
export class ItalyTollProvider extends BaseTollProvider {
  constructor() {
    super('IT', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'IT',
      countryName: 'Italië',
      tollTypes: ['per_section'],
      summary: 'Tolpoorten op autostrada\'s. Betaling per traject voor alle voertuigen.',
      operators: ['Autostrade per l\'Italia', 'ANAS', 'Atlantia'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['Telepass', 'Viacard', 'Contant', 'Creditcard', 'DKV'],
      sourceUrl: 'https://www.autostrade.it',
      purchaseUrl: 'https://www.telepass.com',
      purchaseLabel: 'Bestel Telepass',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'it-a1-milano-napoli',
        name: 'A1 Autostrada del Sole',
        country: 'Italië',
        countryCode: 'IT',
        tollType: 'per_section',
        description: 'Milano - Bologna - Firenze - Roma - Napoli',
        operator: 'Autostrade per l\'Italia',
        costIndicationMin: 30,
        costIndicationMax: 180,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [
            [9.19, 45.46], // Milano
            [11.34, 44.49], // Bologna
            [11.25, 43.77], // Firenze
            [12.50, 41.90], // Roma
            [14.27, 40.85], // Napoli
          ],
        },
      },
      {
        id: 'it-a4-torino-trieste',
        name: 'A4 Serenissima',
        country: 'Italië',
        countryCode: 'IT',
        tollType: 'per_section',
        description: 'Torino - Milano - Verona - Venezia - Trieste',
        operator: 'Autostrade per l\'Italia',
        costIndicationMin: 20,
        costIndicationMax: 95,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [
            [7.69, 45.07], // Torino
            [9.19, 45.46], // Milano
            [10.99, 45.44], // Verona
            [12.33, 45.44], // Venezia
            [13.77, 45.65], // Trieste
          ],
        },
      },
      {
        id: 'it-a22-brennero',
        name: 'A22 Autostrada del Brennero',
        country: 'Italië',
        countryCode: 'IT',
        tollType: 'per_section',
        description: 'Brennero - Modena (verbinding met Oostenrijk)',
        operator: 'Autostrada del Brennero SpA',
        costIndicationMin: 15,
        costIndicationMax: 75,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [
            [11.51, 47.00], // Brennero
            [11.35, 46.50], // Bolzano
            [11.12, 46.07], // Trento
            [10.93, 44.65], // Modena
          ],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Italy has 5 vehicle classes, simplified here
    const baseRatePerKm = vehicleClass === 'car' ? 0.07 :
                          vehicleClass === 'truck_40t' ? 0.21 :
                          vehicleClass === 'truck_18t' ? 0.16 : 0.12;

    return {
      min: Math.round(distanceKm * baseRatePerKm * 0.9 * 100) / 100,
      max: Math.round(distanceKm * baseRatePerKm * 1.1 * 100) / 100,
      currency: 'EUR',
    };
  }
}

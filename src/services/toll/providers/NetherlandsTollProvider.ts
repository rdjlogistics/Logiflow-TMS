import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Netherlands Toll Provider
 * Vrachtwagenheffing (truck levy) active since 2026 for vehicles >3.5t
 */
export class NetherlandsTollProvider extends BaseTollProvider {
  constructor() {
    super('NL', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'NL',
      countryName: 'Nederland',
      tollTypes: ['per_km'],
      summary: 'Vrachtwagenheffing (sinds 2026) voor voertuigen >3,5t op autosnelwegen. Tarieven €0,169-€0,258/km afhankelijk van gewichtsklasse en emissieklasse.',
      operators: ['RDW / Vrachtwagenheffing Nederland'],
      vignetteRequired: false,
      truckTollRequired: true,
      paymentMethods: ['OBU (On-Board Unit)'],
      sourceUrl: 'https://www.rijksoverheid.nl/onderwerpen/vrachtwagenheffing',
      purchaseUrl: 'https://www.vrachtwagenheffing.nl',
      purchaseLabel: 'Registreer OBU',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'nl-westerscheldetunnel',
        name: 'Westerscheldetunnel',
        country: 'Nederland',
        countryCode: 'NL',
        tollType: 'per_section',
        description: 'Tolweg tussen Zuid-Beveland en Zeeuws-Vlaanderen',
        operator: 'N.V. Westerscheldetunnel',
        costIndicationMin: 5,
        costIndicationMax: 20,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Prijs afhankelijk van voertuigcategorie',
        lastUpdated: '2026-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[3.87, 51.43], [3.95, 51.38]],
        },
      },
      {
        id: 'nl-kiltunnel',
        name: 'Kiltunnel',
        country: 'Nederland',
        countryCode: 'NL',
        tollType: 'per_section',
        description: 'Tolweg onder het Hollandsch Diep',
        operator: 'Kiltunnel B.V.',
        costIndicationMin: 2.50,
        costIndicationMax: 8,
        costUnit: 'per_section',
        currency: 'EUR',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        lastUpdated: '2026-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[4.55, 51.77], [4.56, 51.75]],
        },
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // Vrachtwagenheffing 2026 rates per km (EUR)
    // Rates vary by weight class and emission class
    const rates: Record<TollVehicleClass, { min: number; max: number }> = {
      car: { min: 0, max: 0 }, // No toll for cars
      truck_12t: { min: 0, max: 0 }, // Bestelbus (<3,5t) vrijgesteld van vrachtwagenheffing
      truck_18t: { min: 0.200, max: 0.230 }, // 12t - 18t
      truck_40t: { min: 0.230, max: 0.258 }, // >18t
    };

    const rate = rates[vehicleClass] || rates.truck_40t;
    return {
      min: Math.round(distanceKm * rate.min * 100) / 100,
      max: Math.round(distanceKm * rate.max * 100) / 100,
      currency: 'EUR',
    };
  }
}

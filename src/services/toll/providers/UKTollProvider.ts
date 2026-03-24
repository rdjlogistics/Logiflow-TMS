import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * UK Toll Provider
 * Limited tolls: Dartford, M6 Toll, Congestion Charge, ULEZ
 */
export class UKTollProvider extends BaseTollProvider {
  constructor() {
    super('GB', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'GB',
      countryName: 'Verenigd Koninkrijk',
      tollTypes: ['per_section', 'hybrid'],
      summary: 'Beperkte tolwegen (Dartford Crossing, M6 Toll). London Congestion Charge en ULEZ voor alle voertuigen.',
      operators: ['National Highways', 'Midland Expressway', 'TfL'],
      vignetteRequired: false,
      truckTollRequired: false,
      paymentMethods: ['Dart Charge', 'M6toll Tag', 'Auto Pay', 'Congestion Charge online'],
      sourceUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      purchaseUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      purchaseLabel: 'Betaal Dart Charge',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'gb-dartford',
        name: 'Dartford Crossing',
        country: 'Verenigd Koninkrijk',
        countryCode: 'GB',
        tollType: 'per_section',
        description: 'Theems-crossing op M25',
        operator: 'National Highways',
        costIndicationMin: 2.50,
        costIndicationMax: 6,
        costUnit: 'per_section',
        currency: 'GBP',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Auto: £2.50, Vrachtwagen: £6. Geen tolpoorten - online betalen (Dart Charge)',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[0.26, 51.47], [0.28, 51.46]],
        },
      },
      {
        id: 'gb-m6-toll',
        name: 'M6 Toll',
        country: 'Verenigd Koninkrijk',
        countryCode: 'GB',
        tollType: 'per_section',
        description: 'Tolweg rond Birmingham',
        operator: 'Midland Expressway',
        costIndicationMin: 6.90,
        costIndicationMax: 13.40,
        costUnit: 'per_section',
        currency: 'GBP',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van dag/nacht en voertuigcategorie',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'LineString',
          coordinates: [[-1.72, 52.56], [-1.78, 52.70], [-1.85, 52.74]],
        },
      },
      {
        id: 'gb-london-congestion',
        name: 'London Congestion Charge',
        country: 'Verenigd Koninkrijk',
        countryCode: 'GB',
        tollType: 'hybrid',
        description: 'Zone in Centraal Londen (ma-vr 7:00-18:00, za-zo 12:00-18:00)',
        operator: 'TfL',
        costIndicationMin: 15,
        costIndicationMax: 15,
        costUnit: 'per_day',
        currency: 'GBP',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: '£15 per dag. Online betalen voor middernacht',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-0.14, 51.52], [-0.08, 51.52], [-0.08, 51.50], [-0.14, 51.50], [-0.14, 51.52]]],
        },
      },
      {
        id: 'gb-london-ulez',
        name: 'London ULEZ',
        country: 'Verenigd Koninkrijk',
        countryCode: 'GB',
        tollType: 'hybrid',
        description: 'Ultra Low Emission Zone - hele Groot-Londen',
        operator: 'TfL',
        costIndicationMin: 12.50,
        costIndicationMax: 100,
        costUnit: 'per_day',
        currency: 'GBP',
        appliesToVehicleClasses: ['car', 'truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Auto: £12.50, Vrachtwagen: £100. Alleen voor niet-conforme voertuigen',
        lastUpdated: '2024-01-01',
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    // UK has limited tolls, estimate typical crossing costs
    const prices: Record<string, { min: number; max: number }> = {
      car: { min: 2.50, max: 15 },
      truck_12t: { min: 6, max: 15 },
      truck_18t: { min: 6, max: 100 },
      truck_40t: { min: 6, max: 100 },
    };

    return { ...prices[vehicleClass] || prices.car, currency: 'GBP' };
  }
}

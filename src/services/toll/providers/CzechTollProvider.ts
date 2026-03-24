import { BaseTollProvider } from './BaseTollProvider';
import { TollCountryInfo, TollZone, TollVehicleClass } from '../types';

/**
 * Czech Republic Toll Provider
 * e-Dalnice (electronic vignette) for cars, MYTO CZ for trucks
 */
export class CzechTollProvider extends BaseTollProvider {
  constructor() {
    super('CZ', 300);
  }

  async getCountryInfo(): Promise<TollCountryInfo> {
    return {
      countryCode: 'CZ',
      countryName: 'Tsjechië',
      tollTypes: ['vignette', 'per_km'],
      summary: 'Elektronische vignet (e-Dálnice) voor personenauto\'s. MYTO CZ kilometerheffing voor vrachtwagens >3,5t.',
      operators: ['SFDI (e-Dálnice)', 'CzechToll (MYTO CZ)'],
      vignetteRequired: true,
      truckTollRequired: true,
      paymentMethods: ['e-Dálnice', 'MYTO CZ OBU', 'DKV', 'Telepass'],
      sourceUrl: 'https://edalnice.cz',
      purchaseUrl: 'https://edalnice.cz',
      purchaseLabel: 'Koop e-Vignet',
    };
  }

  async getTollZones(): Promise<TollZone[]> {
    return [
      {
        id: 'cz-edalnice',
        name: 'e-Dálnice Vignetnetwerk',
        country: 'Tsjechië',
        countryCode: 'CZ',
        tollType: 'vignette',
        description: 'Elektronische vignet voor personenauto\'s op alle snelwegen',
        operator: 'SFDI',
        costIndicationMin: 270,
        costIndicationMax: 2300,
        costUnit: 'per_year',
        currency: 'CZK',
        appliesToVehicleClasses: ['car'],
        notes: '10 dagen: 270 CZK, 30 dagen: 480 CZK, 1 jaar: 2300 CZK',
        lastUpdated: '2024-01-01',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [[12.92, 49.75], [14.42, 50.09], [15.76, 50.04], [17.25, 49.83]],
            [[14.42, 50.09], [14.67, 49.42], [16.61, 49.19]],
            [[14.67, 49.42], [14.47, 48.98]],
          ],
        },
      },
      {
        id: 'cz-myto',
        name: 'MYTO CZ Vrachtwagennetwerk',
        country: 'Tsjechië',
        countryCode: 'CZ',
        tollType: 'per_km',
        description: 'Kilometerheffing voor voertuigen >3,5t',
        operator: 'CzechToll',
        costIndicationMin: 1.67,
        costIndicationMax: 5.30,
        costUnit: 'per_km',
        currency: 'CZK',
        appliesToVehicleClasses: ['truck_12t', 'truck_18t', 'truck_40t'],
        notes: 'Tarief afhankelijk van emissieklasse, wegtype en aantal assen',
        lastUpdated: '2024-01-01',
      },
    ];
  }

  async estimateCost(
    distanceKm: number,
    vehicleClass: TollVehicleClass
  ): Promise<{ min: number; max: number; currency: string }> {
    if (vehicleClass === 'car') {
      // 10-day vignette as reference
      return { min: 270, max: 270, currency: 'CZK' };
    }

    // MYTO rates in CZK per km
    const rates: Record<string, number> = {
      truck_12t: 1.67,
      truck_18t: 3.63,
      truck_40t: 5.30,
    };

    const rate = rates[vehicleClass] || 3.63;
    const cost = distanceKm * rate;

    return {
      min: Math.round(cost * 0.9 * 100) / 100,
      max: Math.round(cost * 1.1 * 100) / 100,
      currency: 'CZK',
    };
  }
}

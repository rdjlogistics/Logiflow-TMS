import { useState, useCallback } from 'react';
import { getTollProvider } from '@/services/toll';
import type { TollZone, TollVehicleClass } from '@/services/toll/types';

export interface TollCostEstimate {
  country: string;
  countryCode: string;
  tollType: string;
  estimatedCost: { min: number; max: number };
  distanceInCountry: number;
  zones: TollZone[];
  notes: string[];
  currency: string;
  operator: string;
  purchaseUrl?: string;
  purchaseLabel?: string;
}

export interface TollDetectionResult {
  hasTolls: boolean;
  totalEstimatedCost: { min: number; max: number };
  countriesWithToll: TollCostEstimate[];
  summary: string;
}

// Vehicle type mapping to toll vehicle class
const VEHICLE_TYPE_MAP: Record<string, TollVehicleClass> = {
  truck: 'truck_40t',
  van: 'truck_12t',
  car: 'car',
  bicycle: 'car',
};

// Simple point-in-polygon check using ray casting
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Detect which country a coordinate is in (with overlap resolution via closest-center)
function getCountryForCoordinate(lng: number, lat: number): string | null {
  const countryBounds: Record<string, { minLng: number; maxLng: number; minLat: number; maxLat: number }> = {
    NL: { minLng: 3.36, maxLng: 7.21, minLat: 50.75, maxLat: 53.55 },
    BE: { minLng: 2.55, maxLng: 6.40, minLat: 49.50, maxLat: 51.50 },
    LU: { minLng: 5.73, maxLng: 6.53, minLat: 49.45, maxLat: 50.18 },
    DE: { minLng: 5.87, maxLng: 15.04, minLat: 47.27, maxLat: 55.06 },
    FR: { minLng: -5.14, maxLng: 9.56, minLat: 41.33, maxLat: 51.09 },
    IT: { minLng: 6.63, maxLng: 18.52, minLat: 35.49, maxLat: 47.09 },
    AT: { minLng: 9.53, maxLng: 17.16, minLat: 46.37, maxLat: 49.02 },
    CH: { minLng: 5.96, maxLng: 10.49, minLat: 45.82, maxLat: 47.81 },
    ES: { minLng: -9.30, maxLng: 4.33, minLat: 35.95, maxLat: 43.79 },
    PL: { minLng: 14.12, maxLng: 24.15, minLat: 49.00, maxLat: 54.84 },
  };

  // Find ALL matching countries (handles overlapping bounding boxes)
  const matches: { code: string; distToCenter: number }[] = [];
  for (const [code, bounds] of Object.entries(countryBounds)) {
    if (lng >= bounds.minLng && lng <= bounds.maxLng && lat >= bounds.minLat && lat <= bounds.maxLat) {
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      const dist = Math.sqrt(Math.pow(lng - centerLng, 2) + Math.pow(lat - centerLat, 2));
      matches.push({ code, distToCenter: dist });
    }
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].code;

  // Multiple matches: pick the country whose center is closest
  matches.sort((a, b) => a.distToCenter - b.distToCenter);
  return matches[0].code;
}

// Calculate approximate distance in km between two coordinates
function haversineDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Duitsland', FR: 'Frankrijk', IT: 'Italië', AT: 'Oostenrijk',
  CH: 'Zwitserland', BE: 'België', NL: 'Nederland', LU: 'Luxemburg',
  ES: 'Spanje', PL: 'Polen',
};

export const useTollDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectTolls = useCallback(async (
    routeGeometry: GeoJSON.LineString,
    vehicleType: string = 'truck'
  ): Promise<TollDetectionResult> => {
    setIsDetecting(true);
    setError(null);

    try {
      const coordinates = routeGeometry.coordinates as [number, number][];
      const vehicleClass = VEHICLE_TYPE_MAP[vehicleType] || 'truck_40t';

      if (coordinates.length < 2) {
        return { hasTolls: false, totalEstimatedCost: { min: 0, max: 0 }, countriesWithToll: [], summary: 'Route te kort voor toldetectie' };
      }

      // Analyze which countries the route passes through
      const countrySegments: Record<string, { distance: number; coords: [number, number][] }> = {};
      for (let i = 0; i < coordinates.length - 1; i++) {
        const coord = coordinates[i];
        const nextCoord = coordinates[i + 1];
        const country = getCountryForCoordinate(coord[0], coord[1]);
        if (country) {
          if (!countrySegments[country]) countrySegments[country] = { distance: 0, coords: [] };
          countrySegments[country].coords.push(coord);
          countrySegments[country].distance += haversineDistance(coord, nextCoord);
        }
      }

      const countriesWithToll: TollCostEstimate[] = [];
      let totalMin = 0, totalMax = 0;

      for (const [countryCode, segment] of Object.entries(countrySegments)) {
        const provider = getTollProvider(countryCode);
        if (!provider) continue;

        const countryInfo = await provider.getCountryInfo();
        const zones = await provider.getTollZones();

        // Check zone intersections
        const intersectedZones: TollZone[] = [];
        for (const zone of zones) {
          if (!zone.geometry || zone.geometry.type !== 'Polygon') continue;
          const zoneCoords = (zone.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][];
          for (const routeCoord of segment.coords) {
            if (pointInPolygon(routeCoord, zoneCoords)) {
              if (!intersectedZones.find(z => z.id === zone.id)) intersectedZones.push(zone);
              break;
            }
          }
        }

        // Estimate costs with the correct vehicle class
        let estimatedMin = 0, estimatedMax = 0;
        const notes: string[] = [];
        const primaryTollType = countryInfo.tollTypes[0] || 'per_km';

        switch (primaryTollType) {
          case 'vignette': {
            const est = await provider.estimateCost(segment.distance, vehicleClass);
            estimatedMin = est.min; estimatedMax = est.max;
            notes.push('Vignet verplicht');
            break;
          }
          case 'per_km': {
            const est = await provider.estimateCost(segment.distance, vehicleClass);
            estimatedMin = est.min; estimatedMax = est.max;
            notes.push(`Tolheffing per km over ${Math.round(segment.distance)} km`);
            break;
          }
          case 'per_section': {
            if (intersectedZones.length > 0) {
              for (const zone of intersectedZones) {
                estimatedMin += zone.costIndicationMin || 0;
                estimatedMax += zone.costIndicationMax || 0;
              }
              notes.push(`${intersectedZones.length} toltraject(en) gedetecteerd`);
            } else {
              const est = await provider.estimateCost(segment.distance, vehicleClass);
              estimatedMin = est.min; estimatedMax = est.max;
              notes.push('Tolwegen mogelijk op route');
            }
            break;
          }
          default: {
            const est = await provider.estimateCost(segment.distance, vehicleClass);
            estimatedMin = est.min; estimatedMax = est.max;
          }
        }

        if (estimatedMax > 0 || (primaryTollType === 'vignette' && countryInfo.vignetteRequired)) {
          countriesWithToll.push({
            country: COUNTRY_NAMES[countryCode] || countryInfo.countryName,
            countryCode,
            tollType: primaryTollType,
            estimatedCost: { min: Math.round(estimatedMin * 100) / 100, max: Math.round(estimatedMax * 100) / 100 },
            distanceInCountry: Math.round(segment.distance * 10) / 10,
            zones: intersectedZones,
            notes,
            currency: zones[0]?.currency || 'EUR',
            operator: countryInfo.operators[0] || '',
            purchaseUrl: countryInfo.purchaseUrl,
            purchaseLabel: countryInfo.purchaseLabel,
          });
          totalMin += estimatedMin;
          totalMax += estimatedMax;
        }
      }

      const hasTolls = countriesWithToll.length > 0;
      let summary = '';
      if (hasTolls) {
        const countryNames = countriesWithToll.map(c => c.country).join(', ');
        summary = `Tolwegen gedetecteerd in: ${countryNames}. Geschatte kosten: €${totalMin.toFixed(2)} - €${totalMax.toFixed(2)}`;
      } else {
        summary = 'Geen tolwegen gedetecteerd op deze route';
      }

      return {
        hasTolls,
        totalEstimatedCost: { min: Math.round(totalMin * 100) / 100, max: Math.round(totalMax * 100) / 100 },
        countriesWithToll,
        summary
      };
    } catch (err: any) {
      console.error('Toll detection error:', err);
      setError(err.message || 'Toldetectie mislukt');
      return { hasTolls: false, totalEstimatedCost: { min: 0, max: 0 }, countriesWithToll: [], summary: 'Toldetectie mislukt' };
    } finally {
      setIsDetecting(false);
    }
  }, []);

  return { detectTolls, isDetecting, error };
};

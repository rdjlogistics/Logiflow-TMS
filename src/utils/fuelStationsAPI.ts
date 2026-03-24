// Fetch real fuel stations from OpenStreetMap Overpass API
// This returns actual fuel station locations across Europe

export interface RealFuelStation {
  id: string;
  name: string;
  brand: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  openingHours?: string;
  facilities: string[];
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    brand?: string;
    operator?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    'addr:country'?: string;
    opening_hours?: string;
    shop?: string;
    toilets?: string;
    car_wash?: string;
    compressed_air?: string;
    'fuel:diesel'?: string;
    'fuel:octane_95'?: string;
    'fuel:octane_98'?: string;
    'fuel:lpg'?: string;
  };
}

interface OverpassResponse {
  elements: OverpassElement[];
}

// Cache for API responses to reduce load
const stationCache = new Map<string, { data: RealFuelStation[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch real fuel stations from OpenStreetMap (Overpass) around a point.
 * Uses small radius + hard limits + request timeouts to stay responsive.
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
];

async function postOverpass(query: string, timeoutMs: number): Promise<OverpassResponse> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let lastErr: unknown = null;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        if (!response.ok) {
          lastErr = new Error(`Overpass API error: ${response.status}`);
          continue;
        }

        // Overpass sometimes returns HTML on overload (504) - this will throw.
        const data: OverpassResponse = await response.json();
        return data;
      } catch (err) {
        lastErr = err;
        // try next endpoint
      }
    }

    throw lastErr ?? new Error('Overpass request failed');
  } finally {
    clearTimeout(t);
  }
}

export async function fetchRealFuelStations(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 30
): Promise<RealFuelStation[]> {
  const cacheKey = `${centerLat.toFixed(2)}_${centerLng.toFixed(2)}_${radiusKm}`;

  const cached = stationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Use an AROUND query (faster than bbox for this use case) + hard limit
    const radiusM = Math.max(1000, Math.min(50000, Math.round(radiusKm * 1000)));

    const query = `
      [out:json][timeout:10];
      (
        node["amenity"="fuel"](around:${radiusM},${centerLat},${centerLng});
        way["amenity"="fuel"](around:${radiusM},${centerLat},${centerLng});
      );
      out center 350;
    `;

    // Keep UI snappy: if Overpass is busy, we fallback quickly.
    const data = await postOverpass(query, 6000);

    const stations: RealFuelStation[] = data.elements
      .map((element): RealFuelStation | null => {
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        if (lat == null || lon == null) return null;

        const tags = element.tags || {};
        const brandRaw = tags.brand || tags.operator || tags.name || 'Tankstation';
        const brand = brandRaw.trim();
        const name = (tags.name || '').trim() || `${brand} Station`;

        const addressParts = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean);
        const address = addressParts.length > 0 ? addressParts.join(' ') : undefined;

        const facilities: string[] = [];
        if (tags.shop === 'yes' || tags.shop === 'convenience') facilities.push('Shop');
        if (tags.toilets === 'yes') facilities.push('Toilet');
        if (tags.car_wash === 'yes') facilities.push('Wasstraat');
        if (tags.compressed_air === 'yes') facilities.push('Luchtpomp');

        return {
          id: `osm-${element.type}-${element.id}`,
          name,
          brand: brand.charAt(0).toUpperCase() + brand.slice(1),
          latitude: lat,
          longitude: lon,
          address,
          city: tags['addr:city'],
          country: tags['addr:country'],
          openingHours: tags.opening_hours,
          facilities,
        };
      })
      .filter((s): s is RealFuelStation => s !== null);

    stationCache.set(cacheKey, { data: stations, timestamp: Date.now() });
    return stations;
  } catch (error) {
    // Return cached data if available (even if expired)
    if (cached) return cached.data;
    return [];
  }
}

// Known brand logos/colors for better UX
export const BRAND_COLORS: Record<string, string> = {
  shell: '#FFD500',
  bp: '#007932',
  esso: '#ED1C24',
  total: '#FF0000',
  tinq: '#E31837',
  texaco: '#E30613',
  gulf: '#FF6600',
  q8: '#E4002B',
  tango: '#FF6600',
  avia: '#003399',
  aral: '#0063AF',
  jet: '#FFCC00',
  tamoil: '#E30613',
  argos: '#0066CC',
};

export function getBrandColor(brand: string): string {
  const key = brand.toLowerCase().replace(/[^a-z]/g, '');
  return BRAND_COLORS[key] || '#6B7280';
}

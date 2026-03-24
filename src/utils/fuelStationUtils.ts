/**
 * Fuel Station Utility Functions
 * Formatting, highway detection, and validation helpers
 */

// Highway/Autobahn brand keywords (German focus)
const HIGHWAY_BRANDS = [
  'aral', 'shell', 'total', 'esso', 'bp', 'agip',
  'autobahn', 'autohof', 'tank & rast', 'sanifair',
  'serways', 'allguth', 'omv', 'eni'
];

// Highway location keywords in address
const HIGHWAY_KEYWORDS = [
  'autobahn', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9',
  'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a20', 'a24', 'a27',
  'a31', 'a40', 'a42', 'a43', 'a44', 'a45', 'a46', 'a52', 'a57',
  'a59', 'a61', 'a81', 'a93', 'a96', 'a99',
  'raststätte', 'rasthof', 'autohof', 'tank & rast',
  'bundesstraße', 'schnellstraße'
];

/**
 * Check if a station is likely a highway/autobahn station
 */
export function isHighwayStation(
  brand: string,
  name: string,
  address: string
): boolean {
  const searchText = `${brand} ${name} ${address}`.toLowerCase();
  
  // Check brand
  const isHighwayBrand = HIGHWAY_BRANDS.some(b => 
    brand.toLowerCase().includes(b)
  );
  
  // Check keywords in name/address
  const hasHighwayKeyword = HIGHWAY_KEYWORDS.some(k => 
    searchText.includes(k.toLowerCase())
  );
  
  return isHighwayBrand || hasHighwayKeyword;
}

/**
 * Format price to EU format with 3 decimals
 * e.g., 1.699 → "1,699"
 */
export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '—';
  return price.toFixed(3).replace('.', ',');
}

/**
 * Format price with currency (single € prefix)
 * e.g., 1.699 → "€1,699"
 */
export function formatPriceWithCurrency(price: number | null): string {
  if (price === null || price === undefined) return 'Prijs onbekend';
  return `€${formatPrice(price)}`;
}

/**
 * Format distance to human-readable string
 * < 1km: show in meters (e.g., "850 m")
 * >= 1km: show in km with 1 decimal (e.g., "2,3 km")
 */
export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null || distanceKm === undefined) return '';
  
  if (distanceKm < 1) {
    // Show in meters, rounded to nearest 10
    const meters = Math.round(distanceKm * 100) * 10;
    return `${meters} m`;
  }
  
  // Show in km with 1 decimal
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
}

/**
 * Get display label for fuel type
 */
export function getFuelTypeLabel(fuelType: string, format: 'short' | 'full' = 'short'): string {
  const labels: Record<string, { short: string; full: string }> = {
    diesel: { short: 'Diesel', full: 'Diesel' },
    e10: { short: 'E10', full: 'Super E10' },
    e5: { short: 'E5', full: 'Super E5' },
    lpg: { short: 'LPG', full: 'Autogas LPG' },
  };
  
  return labels[fuelType]?.[format] ?? fuelType.toUpperCase();
}

/**
 * Get color class for price tier
 */
export function getPriceTierColor(tier: 'cheap' | 'medium' | 'expensive' | 'unknown'): string {
  switch (tier) {
    case 'cheap':
      return 'text-green-600 dark:text-green-400';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'expensive':
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Get background color class for price tier badge
 */
export function getPriceTierBgColor(tier: 'cheap' | 'medium' | 'expensive' | 'unknown'): string {
  switch (tier) {
    case 'cheap':
      return 'bg-green-500/15 border-green-500/30';
    case 'medium':
      return 'bg-yellow-500/15 border-yellow-500/30';
    case 'expensive':
      return 'bg-orange-500/15 border-orange-500/30';
    default:
      return 'bg-muted/30 border-muted/50';
  }
}

/**
 * Check if dev mode is active
 */
export function isDev(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Dev-only logger
 */
export function devLog(message: string, ...args: any[]): void {
  if (isDev()) {
    console.log(`[FuelStations] ${message}`, ...args);
  }
}

/**
 * Dev-only warning logger
 */
export function devWarn(message: string, ...args: any[]): void {
  if (isDev()) {
    console.warn(`[FuelStations] ${message}`, ...args);
  }
}

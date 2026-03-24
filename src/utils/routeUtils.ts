/**
 * Shared route utilities for distance calculations and route optimization
 */

/**
 * Convert degrees to radians
 */
export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Haversine formula for accurate distance calculation between two coordinates in km
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total route distance using haversine formula
 */
export function calculateTotalDistance<T extends { latitude?: number | null; longitude?: number | null }>(
  waypoints: T[]
): number {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const curr = waypoints[i];
    const next = waypoints[i + 1];
    if (curr.latitude && curr.longitude && next.latitude && next.longitude) {
      total += haversineDistance(
        curr.latitude,
        curr.longitude,
        next.latitude,
        next.longitude
      );
    }
  }
  return total;
}

/**
 * 2-opt improvement algorithm for TSP
 * Improves a route by reversing segments that would create shorter paths
 */
export function twoOptImprove<T extends { latitude?: number | null; longitude?: number | null }>(
  route: T[],
  maxIterations: number = 100
): T[] {
  if (route.length < 4) return route;

  const result = [...route];
  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 1; i < result.length - 2; i++) {
      for (let j = i + 1; j < result.length - 1; j++) {
        const prev = result[i - 1];
        const curr = result[i];
        const jNode = result[j];
        const jNext = result[j + 1];

        if (!prev.latitude || !prev.longitude || 
            !curr.latitude || !curr.longitude ||
            !jNode.latitude || !jNode.longitude ||
            !jNext.latitude || !jNext.longitude) {
          continue;
        }

        const currentDist =
          haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude) +
          haversineDistance(jNode.latitude, jNode.longitude, jNext.latitude, jNext.longitude);

        const newDist =
          haversineDistance(prev.latitude, prev.longitude, jNode.latitude, jNode.longitude) +
          haversineDistance(curr.latitude, curr.longitude, jNext.latitude, jNext.longitude);

        if (newDist < currentDist) {
          // Reverse segment between i and j
          const reversed = result.slice(i, j + 1).reverse();
          result.splice(i, j - i + 1, ...reversed);
          improved = true;
        }
      }
    }
  }

  return result;
}

/**
 * Nearest neighbor algorithm for TSP - builds initial route
 */
export function nearestNeighbor<T extends { latitude?: number | null; longitude?: number | null }>(
  start: T,
  remaining: T[]
): T[] {
  const route: T[] = [start];
  const unvisited = [...remaining];

  while (unvisited.length > 0) {
    const last = route[route.length - 1];
    if (!last.latitude || !last.longitude) {
      route.push(unvisited.shift()!);
      continue;
    }

    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const wp = unvisited[i];
      if (!wp.latitude || !wp.longitude) continue;

      const distance = haversineDistance(
        last.latitude,
        last.longitude,
        wp.latitude,
        wp.longitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    route.push(unvisited[nearestIndex]);
    unvisited.splice(nearestIndex, 1);
  }

  return route;
}

/**
 * Fuel consumption constants
 */
export const FUEL_CONSTANTS = {
  CONSUMPTION_PER_100KM: 8, // liters per 100km for delivery truck
  CO2_PER_LITER: 2.68, // kg CO2 per liter diesel
};

/**
 * Calculate estimated fuel consumption
 */
export function calculateFuelConsumption(distanceKm: number): number {
  return (distanceKm / 100) * FUEL_CONSTANTS.CONSUMPTION_PER_100KM;
}

/**
 * Calculate CO2 emissions based on fuel consumption
 */
export function calculateCO2Emissions(fuelLiters: number): number {
  return fuelLiters * FUEL_CONSTANTS.CO2_PER_LITER;
}

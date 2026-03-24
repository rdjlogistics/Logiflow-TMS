import { useState, useCallback } from "react";
import { useMapboxToken } from "./useMapboxToken";
import {
  haversineDistance,
  nearestNeighbor,
  twoOptImprove,
  calculateFuelConsumption,
  calculateCO2Emissions,
} from "@/utils/routeUtils";

export interface OptimizableStop {
  id: string;
  address: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  companyName?: string;
  latitude?: number | null;
  longitude?: number | null;
  stopType: "pickup" | "delivery" | "stop";
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  priority?: "normal" | "high" | "urgent";
  serviceDuration?: number; // minutes spent at stop
  notes?: string;
  documentUrl?: string;
  documentName?: string;
  country?: string;
}

export interface OptimizedStop extends OptimizableStop {
  stopOrder: number;
  etaMinutes: number;
  distanceFromPrevious: number; // km
  arrivalTime?: string;
  departureTime?: string;
}

export interface OptimizationResult {
  stops: OptimizedStop[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  totalDrivingTime: number; // minutes (excluding service time)
  estimatedFuel: number; // liters
  co2Emissions: number; // kg
  savings?: {
    distanceSaved: number;
    timeSaved: number;
  };
  geometry: GeoJSON.LineString;
}

export type OptimizationStrategy = "fastest" | "shortest";

interface OptimizationOptions {
  strategy: OptimizationStrategy;
  respectTimeWindows: boolean;
  startTime?: Date;
  returnToStart?: boolean;
}

// Fuel constants moved to routeUtils.ts

export const useAdvancedRouteOptimization = () => {
  const { token } = useMapboxToken();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate route without optimization (current order)
  const calculateRoute = useCallback(
    async (stops: OptimizableStop[]): Promise<OptimizationResult | null> => {
      if (!token || stops.length < 2) return null;

      const validStops = stops.filter(
        (s) => s.latitude !== null && s.longitude !== null && s.latitude && s.longitude
      );
      if (validStops.length < 2) return null;

      setIsOptimizing(true);
      setError(null);

      try {
        const coordinates = validStops
          .map((s) => `${s.longitude},${s.latitude}`)
          .join(";");

        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?` +
            `geometries=geojson&overview=full&steps=false&annotations=distance,duration&access_token=${token}`
        );

        if (!response.ok) throw new Error("Route berekening mislukt");

        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
          throw new Error("Geen route gevonden");
        }

        const route = data.routes[0];
        let cumulativeTime = 0;
        let cumulativeDistance = 0;

        const optimizedStops: OptimizedStop[] = validStops.map((stop, index) => {
          const leg = route.legs[index - 1];
          const legDistance = leg ? leg.distance / 1000 : 0;
          const legDuration = leg ? leg.duration / 60 : 0;

          if (index > 0) {
            cumulativeDistance += legDistance;
            cumulativeTime += legDuration;
          }

          return {
            ...stop,
            stopOrder: index + 1,
            etaMinutes: cumulativeTime,
            distanceFromPrevious: legDistance,
          };
        });

        const totalDistance = route.distance / 1000;
        const totalDrivingTime = route.duration / 60;
        const serviceDuration = validStops.reduce(
          (sum, s) => sum + (s.serviceDuration || 0),
          0
        );
        const estimatedFuel = calculateFuelConsumption(totalDistance);

        return {
          stops: optimizedStops,
          totalDistance,
          totalDuration: totalDrivingTime + serviceDuration,
          totalDrivingTime,
          estimatedFuel,
          co2Emissions: calculateCO2Emissions(estimatedFuel),
          geometry: route.geometry,
        };
      } catch (err: any) {
        console.error("Route calculation error:", err);
        setError(err.message || "Route berekening mislukt");
        return null;
      } finally {
        setIsOptimizing(false);
      }
    },
    [token]
  );

  // Optimize route using Mapbox Optimization API (or nearest-neighbor heuristic)
  const optimizeRoute = useCallback(
    async (
      stops: OptimizableStop[],
      options: OptimizationOptions
    ): Promise<OptimizationResult | null> => {
      if (!token || stops.length < 2) return null;

      const validStops = stops.filter(
        (s) => s.latitude !== null && s.longitude !== null && s.latitude && s.longitude
      );
      if (validStops.length < 2) return null;

      setIsOptimizing(true);
      setError(null);

      try {
        // Calculate original route distance for comparison
        const originalCoords = validStops
          .map((s) => `${s.longitude},${s.latitude}`)
          .join(";");
        
        const originalResponse = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${originalCoords}?` +
            `geometries=geojson&overview=full&access_token=${token}`
        );
        const originalData = await originalResponse.json();
        const originalDistance = originalData.routes?.[0]?.distance / 1000 || 0;
        const originalDuration = originalData.routes?.[0]?.duration / 60 || 0;

        // Sort by priority first (urgent first, then high, then normal)
        const prioritySorted = [...validStops].sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, normal: 2 };
          const aPriority = priorityOrder[a.priority || "normal"];
          const bPriority = priorityOrder[b.priority || "normal"];
          return aPriority - bPriority;
        });

        // Find stops with time windows that must be respected
        const timeWindowStops = prioritySorted.filter(
          (s) => options.respectTimeWindows && (s.timeWindowStart || s.timeWindowEnd)
        );
        const flexibleStops = prioritySorted.filter(
          (s) => !options.respectTimeWindows || (!s.timeWindowStart && !s.timeWindowEnd)
        );

        // Phase 1: Build initial route
        let optimized: OptimizableStop[] = [];
        
        if (timeWindowStops.length > 0) {
          // Sort time window stops by window start time
          const sortedTimeWindow = [...timeWindowStops].sort((a, b) => {
            const aStart = a.timeWindowStart ? new Date(a.timeWindowStart).getTime() : 0;
            const bStart = b.timeWindowStart ? new Date(b.timeWindowStart).getTime() : 0;
            return aStart - bStart;
          });
          optimized = sortedTimeWindow;
        }

        // Add flexible stops using nearest-neighbor with proper Haversine distance
        const remaining = [...flexibleStops];
        while (remaining.length > 0) {
          const lastStop = optimized.length > 0 ? optimized[optimized.length - 1] : null;
          
          if (!lastStop || !lastStop.latitude || !lastStop.longitude) {
            optimized.push(remaining.shift()!);
            continue;
          }

          let nearestIndex = 0;
          let nearestDistance = Infinity;

          for (let i = 0; i < remaining.length; i++) {
            const stop = remaining[i];
            if (!stop.latitude || !stop.longitude) continue;
            
            // Use accurate Haversine distance calculation
            const distance = haversineDistance(
              lastStop.latitude,
              lastStop.longitude,
              stop.latitude,
              stop.longitude
            );
            
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = i;
            }
          }

          optimized.push(remaining[nearestIndex]);
          remaining.splice(nearestIndex, 1);
        }

        // Phase 2: 2-opt improvement for better TSP solution
        optimized = twoOptImprove(optimized, 100);

        // Calculate optimized route
        const optimizedCoords = optimized
          .map((s) => `${s.longitude},${s.latitude}`)
          .join(";");

        const profile = options.strategy === "shortest" ? "driving" : "driving-traffic";
        
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/${profile}/${optimizedCoords}?` +
            `geometries=geojson&overview=full&steps=false&annotations=distance,duration&access_token=${token}`
        );

        if (!response.ok) throw new Error("Optimalisatie mislukt");

        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
          throw new Error("Geen geoptimaliseerde route gevonden");
        }

        const route = data.routes[0];
        let cumulativeTime = 0;
        let cumulativeDistance = 0;
        const startTime = options.startTime || new Date();

        const optimizedStops: OptimizedStop[] = optimized.map((stop, index) => {
          const leg = route.legs[index - 1];
          const legDistance = leg ? leg.distance / 1000 : 0;
          const legDuration = leg ? leg.duration / 60 : 0;

          if (index > 0) {
            cumulativeDistance += legDistance;
            cumulativeTime += legDuration;
          }

          const arrivalTime = new Date(startTime.getTime() + cumulativeTime * 60 * 1000);
          const departureTime = new Date(
            arrivalTime.getTime() + (stop.serviceDuration || 0) * 60 * 1000
          );

          return {
            ...stop,
            stopOrder: index + 1,
            etaMinutes: cumulativeTime,
            distanceFromPrevious: legDistance,
            arrivalTime: arrivalTime.toISOString(),
            departureTime: departureTime.toISOString(),
          };
        });

        const totalDistance = route.distance / 1000;
        const totalDrivingTime = route.duration / 60;
        const serviceDuration = optimized.reduce(
          (sum, s) => sum + (s.serviceDuration || 0),
          0
        );
        const estimatedFuel = calculateFuelConsumption(totalDistance);

        return {
          stops: optimizedStops,
          totalDistance,
          totalDuration: totalDrivingTime + serviceDuration,
          totalDrivingTime,
          estimatedFuel,
          co2Emissions: calculateCO2Emissions(estimatedFuel),
          savings: {
            distanceSaved: Math.max(0, originalDistance - totalDistance),
            timeSaved: Math.max(0, originalDuration - totalDrivingTime),
          },
          geometry: route.geometry,
        };
      } catch (err: any) {
        console.error("Route optimization error:", err);
        setError(err.message || "Route optimalisatie mislukt");
        return null;
      } finally {
        setIsOptimizing(false);
      }
    },
    [token]
  );

  return {
    calculateRoute,
    optimizeRoute,
    isOptimizing,
    error,
  };
};

import { useState, useCallback } from "react";
import { useMapboxToken } from "./useMapboxToken";
import { useTollDetection, TollDetectionResult } from "./useTollDetection";
import {
  haversineDistance,
  twoOptImprove,
  calculateFuelConsumption,
} from "@/utils/routeUtils";

interface Waypoint {
  latitude: number;
  longitude: number;
  address?: string;
}

interface RouteStats {
  totalDistance: number;
  totalDuration: number;
  estimatedFuel: number;
  numberOfStops: number;
  avgSpeedKmh: number;
}

interface LegInfo {
  distance: number; // km
  duration: number; // minutes
}

interface RouteResult {
  stats: RouteStats;
  legs: LegInfo[];
  geometry: GeoJSON.LineString;
  tollInfo?: TollDetectionResult;
}

export const useRouteOptimization = () => {
  const { token } = useMapboxToken();
  const { detectTolls, isDetecting: isDetectingTolls } = useTollDetection();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(
    async (waypoints: Waypoint[], includeTollDetection: boolean = true): Promise<RouteResult | null> => {
      if (!token || waypoints.length < 2) {
        return null;
      }

      setIsCalculating(true);
      setError(null);

      try {
        // Build coordinates string for Mapbox API
        const coordinates = waypoints
          .map((wp) => `${wp.longitude},${wp.latitude}`)
          .join(";");

        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?` +
            `geometries=geojson&overview=full&steps=false&annotations=distance,duration&access_token=${token}`
        );

        if (!response.ok) {
          throw new Error("Failed to calculate route");
        }

        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
          throw new Error("No route found");
        }

        const route = data.routes[0];
        
        // Extract leg information
        const legs: LegInfo[] = route.legs.map((leg: any) => ({
          distance: leg.distance / 1000, // Convert meters to km
          duration: leg.duration / 60, // Convert seconds to minutes
        }));

        // Calculate totals
        const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0);
        const totalDuration = legs.reduce((sum, leg) => sum + leg.duration, 0);
        const estimatedFuel = calculateFuelConsumption(totalDistance);
        const avgSpeedKmh = totalDuration > 0 ? (totalDistance / totalDuration) * 60 : 0;

        const stats: RouteStats = {
          totalDistance,
          totalDuration,
          estimatedFuel,
          numberOfStops: waypoints.length,
          avgSpeedKmh,
        };

        // Detect toll roads on the route
        let tollInfo: TollDetectionResult | undefined;
        if (includeTollDetection && route.geometry) {
          tollInfo = await detectTolls(route.geometry);
        }

        return {
          stats,
          legs,
          geometry: route.geometry,
          tollInfo,
        };
      } catch (err: any) {
        console.error("Route calculation error:", err);
        setError(err.message || "Route calculation failed");
        return null;
      } finally {
        setIsCalculating(false);
      }
    },
    [token, detectTolls]
  );

  const optimizeStopOrder = useCallback(
    async (waypoints: Waypoint[]): Promise<Waypoint[] | null> => {
      if (!token || waypoints.length < 3) {
        return waypoints;
      }

      setIsCalculating(true);
      setError(null);

      try {
        // Use nearest-neighbor + 2-opt improvement for better TSP solution
        const optimized: Waypoint[] = [waypoints[0]];
        const remaining = [...waypoints.slice(1)];

        // Phase 1: Nearest neighbor construction
        while (remaining.length > 0) {
          const last = optimized[optimized.length - 1];
          let nearestIndex = 0;
          let nearestDistance = Infinity;

          for (let i = 0; i < remaining.length; i++) {
            const wp = remaining[i];
            const distance = haversineDistance(
              last.latitude, last.longitude,
              wp.latitude, wp.longitude
            );
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = i;
            }
          }

          optimized.push(remaining[nearestIndex]);
          remaining.splice(nearestIndex, 1);
        }

        // Phase 2: 2-opt improvement
        let improved = true;
        let iterations = 0;
        const maxIterations = 100;

        while (improved && iterations < maxIterations) {
          improved = false;
          iterations++;

          for (let i = 1; i < optimized.length - 2; i++) {
            for (let j = i + 1; j < optimized.length - 1; j++) {
              const currentDist = 
                haversineDistance(optimized[i-1].latitude, optimized[i-1].longitude, optimized[i].latitude, optimized[i].longitude) +
                haversineDistance(optimized[j].latitude, optimized[j].longitude, optimized[j+1].latitude, optimized[j+1].longitude);
              
              const newDist = 
                haversineDistance(optimized[i-1].latitude, optimized[i-1].longitude, optimized[j].latitude, optimized[j].longitude) +
                haversineDistance(optimized[i].latitude, optimized[i].longitude, optimized[j+1].latitude, optimized[j+1].longitude);

              if (newDist < currentDist) {
                // Reverse segment between i and j
                const newRoute = [
                  ...optimized.slice(0, i),
                  ...optimized.slice(i, j + 1).reverse(),
                  ...optimized.slice(j + 1)
                ];
                optimized.splice(0, optimized.length, ...newRoute);
                improved = true;
              }
            }
          }
        }

        return optimized;
      } catch (err: any) {
        console.error("Route optimization error:", err);
        setError(err.message || "Route optimization failed");
        return null;
      } finally {
        setIsCalculating(false);
      }
    },
    [token]
  );

  return {
    calculateRoute,
    optimizeStopOrder,
    isCalculating,
    isDetectingTolls,
    error,
  };
};

// Local haversine functions removed - now imported from routeUtils

export type { RouteResult, RouteStats, LegInfo, Waypoint, TollDetectionResult };

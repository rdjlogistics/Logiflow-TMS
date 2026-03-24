import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { haversineDistance, nearestNeighbor, twoOptImprove } from '@/utils/routeUtils';

export interface RouteStop {
  id: string;
  address: string;
  city: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  timeWindow?: {
    from: string;
    to: string;
  };
  priority?: 'high' | 'medium' | 'low';
  estimatedDuration?: number; // minutes
}

export interface OptimizedRoute {
  id: string;
  stops: RouteStop[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  estimatedFuelCost: number; // EUR
  co2Emissions: number; // kg
  optimizationScore: number; // 0-100
  geometry?: GeoJSON.LineString;
  factors: {
    traffic: 'light' | 'moderate' | 'heavy';
    weather: 'clear' | 'rain' | 'snow' | 'fog';
    driverPreference: string;
  };
  savings: {
    distanceSaved: number; // km
    timeSaved: number; // minutes
    fuelSaved: number; // EUR
  };
  aiAnalysis?: {
    reasoning: string;
    tips: string[];
    confidence: number;
  };
  alternativeRoutes?: OptimizedRoute[];
}

export interface OptimizationRequest {
  stops: RouteStop[];
  vehicleType?: 'van' | 'truck' | 'car';
  departureTime?: string;
  driverId?: string;
  preferences?: {
    avoidHighways?: boolean;
    avoidTolls?: boolean;
    avoidFerries?: boolean;
    preferFastest?: boolean;
    preferShortest?: boolean;
  };
}

export function useAIRouteOptimizer() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: tenantSettings } = useTenantSettings();

  const optimizeRoute = useCallback(async (request: OptimizationRequest): Promise<OptimizedRoute | null> => {
    if (request.stops.length < 2) {
      toast({
        title: "Minimaal 2 stops",
        description: "Voeg minimaal 2 stops toe om een route te optimaliseren.",
        variant: "destructive"
      });
      return null;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      // Merge tenant route settings into the request
      const enrichedRequest = {
        ...request,
        vehicleType: request.vehicleType || tenantSettings?.route_vehicle_type || 'van',
        serviceTimeMinutes: tenantSettings?.route_service_time_minutes ?? 15,
        speedPercentage: tenantSettings?.route_speed_percentage ?? 85,
      };

      const { data, error: fnError } = await supabase.functions.invoke('ai-route-optimizer', {
        body: enrichedRequest
      });

      if (fnError) throw fnError;

      const result = data as OptimizedRoute;
      setOptimizedRoute(result);

      toast({
        title: "Route geoptimaliseerd",
        description: `${result.savings.timeSaved} min en ${result.savings.distanceSaved.toFixed(1)} km bespaard`,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Optimalisatie mislukt';
      setError(message);
      toast({
        title: "Optimalisatie mislukt",
        description: message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, [toast, tenantSettings]);

  const reorderStops = useCallback((fromIndex: number, toIndex: number) => {
    if (!optimizedRoute) return;

    const newStops = [...optimizedRoute.stops];
    const [removed] = newStops.splice(fromIndex, 1);
    newStops.splice(toIndex, 0, removed);

    setOptimizedRoute({
      ...optimizedRoute,
      stops: newStops
    });
  }, [optimizedRoute]);

  const calculateLocalOptimization = useCallback((stops: RouteStop[]): {
    estimatedDistance: number;
    estimatedDuration: number;
    optimizationPotential: number;
    optimizedStops?: RouteStop[];
  } => {
    // Check if we have coordinates for optimization
    const stopsWithCoords = stops.filter(s => s.latitude && s.longitude);
    
    if (stopsWithCoords.length < 2) {
      // Fallback to estimates
      const avgDistancePerStop = 25;
      const avgTimePerStop = 35;
      return {
        estimatedDistance: stops.length * avgDistancePerStop,
        estimatedDuration: stops.length * avgTimePerStop,
        optimizationPotential: 5
      };
    }

    // Calculate original distance using haversine
    let originalDistance = 0;
    for (let i = 0; i < stopsWithCoords.length - 1; i++) {
      const curr = stopsWithCoords[i];
      const next = stopsWithCoords[i + 1];
      originalDistance += haversineDistance(
        curr.latitude!, curr.longitude!,
        next.latitude!, next.longitude!
      );
    }

    // Run nearest neighbor to build initial route, then improve with 2-opt
    const firstStop = stopsWithCoords[0];
    const remainingStops = stopsWithCoords.slice(1);
    const nnRoute = nearestNeighbor(firstStop, remainingStops);
    const optimizedStops = twoOptImprove(nnRoute, 100);

    // Calculate optimized distance
    let optimizedDistance = 0;
    for (let i = 0; i < optimizedStops.length - 1; i++) {
      const curr = optimizedStops[i];
      const next = optimizedStops[i + 1];
      if (curr.latitude && curr.longitude && next.latitude && next.longitude) {
        optimizedDistance += haversineDistance(
          curr.latitude, curr.longitude,
          next.latitude, next.longitude
        );
      }
    }
    
    // Estimate duration (avg 60 km/h + 15 min per stop)
    const estimatedDuration = (optimizedDistance / 60) * 60 + stopsWithCoords.length * 15;
    
    const savings = originalDistance - optimizedDistance;
    const optimizationPotential = originalDistance > 0 
      ? Math.round((savings / originalDistance) * 100) 
      : 0;

    return {
      estimatedDistance: Math.round(optimizedDistance * 10) / 10,
      estimatedDuration: Math.round(estimatedDuration),
      optimizationPotential: Math.max(0, optimizationPotential),
      optimizedStops
    };
  }, []);

  return {
    isOptimizing,
    optimizedRoute,
    error,
    optimizeRoute,
    reorderStops,
    calculateLocalOptimization,
    clearRoute: () => setOptimizedRoute(null)
  };
}

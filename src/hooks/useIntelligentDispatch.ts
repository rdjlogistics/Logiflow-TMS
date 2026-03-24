import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface DriverProfile {
  id: string;
  name: string;
  currentLocation?: { lat: number; lng: number };
  vehicleType: string;
  skills: string[];
  rating: number;
  availableFrom: string;
  availableTo: string;
  currentWorkload: number;
  maxWorkload: number;
  preferences: {
    maxDistance?: number;
    preferredAreas?: string[];
    avoidNightShifts?: boolean;
  };
}

export interface DispatchRecommendation {
  driverId: string;
  driverName: string;
  score: number;
  factors: {
    name: string;
    score: number;
    weight: number;
    description: string;
  }[];
  estimatedArrival: string;
  distanceToPickup: number;
  workloadImpact: 'low' | 'medium' | 'high';
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
  isFallback?: boolean;
}

export interface DispatchRequest {
  orderId: string;
  pickupLocation: { lat: number; lng: number; city: string };
  deliveryLocation: { lat: number; lng: number; city: string };
  pickupTime: string;
  requiredSkills?: string[];
  vehicleRequirements?: string;
  priority?: 'urgent' | 'normal' | 'low';
}

async function buildFallbackRecommendations(pickupTime: string): Promise<DispatchRecommendation[]> {
  const { data: drivers } = await supabase
    .from('profiles')
    .select('user_id, full_name, phone')
    .limit(20);

  if (!drivers || drivers.length === 0) return [];

  const today = new Date().toISOString().split('T')[0];
  const { data: todayTrips } = await supabase
    .from('trips')
    .select('driver_id')
    .gte('trip_date', today)
    .lte('trip_date', today + 'T23:59:59');

  const workloadMap = new Map<string, number>();
  (todayTrips || []).forEach((t: { driver_id: string | null }) => {
    if (t.driver_id) workloadMap.set(t.driver_id, (workloadMap.get(t.driver_id) || 0) + 1);
  });

  return drivers
    .sort((a, b) => (workloadMap.get(a.user_id) || 0) - (workloadMap.get(b.user_id) || 0))
    .slice(0, 5)
    .map((d, i) => {
      const wl = workloadMap.get(d.user_id) || 0;
      return {
        driverId: d.user_id,
        driverName: d.full_name || 'Onbekend',
        score: Math.max(50, 95 - i * 10 - wl * 5),
        factors: [
          { name: 'Werkdruk', score: Math.max(20, 100 - wl * 15), weight: 0.4, description: `${wl} ritten vandaag` },
        ],
        estimatedArrival: pickupTime,
        distanceToPickup: 10 + i * 5,
        workloadImpact: (wl < 3 ? 'low' : wl < 6 ? 'medium' : 'high') as 'low' | 'medium' | 'high',
        recommendation: (i === 0 ? 'highly_recommended' : i < 3 ? 'recommended' : 'acceptable') as DispatchRecommendation['recommendation'],
        isFallback: true,
      };
    });
}

export function useIntelligentDispatch() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<DispatchRecommendation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const analyzeDispatch = useCallback(async (request: DispatchRequest): Promise<DispatchRecommendation[]> => {
    if (!user?.id) {
      toast({ title: "Niet ingelogd", description: "Log in om dispatch te analyseren", variant: "destructive" });
      return [];
    }

    setIsAnalyzing(true);
    setUsedFallback(false);

    try {
      const { data, error } = await supabase.functions.invoke('intelligent-dispatch', { body: request });

      if (error) {
        // Handle specific HTTP errors from the edge function
        if (error instanceof FunctionsHttpError) {
          const status = error.context?.status;
          if (status === 402 || status === 429) {
            toast({
              title: status === 402 ? "AI credits niet beschikbaar" : "AI tijdelijk niet beschikbaar",
              description: "Lokale scoring wordt gebruikt als alternatief",
            });
            const fallback = await buildFallbackRecommendations(request.pickupTime);
            setRecommendations(fallback);
            setUsedFallback(true);
            return fallback;
          }
        }
        throw error;
      }

      const result = data.recommendations as DispatchRecommendation[];
      setRecommendations(result);
      if (result.length > 0) {
        toast({ title: "Analyse voltooid", description: `${result.length} chauffeurs geanalyseerd` });
      }
      return result;
    } catch (err) {
      console.error('Dispatch analysis error:', err);
      // Fallback for any other error
      try {
        const fallback = await buildFallbackRecommendations(request.pickupTime);
        setRecommendations(fallback);
        setUsedFallback(true);
        if (fallback.length > 0) {
          toast({ title: "Lokale analyse gebruikt", description: "AI niet beschikbaar, werkdruk-scoring toegepast" });
          return fallback;
        }
      } catch {
        // fallback also failed
      }
      toast({ title: "Analyse mislukt", description: "Geen chauffeurdata beschikbaar", variant: "destructive" });
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [user?.id, toast]);

  const assignDriver = useCallback(async (orderId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ driver_id: driverId, status: 'gepland' as const })
        .eq('id', orderId);

      if (error) throw error;
      setSelectedDriver(driverId);
      toast({ title: "Chauffeur toegewezen", description: "Order is succesvol toegewezen" });
      return true;
    } catch (err) {
      console.error('Assignment error:', err);
      toast({ title: "Toewijzing mislukt", description: "Kon chauffeur niet toewijzen", variant: "destructive" });
      return false;
    }
  }, [toast]);

  const autoAssignBatch = useCallback(async (orders: DispatchRequest[]) => {
    const analysisResults = await Promise.all(
      orders.map(async (order) => {
        const recs = await analyzeDispatch(order);
        return { order, recs };
      })
    );

    const assignmentPromises = analysisResults
      .filter(({ recs }) => recs.length > 0 && recs[0].recommendation !== 'not_recommended')
      .map(async ({ order, recs }) => {
        const success = await assignDriver(order.orderId, recs[0].driverId);
        return { orderId: order.orderId, driverId: recs[0].driverId, success };
      });

    const results = await Promise.all(assignmentPromises);
    const successCount = results.filter(r => r.success).length;
    toast({ title: "Batch toewijzing", description: `${successCount}/${orders.length} orders succesvol toegewezen` });
    return results;
  }, [analyzeDispatch, assignDriver, toast]);

  const topRecommendation = useMemo(() =>
    recommendations.find(r => r.recommendation === 'highly_recommended') || recommendations[0],
    [recommendations]
  );

  return {
    isAnalyzing,
    recommendations,
    selectedDriver,
    topRecommendation,
    usedFallback,
    analyzeDispatch,
    assignDriver,
    autoAssignBatch,
    clearRecommendations: () => setRecommendations([])
  };
}

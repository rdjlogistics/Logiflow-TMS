import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLearningSystem } from './useLearningSystem';

// Types for ML-style scoring
interface DriverFeatures {
  driverId: string;
  driverName: string;
  distance: number;
  workloadToday: number;
  workloadWeek: number;
  avgRating: number;
  onTimeRate: number;
  experienceScore: number;
  routeFamiliarity: number;
  vehicleMatch: number;
  availabilityScore: number;
  costEfficiency: number;
  customerPreference: number;
}

interface ScoredDriver {
  driverId: string;
  driverName: string;
  totalScore: number;
  confidence: number;
  factors: {
    name: string;
    score: number;
    weight: number;
    contribution: number;
    description: string;
  }[];
  estimatedETA: string;
  estimatedCost: number;
  warnings: string[];
  recommendations: string[];
}

interface DispatchPrediction {
  tripId: string;
  pickupCity: string;
  deliveryCity: string;
  pickupDate: string;
  drivers: ScoredDriver[];
  topPick: ScoredDriver | null;
  autoAssignConfidence: number;
  processingTimeMs: number;
}

const DEFAULT_WEIGHTS = {
  distance: 0.20,
  workload: 0.15,
  onTime: 0.20,
  experience: 0.10,
  routeFamiliarity: 0.15,
  vehicleMatch: 0.05,
  availability: 0.10,
  customerPreference: 0.05,
};

export const usePredictiveDispatch = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<DispatchPrediction[]>([]);
  const { toast } = useToast();
  const { recordDecision, getSuggestions } = useLearningSystem();

  const normalize = useCallback((value: number, min: number, max: number, inverse: boolean = false): number => {
    if (max === min) return 0.5;
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return inverse ? 1 - normalized : normalized;
  }, []);

  const calculateFactorScores = useCallback((features: DriverFeatures): ScoredDriver['factors'] => {
    const factors: ScoredDriver['factors'] = [];

    const distanceScore = normalize(features.distance, 0, 100, true);
    factors.push({
      name: 'Afstand',
      score: distanceScore,
      weight: DEFAULT_WEIGHTS.distance,
      contribution: distanceScore * DEFAULT_WEIGHTS.distance,
      description: `${features.distance.toFixed(0)} km van ophaallocatie`,
    });

    const workloadScore = normalize(features.workloadToday, 0, 5, true);
    factors.push({
      name: 'Werkdruk',
      score: workloadScore,
      weight: DEFAULT_WEIGHTS.workload,
      contribution: workloadScore * DEFAULT_WEIGHTS.workload,
      description: `${features.workloadToday} ritten vandaag`,
    });

    const onTimeScore = normalize(features.onTimeRate, 0.7, 1.0, false);
    factors.push({
      name: 'Punctualiteit',
      score: onTimeScore,
      weight: DEFAULT_WEIGHTS.onTime,
      contribution: onTimeScore * DEFAULT_WEIGHTS.onTime,
      description: `${(features.onTimeRate * 100).toFixed(0)}% op tijd`,
    });

    const experienceScore = normalize(features.experienceScore, 0, 24, false);
    factors.push({
      name: 'Ervaring',
      score: experienceScore,
      weight: DEFAULT_WEIGHTS.experience,
      contribution: experienceScore * DEFAULT_WEIGHTS.experience,
      description: `${features.experienceScore} maanden actief`,
    });

    const familiarityScore = normalize(features.routeFamiliarity, 0, 10, false);
    factors.push({
      name: 'Route Bekendheid',
      score: familiarityScore,
      weight: DEFAULT_WEIGHTS.routeFamiliarity,
      contribution: familiarityScore * DEFAULT_WEIGHTS.routeFamiliarity,
      description: `${features.routeFamiliarity}x deze route gereden`,
    });

    factors.push({
      name: 'Voertuig Match',
      score: features.vehicleMatch,
      weight: DEFAULT_WEIGHTS.vehicleMatch,
      contribution: features.vehicleMatch * DEFAULT_WEIGHTS.vehicleMatch,
      description: features.vehicleMatch >= 0.8 ? 'Ideaal voertuig' : 'Geschikt voertuig',
    });

    factors.push({
      name: 'Beschikbaarheid',
      score: features.availabilityScore,
      weight: DEFAULT_WEIGHTS.availability,
      contribution: features.availabilityScore * DEFAULT_WEIGHTS.availability,
      description: features.availabilityScore >= 0.8 ? 'Direct beschikbaar' : 'Beperkt beschikbaar',
    });

    const prefScore = features.customerPreference;
    factors.push({
      name: 'Klant Voorkeur',
      score: prefScore,
      weight: DEFAULT_WEIGHTS.customerPreference,
      contribution: prefScore * DEFAULT_WEIGHTS.customerPreference,
      description: prefScore > 0.5 ? 'Eerdere samenwerking' : 'Nieuw voor klant',
    });

    return factors;
  }, [normalize]);

  const generateWarnings = useCallback((features: DriverFeatures): string[] => {
    const warnings: string[] = [];
    if (features.workloadToday >= 4) warnings.push('Hoge werkdruk vandaag');
    if (features.onTimeRate < 0.85) warnings.push('Punctualiteit onder gemiddelde');
    if (features.distance > 50) warnings.push('Grote afstand naar ophaallocatie');
    if (features.availabilityScore < 0.5) warnings.push('Beperkte beschikbaarheid');
    return warnings;
  }, []);

  const generateRecommendations = useCallback((features: DriverFeatures, factors: ScoredDriver['factors']): string[] => {
    const recommendations: string[] = [];
    const sorted = [...factors].sort((a, b) => a.contribution - b.contribution);
    
    if (sorted[0].name === 'Afstand' && features.distance > 30) {
      recommendations.push('Overweeg een chauffeur dichter bij de ophaallocatie');
    }
    if (sorted[0].name === 'Route Bekendheid' && features.routeFamiliarity < 2) {
      recommendations.push('Eerste keer op deze route - extra tijd inplannen');
    }
    if (features.onTimeRate >= 0.95) recommendations.push('✓ Uitstekende punctualiteit');
    if (features.routeFamiliarity >= 5) recommendations.push('✓ Zeer ervaren op deze route');
    if (features.customerPreference > 0.7) recommendations.push('✓ Positieve ervaring met deze klant');
    return recommendations;
  }, []);

  const buildDriverFeatures = useCallback((
    driver: any,
    tripContext: { pickupCity: string; deliveryCity: string; customerId?: string },
    workloadToday: number,
    routeCount: number,
    customerTripCount: number,
  ): DriverFeatures => {
    const rating = driver.rating ?? 3.5;
    const totalTrips = driver.total_trips ?? 0;
    const onTimePct = driver.on_time_percentage ?? 85;

    // Deterministic distance based on city match
    const driverCity = (driver.current_city || '').toLowerCase();
    const pickupCity = (tripContext.pickupCity || '').toLowerCase();
    let distance: number;
    if (driverCity && pickupCity && driverCity === pickupCity) {
      distance = 5;
    } else if (driverCity && pickupCity && (driverCity.includes(pickupCity) || pickupCity.includes(driverCity))) {
      distance = 25;
    } else {
      distance = 50;
    }

    // Experience in months based on total trips (rough: 1 month ≈ 20 trips)
    const experienceMonths = Math.min(36, Math.round(totalTrips / 20));

    // Availability: less workload = more available
    const availabilityScore = Math.max(0, Math.min(1, 1 - workloadToday * 0.25));

    // Customer preference based on prior trips with this customer
    const customerPreference = Math.min(1, customerTripCount * 0.2);

    return {
      driverId: driver.id || driver.user_id,
      driverName: driver.name || driver.full_name || 'Onbekend',
      distance,
      workloadToday,
      workloadWeek: workloadToday * 5, // Approximate
      avgRating: rating,
      onTimeRate: onTimePct / 100,
      experienceScore: experienceMonths,
      routeFamiliarity: routeCount,
      vehicleMatch: 0.85, // Default: vehicle data not yet available per driver
      availabilityScore,
      costEfficiency: 1.0,
      customerPreference,
    };
  }, []);

  const scoreDriver = useCallback((
    features: DriverFeatures,
  ): ScoredDriver => {
    const factors = calculateFactorScores(features);
    const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0);
    
    // Confidence based on data quality (fixed 0.85 — real data available)
    const dataQuality = 0.85;
    const confidence = totalScore * dataQuality;

    const warnings = generateWarnings(features);
    const recommendations = generateRecommendations(features, factors);

    const etaMinutes = Math.round(15 + features.distance * 1.2);
    const etaHours = Math.floor(etaMinutes / 60);
    const etaMins = etaMinutes % 60;
    const estimatedETA = etaHours > 0 ? `${etaHours}u ${etaMins}m` : `${etaMins}m`;
    const estimatedCost = Math.round(25 + features.distance * 0.85);

    return {
      driverId: features.driverId,
      driverName: features.driverName,
      totalScore: Math.round(totalScore * 100),
      confidence: Math.round(confidence * 100),
      factors,
      estimatedETA,
      estimatedCost,
      warnings,
      recommendations,
    };
  }, [calculateFactorScores, generateWarnings, generateRecommendations]);

  const analyzeBatch = useCallback(async (companyId: string): Promise<DispatchPrediction[]> => {
    setIsAnalyzing(true);
    const startTime = Date.now();

    try {
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, pickup_city, delivery_city, trip_date, customer_id')
        .eq('company_id', companyId)
        .is('driver_id', null)
        .in('status', ['gepland', 'onderweg'])
        .limit(10);

      if (tripsError) throw tripsError;

      // Fetch drivers with real data fields
      const { data: drivers, error: driversError } = await (supabase
        .from('drivers') as any)
        .select('id, name, rating, current_city, total_trips, on_time_percentage')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .limit(20);

      if (driversError) throw driversError;

      // Fetch today's workload per driver
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTrips } = await supabase
        .from('trips')
        .select('driver_id')
        .eq('company_id', companyId)
        .eq('trip_date', today)
        .not('driver_id', 'is', null);

      const workloadMap = new Map<string, number>();
      (todayTrips || []).forEach((t: any) => {
        workloadMap.set(t.driver_id, (workloadMap.get(t.driver_id) || 0) + 1);
      });

      // Fetch route familiarity: count past trips per driver per pickup→delivery pair
      const routeCountMap = new Map<string, number>();
      const customerCountMap = new Map<string, number>();

      // For efficiency, batch-query completed trips for these drivers
      const driverIds = (drivers || []).map((d: any) => d.id);
      if (driverIds.length > 0) {
        const { data: pastTrips } = await supabase
          .from('trips')
          .select('driver_id, pickup_city, delivery_city, customer_id')
          .in('driver_id', driverIds)
          .eq('status', 'afgeleverd')
          .limit(50);

        (pastTrips || []).forEach((pt: any) => {
          const routeKey = `${pt.driver_id}_${(pt.pickup_city || '').toLowerCase()}_${(pt.delivery_city || '').toLowerCase()}`;
          routeCountMap.set(routeKey, (routeCountMap.get(routeKey) || 0) + 1);
          if (pt.customer_id) {
            const custKey = `${pt.driver_id}_${pt.customer_id}`;
            customerCountMap.set(custKey, (customerCountMap.get(custKey) || 0) + 1);
          }
        });
      }

      const newPredictions: DispatchPrediction[] = [];

      for (const trip of (trips || []) as any[]) {
        const learnedSuggestions = getSuggestions({ pickupCity: trip.pickup_city });
        
        const scoredDrivers = (drivers || []).map((driver: any) => {
          const workload = workloadMap.get(driver.id) || 0;
          const routeKey = `${driver.id}_${(trip.pickup_city || '').toLowerCase()}_${(trip.delivery_city || '').toLowerCase()}`;
          const routeCount = routeCountMap.get(routeKey) || 0;
          const custKey = `${driver.id}_${trip.customer_id || ''}`;
          const customerTripCount = trip.customer_id ? (customerCountMap.get(custKey) || 0) : 0;

          const features = buildDriverFeatures(
            driver,
            { pickupCity: trip.pickup_city, deliveryCity: trip.delivery_city, customerId: trip.customer_id },
            workload,
            routeCount,
            customerTripCount,
          );

          return scoreDriver(features);
        });

        // Apply learned preference boost
        learnedSuggestions.forEach(suggestion => {
          if (suggestion.action === 'assign_driver' && suggestion.context?.driverId) {
            const driver = scoredDrivers.find(d => d.driverId === suggestion.context?.driverId);
            if (driver) {
              driver.totalScore = Math.min(100, driver.totalScore + Math.round(suggestion.confidence * 10));
              driver.recommendations.unshift(`📚 ${suggestion.description}`);
            }
          }
        });

        scoredDrivers.sort((a, b) => b.totalScore - a.totalScore);

        const topPick = scoredDrivers[0] || null;
        
        let autoAssignConfidence = 0;
        if (scoredDrivers.length >= 2) {
          const gap = scoredDrivers[0].totalScore - scoredDrivers[1].totalScore;
          autoAssignConfidence = Math.min(95, topPick?.confidence || 0) + (gap > 15 ? 10 : 0);
        } else if (scoredDrivers.length === 1) {
          autoAssignConfidence = topPick?.confidence || 0;
        }

        newPredictions.push({
          tripId: trip.id,
          pickupCity: trip.pickup_city || 'Onbekend',
          deliveryCity: trip.delivery_city || 'Onbekend',
          pickupDate: trip.trip_date || '',
          drivers: scoredDrivers.slice(0, 5),
          topPick,
          autoAssignConfidence,
          processingTimeMs: Date.now() - startTime,
        });
      }

      setPredictions(newPredictions);
      
      toast({
        title: '🤖 AI Dispatch Geanalyseerd',
        description: `${newPredictions.length} ritten, ${(drivers || []).length} chauffeurs beoordeeld`,
      });

      return newPredictions;
    } catch (error) {
      console.error('Predictive dispatch error:', error);
      toast({ title: 'Analyse mislukt', variant: 'destructive' });
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, [scoreDriver, buildDriverFeatures, getSuggestions, toast]);

  const assignDriver = useCallback(async (
    tripId: string, 
    driverId: string,
    driverName: string,
    context: { pickupCity: string; deliveryCity: string }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ driver_id: driverId })
        .eq('id', tripId);

      if (error) throw error;

      await recordDecision('dispatch_decision', {
        pickupCity: context.pickupCity,
        deliveryCity: context.deliveryCity,
        processingTimeMs: Date.now(),
      }, { tripId, driverId, driverName });

      setPredictions(prev => prev.filter(p => p.tripId !== tripId));

      toast({
        title: '✓ Chauffeur Toegewezen',
        description: `${driverName} toegewezen`,
      });

      return true;
    } catch (error) {
      console.error('Assignment error:', error);
      toast({ title: 'Toewijzing mislukt', variant: 'destructive' });
      return false;
    }
  }, [recordDecision, toast]);

  const autoAssignBatch = useCallback(async (confidenceThreshold: number = 85): Promise<number> => {
    const eligible = predictions.filter(p => p.autoAssignConfidence >= confidenceThreshold && p.topPick);
    let assigned = 0;

    for (const prediction of eligible) {
      if (prediction.topPick) {
        const success = await assignDriver(
          prediction.tripId,
          prediction.topPick.driverId,
          prediction.topPick.driverName,
          { pickupCity: prediction.pickupCity, deliveryCity: prediction.deliveryCity }
        );
        if (success) assigned++;
      }
    }

    if (assigned > 0) {
      toast({
        title: '🚀 Batch Toegewezen',
        description: `${assigned} ritten automatisch toegewezen`,
      });
    }

    return assigned;
  }, [predictions, assignDriver, toast]);

  const stats = useMemo(() => ({
    totalPending: predictions.length,
    highConfidence: predictions.filter(p => p.autoAssignConfidence >= 85).length,
    mediumConfidence: predictions.filter(p => p.autoAssignConfidence >= 70 && p.autoAssignConfidence < 85).length,
    lowConfidence: predictions.filter(p => p.autoAssignConfidence < 70).length,
    avgConfidence: predictions.length > 0
      ? Math.round(predictions.reduce((sum, p) => sum + p.autoAssignConfidence, 0) / predictions.length)
      : 0,
  }), [predictions]);

  return {
    isAnalyzing,
    predictions,
    stats,
    analyzeBatch,
    assignDriver,
    autoAssignBatch,
    clearPredictions: useCallback(() => setPredictions([]), []),
  };
};

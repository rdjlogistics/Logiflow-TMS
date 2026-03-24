import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, endOfDay, subDays, addDays, format, parseISO, differenceInDays, getDay, getHours } from 'date-fns';
import { nl } from 'date-fns/locale';
import { queryCache, useDebounce } from './useQueryCache';

export interface Prediction {
  id: string;
  type: 'delay_risk' | 'cost_forecast' | 'demand_prediction' | 'driver_fatigue' | 'maintenance_due' | 'peak_period';
  confidence: number; // 0-100
  title: string;
  description: string;
  predictedValue?: number;
  predictedDate?: string;
  factors: string[];
  recommendation?: string;
  impact?: {
    type: 'positive' | 'negative' | 'neutral';
    value: number;
    unit: string;
  };
}

interface HistoricalPattern {
  dayOfWeek: number;
  hourOfDay: number;
  avgTrips: number;
  avgDelay: number;
  avgRevenue: number;
}

interface TripData {
  id: string;
  trip_date: string;
  status: string;
  pickup_city: string | null;
  delivery_city: string | null;
  sales_total: number | null;
  purchase_total: number | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  pickup_time_from: string | null;
  delivery_time_from: string | null;
  driver_id: string | null;
  customer_id: string | null;
  created_at: string;
}

export function usePredictiveAnalytics() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalPatterns, setHistoricalPatterns] = useState<HistoricalPattern[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const CACHE_KEY = `predictions-${user?.id}`;

  const analyzePatternsAndPredict = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30).toISOString();
      const sevenDaysAhead = addDays(today, 7).toISOString();

      // Fetch historical data
      const [
        { data: historicalTrips },
        { data: upcomingTrips },
        { data: drivers },
        { data: vehicles },
      ] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .gte('trip_date', thirtyDaysAgo)
          .lte('trip_date', today.toISOString())
          .order('trip_date', { ascending: true }),
        supabase
          .from('trips')
          .select('*, customer:customers(company_name)')
          .gte('trip_date', startOfDay(today).toISOString())
          .lte('trip_date', sevenDaysAhead)
          .in('status', ['draft', 'aanvraag', 'offerte', 'gepland', 'geladen', 'onderweg']),
        supabase
          .from('profiles')
          .select('user_id, full_name'),
        supabase
          .from('vehicles')
          .select('*'),
      ]);

      const newPredictions: Prediction[] = [];

      // 1. DELAY RISK PREDICTION
      // Analyze historical delays per route/time
      const delayPatterns = new Map<string, { totalDelay: number; count: number }>();
      
      ((historicalTrips || []) as unknown as TripData[]).forEach((trip) => {
        if (trip.actual_departure && trip.pickup_time_from) {
          const planned = new Date(trip.pickup_time_from);
          const actual = new Date(trip.actual_departure);
          const delayMinutes = (actual.getTime() - planned.getTime()) / 60000;
          
          const routeKey = `${trip.pickup_city}-${trip.delivery_city}`;
          const existing = delayPatterns.get(routeKey) || { totalDelay: 0, count: 0 };
          delayPatterns.set(routeKey, {
            totalDelay: existing.totalDelay + delayMinutes,
            count: existing.count + 1,
          });
        }
      });

      // Check upcoming trips for delay risk
      (upcomingTrips || []).forEach((trip: any) => {
        const routeKey = `${trip.pickup_city}-${trip.delivery_city}`;
        const pattern = delayPatterns.get(routeKey);
        
        if (pattern && pattern.count >= 2) {
          const avgDelay = pattern.totalDelay / pattern.count;
          
          if (avgDelay > 15) { // More than 15 min average delay
            const confidence = Math.min(95, 60 + (pattern.count * 5));
            newPredictions.push({
              id: `delay-${trip.id}`,
              type: 'delay_risk',
              confidence,
              title: `Vertragingsrisico: ${trip.pickup_city} → ${trip.delivery_city}`,
              description: `Op basis van ${pattern.count} eerdere ritten is er een verhoogd risico op vertraging van ~${Math.round(avgDelay)} minuten.`,
              predictedValue: Math.round(avgDelay),
              predictedDate: trip.trip_date,
              factors: [
                `Historisch gemiddelde: ${Math.round(avgDelay)} min vertraging`,
                `Gebaseerd op ${pattern.count} ritten`,
                trip.customer?.company_name ? `Klant: ${trip.customer.company_name}` : '',
              ].filter(Boolean),
              recommendation: 'Plan extra buffertijd in of overweeg een alternatieve route.',
              impact: {
                type: 'negative',
                value: Math.round(avgDelay),
                unit: 'minuten vertraging verwacht',
              },
            });
          }
        }
      });

      // 2. DEMAND PREDICTION
      // Analyze day-of-week patterns
      const dayPatterns = new Map<number, number[]>();
      
      ((historicalTrips || []) as unknown as TripData[]).forEach((trip) => {
        const tripDate = parseISO(trip.trip_date);
        const day = getDay(tripDate);
        
        if (!dayPatterns.has(day)) {
          dayPatterns.set(day, []);
        }
        dayPatterns.get(day)?.push(1);
      });

      // Calculate average trips per day of week
      const avgByDay = new Map<number, number>();
      dayPatterns.forEach((trips, day) => {
        avgByDay.set(day, trips.length / 4); // Last 4 weeks
      });

      // Predict next 7 days
      for (let i = 1; i <= 7; i++) {
        const futureDate = addDays(today, i);
        const dayOfWeek = getDay(futureDate);
        const avgTrips = avgByDay.get(dayOfWeek) || 0;
        
        if (avgTrips > 0) {
          const todayTrips = (upcomingTrips || []).filter((t: any) => 
            format(parseISO(t.trip_date), 'yyyy-MM-dd') === format(futureDate, 'yyyy-MM-dd')
          ).length;
          
          const difference = todayTrips - avgTrips;
          
          if (Math.abs(difference) > avgTrips * 0.3) { // >30% difference from average
            newPredictions.push({
              id: `demand-${format(futureDate, 'yyyy-MM-dd')}`,
              type: 'demand_prediction',
              confidence: Math.min(90, 65 + (dayPatterns.get(dayOfWeek)?.length || 0) * 3),
              title: difference > 0 
                ? `Drukke dag verwacht: ${format(futureDate, 'EEEE d MMM', { locale: nl })}`
                : `Rustige dag verwacht: ${format(futureDate, 'EEEE d MMM', { locale: nl })}`,
              description: difference > 0
                ? `${todayTrips} ritten gepland vs ${Math.round(avgTrips)} gemiddeld. Overweeg extra capaciteit.`
                : `Slechts ${todayTrips} ritten gepland vs ${Math.round(avgTrips)} gemiddeld. Ideaal voor onderhoud.`,
              predictedValue: todayTrips,
              predictedDate: format(futureDate, 'yyyy-MM-dd'),
              factors: [
                `Gemiddeld ${Math.round(avgTrips)} ritten op ${format(futureDate, 'EEEE', { locale: nl })}`,
                `Nu ${todayTrips} ritten gepland`,
              ],
              recommendation: difference > 0 
                ? 'Plan extra chauffeurs in of wijs verzoeken eerder door.'
                : 'Goed moment voor voertuigonderhoud of trainingen.',
              impact: {
                type: difference > 0 ? 'negative' : 'positive',
                value: Math.abs(Math.round(difference)),
                unit: difference > 0 ? 'extra ritten boven normaal' : 'ritten minder dan normaal',
              },
            });
          }
        }
      }

      // 3. COST FORECAST
      // Calculate average costs and predict weekly costs
      const weeklyRevenue: number[] = [];
      const weeklyCosts: number[] = [];
      
      // Group by week
      ((historicalTrips || []) as unknown as TripData[]).forEach((trip) => {
        if (trip.sales_total) {
          weeklyRevenue.push(Number(trip.sales_total));
        }
        if (trip.purchase_total) {
          weeklyCosts.push(Number(trip.purchase_total));
        }
      });

      if (weeklyRevenue.length > 0) {
        const avgRevenue = weeklyRevenue.reduce((a, b) => a + b, 0) / weeklyRevenue.length;
        const avgCost = weeklyCosts.length > 0 
          ? weeklyCosts.reduce((a, b) => a + b, 0) / weeklyCosts.length 
          : 0;
        
        const upcomingCount = (upcomingTrips || []).length;
        const predictedRevenue = avgRevenue * upcomingCount;
        const predictedCost = avgCost * upcomingCount;
        const predictedMargin = predictedRevenue - predictedCost;
        const marginPercent = predictedRevenue > 0 ? (predictedMargin / predictedRevenue) * 100 : 0;

        newPredictions.push({
          id: 'cost-forecast-week',
          type: 'cost_forecast',
          confidence: Math.min(85, 55 + weeklyRevenue.length),
          title: `Weekomzet prognose: €${Math.round(predictedRevenue).toLocaleString('nl-NL')}`,
          description: `Op basis van ${upcomingCount} geplande ritten en historische gemiddelden.`,
          predictedValue: Math.round(predictedRevenue),
          predictedDate: format(addDays(today, 7), 'yyyy-MM-dd'),
          factors: [
            `${upcomingCount} ritten gepland`,
            `Gemiddelde omzet per rit: €${Math.round(avgRevenue)}`,
            `Verwachte marge: ${marginPercent.toFixed(1)}%`,
          ],
          recommendation: marginPercent < 15 
            ? 'Marge ligt onder target. Overweeg tariefherziening.'
            : 'Marge ziet er goed uit. Focus op volume.',
          impact: {
            type: marginPercent >= 15 ? 'positive' : 'negative',
            value: Math.round(predictedMargin),
            unit: 'EUR verwachte winst',
          },
        });
      }

      // 4. PEAK PERIOD DETECTION
      const hourPatterns = new Map<number, number>();
      ((historicalTrips || []) as unknown as TripData[]).forEach((trip) => {
        if (trip.pickup_time_from) {
          const hour = getHours(parseISO(trip.pickup_time_from));
          hourPatterns.set(hour, (hourPatterns.get(hour) || 0) + 1);
        }
      });

      // Find peak hours
      let peakHour = 0;
      let peakCount = 0;
      hourPatterns.forEach((count, hour) => {
        if (count > peakCount) {
          peakCount = count;
          peakHour = hour;
        }
      });

      if (peakCount > 0) {
        newPredictions.push({
          id: 'peak-period',
          type: 'peak_period',
          confidence: 80,
          title: `Piekuur: ${peakHour}:00 - ${peakHour + 1}:00`,
          description: `De meeste ophalingen vinden plaats tussen ${peakHour}:00 en ${peakHour + 1}:00. Plan hier extra capaciteit.`,
          factors: [
            `${peakCount} ophalingen in dit uur (afgelopen 30 dagen)`,
            'Gebaseerd op historische patronen',
          ],
          recommendation: 'Zorg dat alle chauffeurs klaar zijn voor dit piekmoment.',
          impact: {
            type: 'neutral',
            value: peakCount,
            unit: 'ophalingen in piekuur',
          },
        });
      }

      // 5. DRIVER FATIGUE PREDICTION
      // Check drivers with many consecutive trips
      const driverTripCounts = new Map<string, number>();
      const recentDriverTrips = ((historicalTrips || []) as unknown as TripData[]).filter((t) => 
        differenceInDays(today, parseISO(t.trip_date)) <= 7
      );

      recentDriverTrips.forEach((trip) => {
        if (trip.driver_id) {
          driverTripCounts.set(trip.driver_id, (driverTripCounts.get(trip.driver_id) || 0) + 1);
        }
      });

      driverTripCounts.forEach((count, driverId) => {
        if (count >= 15) { // More than 15 trips in a week
          const driver = drivers?.find((d) => d.user_id === driverId);
          newPredictions.push({
            id: `fatigue-${driverId}`,
            type: 'driver_fatigue',
            confidence: Math.min(90, 60 + count * 2),
            title: `Hoge werkdruk: ${driver?.full_name || 'Chauffeur'}`,
            description: `${count} ritten in de afgelopen 7 dagen. Risico op vermoeidheid.`,
            factors: [
              `${count} ritten in 7 dagen`,
              'Wettelijke rusttijden kunnen in gevaar komen',
            ],
            recommendation: 'Plan rust in of verdeel werk over andere chauffeurs.',
            impact: {
              type: 'negative',
              value: count,
              unit: 'ritten deze week',
            },
          });
        }
      });

      // 6. MAINTENANCE PREDICTION
      // Check vehicles with high usage
      if (vehicles && vehicles.length > 0) {
        vehicles.forEach((vehicle: any) => {
          if (vehicle.current_km && vehicle.last_service_km) {
            const kmSinceService = vehicle.current_km - vehicle.last_service_km;
            
            if (kmSinceService > 15000) { // Due for service
              newPredictions.push({
                id: `maintenance-${vehicle.id}`,
                type: 'maintenance_due',
                confidence: 95,
                title: `Onderhoud nodig: ${vehicle.license_plate}`,
                description: `${kmSinceService.toLocaleString('nl-NL')} km sinds laatste service. Onderhoud dringend aanbevolen.`,
                factors: [
                  `Huidige km-stand: ${vehicle.current_km?.toLocaleString('nl-NL') || 'Onbekend'}`,
                  `Laatste service: ${vehicle.last_service_km?.toLocaleString('nl-NL') || 'Onbekend'} km`,
                ],
                recommendation: 'Plan zo snel mogelijk een servicebeurt in.',
                impact: {
                  type: 'negative',
                  value: kmSinceService,
                  unit: 'km sinds laatste service',
                },
              });
            }
          }
        });
      }

      // Sort by confidence (highest first)
      newPredictions.sort((a, b) => b.confidence - a.confidence);

      // Cache the results
      queryCache.set(CACHE_KEY, newPredictions, 10 * 60 * 1000); // 10 min cache
      
      if (mountedRef.current) {
        setPredictions(newPredictions);
        setLastUpdated(new Date());
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Voorspellingen konden niet worden gegenereerd';
      console.error('Error generating predictions:', err);
      if (mountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id, CACHE_KEY]);

  // Debounced version for realtime updates
  const debouncedAnalyze = useDebounce(analyzePatternsAndPredict, 2000);

  useEffect(() => {
    mountedRef.current = true;
    
    // Try to get from cache first
    const cached = queryCache.get<Prediction[]>(CACHE_KEY);
    if (cached) {
      setPredictions(cached);
      setLoading(false);
      // Revalidate in background if stale
      if (queryCache.isStale(CACHE_KEY, 5 * 60 * 1000)) {
        analyzePatternsAndPredict();
      }
    } else {
      analyzePatternsAndPredict();
    }
    
    // Refresh every 15 minutes
    const interval = setInterval(analyzePatternsAndPredict, 15 * 60 * 1000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [user?.id, CACHE_KEY, analyzePatternsAndPredict]);

  const delayPredictions = useMemo(() => 
    predictions.filter((p) => p.type === 'delay_risk'),
    [predictions]
  );

  const demandPredictions = useMemo(() => 
    predictions.filter((p) => p.type === 'demand_prediction'),
    [predictions]
  );

  const costForecasts = useMemo(() => 
    predictions.filter((p) => p.type === 'cost_forecast'),
    [predictions]
  );

  const highConfidencePredictions = useMemo(() => 
    predictions.filter((p) => p.confidence >= 75),
    [predictions]
  );

  return {
    predictions,
    loading,
    error,
    lastUpdated,
    refresh: analyzePatternsAndPredict,
    delayPredictions,
    demandPredictions,
    costForecasts,
    highConfidencePredictions,
    historicalPatterns,
    invalidateCache: () => queryCache.invalidate(CACHE_KEY),
  };
}

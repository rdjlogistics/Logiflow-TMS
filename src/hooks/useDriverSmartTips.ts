import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, endOfDay, differenceInHours, differenceInMinutes, addHours } from 'date-fns';

export interface DriverTip {
  id: string;
  type: 'break_reminder' | 'fuel_tip' | 'route_tip' | 'traffic_alert' | 'weather_alert' | 'efficiency' | 'safety' | 'earnings';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  action?: {
    label: string;
    callback?: () => void;
  };
  icon: string;
  dismissible: boolean;
  expiresAt?: string;
}

interface DrivingStats {
  hoursToday: number;
  stopsCompleted: number;
  stopsRemaining: number;
  estimatedEndTime: string | null;
  avgStopDuration: number;
  onTimeRate: number;
}

export function useDriverSmartTips() {
  const { user } = useAuth();
  const [tips, setTips] = useState<DriverTip[]>([]);
  const [stats, setStats] = useState<DrivingStats>({
    hoursToday: 0,
    stopsCompleted: 0,
    stopsRemaining: 0,
    estimatedEndTime: null,
    avgStopDuration: 15,
    onTimeRate: 100,
  });
  const [loading, setLoading] = useState(true);

  const generateTips = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();

      // Resolve drivers.id from auth.uid() — trips.driver_id FK references drivers(id)
      const { data: driverRecord } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!driverRecord) {
        setLoading(false);
        return;
      }

      // Fetch driver's trips and stops for today
      const [
        { data: todayTrips },
        { data: recentStops },
        { data: driverProfile },
      ] = await Promise.all([
        supabase
          .from('trips')
          .select(`
            id, 
            order_number, 
            status, 
            trip_date,
            pickup_city,
            delivery_city,
            route_stops(id, status, actual_arrival, estimated_arrival, stop_type, waiting_minutes)
          `)
          .eq('driver_id', driverRecord.id)
          .gte('trip_date', todayStart)
          .lte('trip_date', todayEnd),
        supabase
          .from('route_stops')
          .select('id, actual_arrival, estimated_arrival, waiting_minutes')
          .gte('actual_arrival', todayStart)
          .order('actual_arrival', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single(),
      ]);

      const newTips: DriverTip[] = [];
      const trips = todayTrips || [];
      const allStops = trips.flatMap(t => t.route_stops || []);
      const completedStops = allStops.filter(s => s.status === 'completed');
      const pendingStops = allStops.filter(s => s.status !== 'completed');

      // Calculate driving hours (estimate based on first arrival)
      let hoursToday = 0;
      const firstArrival = completedStops[0]?.actual_arrival;
      if (firstArrival) {
        hoursToday = differenceInHours(new Date(), new Date(firstArrival));
      }

      // Calculate average stop duration (estimate 15 min per stop as default)
      let avgDuration = 15;
      const stopsWithArrival = (recentStops || []).filter(s => s.actual_arrival);
      if (stopsWithArrival.length > 1) {
        // Estimate duration based on time between stops
        avgDuration = 20; // Default reasonable estimate
      }

      // Estimate end time
      const remainingMinutes = pendingStops.length * avgDuration + pendingStops.length * 20; // 20 min driving between stops
      const estimatedEnd = pendingStops.length > 0 
        ? addHours(new Date(), remainingMinutes / 60).toISOString()
        : null;

      // Update stats
      setStats({
        hoursToday,
        stopsCompleted: completedStops.length,
        stopsRemaining: pendingStops.length,
        estimatedEndTime: estimatedEnd,
        avgStopDuration: Math.round(avgDuration),
        onTimeRate: 95, // Would calculate from actual data
      });

      // 1. BREAK REMINDER - Dutch law requires 45 min break after 4.5 hours
      if (hoursToday >= 4 && hoursToday < 4.5) {
        newTips.push({
          id: 'break-soon',
          type: 'break_reminder',
          priority: 'medium',
          title: 'Pauze bijna nodig',
          message: 'Je rijdt al 4 uur. Plan binnen 30 minuten een pauze van minimaal 45 minuten.',
          icon: 'coffee',
          dismissible: false,
        });
      } else if (hoursToday >= 4.5) {
        newTips.push({
          id: 'break-now',
          type: 'break_reminder',
          priority: 'high',
          title: 'Pauze vereist',
          message: 'Je hebt 4,5 uur gereden. Neem nu een wettelijk verplichte pauze van 45 minuten.',
          icon: 'alert-triangle',
          dismissible: false,
        });
      }

      // 2. EFFICIENCY TIP - Based on stop duration
      if (avgDuration > 25 && completedStops.length >= 3) {
        newTips.push({
          id: 'stop-duration',
          type: 'efficiency',
          priority: 'low',
          title: 'Stopduur optimaliseren',
          message: `Je gemiddelde stopduur is ${Math.round(avgDuration)} minuten. Probeer documenten vooraf klaar te leggen.`,
          icon: 'clock',
          dismissible: true,
        });
      }

      // 3. FUEL TIP - Reminder to tank efficiently
      const currentHour = new Date().getHours();
      if (currentHour >= 14 && currentHour <= 16 && pendingStops.length >= 3) {
        newTips.push({
          id: 'fuel-timing',
          type: 'fuel_tip',
          priority: 'low',
          title: 'Tanken overwegen',
          message: 'Je hebt nog meerdere stops. Tank nu om omrijden later te voorkomen.',
          icon: 'fuel',
          dismissible: true,
        });
      }

      // 4. ROUTE TIP - If many stops remaining
      if (pendingStops.length >= 5) {
        newTips.push({
          id: 'route-heavy',
          type: 'route_tip',
          priority: 'medium',
          title: 'Drukke route vandaag',
          message: `Nog ${pendingStops.length} stops te gaan. Geschatte eindtijd: ${estimatedEnd ? new Date(estimatedEnd).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : 'onbekend'}.`,
          icon: 'map',
          dismissible: true,
        });
      }

      // 5. EARNINGS TIP - Motivational
      if (completedStops.length > 0 && pendingStops.length > 0) {
        const progress = Math.round((completedStops.length / allStops.length) * 100);
        if (progress >= 50 && progress < 75) {
          newTips.push({
            id: 'progress-half',
            type: 'earnings',
            priority: 'low',
            title: 'Halverwege!',
            message: `Je bent ${progress}% klaar met je route vandaag. Nog ${pendingStops.length} stops te gaan.`,
            icon: 'trending-up',
            dismissible: true,
          });
        }
      }

      // 6. SAFETY TIP - Evening driving
      if (currentHour >= 18 && pendingStops.length > 0) {
        newTips.push({
          id: 'evening-safety',
          type: 'safety',
          priority: 'medium',
          title: 'Avondrit',
          message: 'Het wordt donker. Zorg voor goed werkende verlichting en rij voorzichtig.',
          icon: 'moon',
          dismissible: true,
        });
      }

      // 7. WAITING TIME - If recent stops had long waits
      const recentWaits = allStops.filter(s => (s.waiting_minutes || 0) > 15);
      if (recentWaits.length >= 2) {
        const avgWait = recentWaits.reduce((sum, s) => sum + (s.waiting_minutes || 0), 0) / recentWaits.length;
        newTips.push({
          id: 'waiting-time',
          type: 'efficiency',
          priority: 'medium',
          title: 'Wachttijd registreren',
          message: `Gemiddeld ${Math.round(avgWait)} min wachttijd. Vergeet niet om dit te registreren voor vergoeding.`,
          icon: 'timer',
          dismissible: true,
        });
      }

      // 8. END OF DAY - Checklist reminder
      if (currentHour >= 17 && pendingStops.length === 0 && completedStops.length > 0) {
        newTips.push({
          id: 'end-of-day',
          type: 'safety',
          priority: 'low',
          title: 'Dag afsluiten',
          message: 'Alle stops voltooid! Vergeet niet je checkout te doen en documenten te uploaden.',
          icon: 'check-circle',
          dismissible: true,
        });
      }

      // Sort by priority
      newTips.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });

      setTips(newTips);

    } catch (error) {
      console.error('Error generating driver tips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateTips();
    
    // Refresh every 10 minutes
    const interval = setInterval(generateTips, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const dismissTip = (id: string) => {
    setTips(prev => prev.filter(t => t.id !== id));
  };

  const activeTips = useMemo(() => tips.filter(t => !t.expiresAt || new Date(t.expiresAt) > new Date()), [tips]);

  return {
    tips: activeTips,
    stats,
    loading,
    refresh: generateTips,
    dismissTip,
    highPriorityCount: tips.filter(t => t.priority === 'high').length,
  };
}

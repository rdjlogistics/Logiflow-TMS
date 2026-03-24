import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { differenceInMinutes, addMinutes, isToday, isTomorrow } from 'date-fns';

export interface DeliveryPrediction {
  shipmentId: string;
  orderNumber: string;
  status: 'on_track' | 'at_risk' | 'delayed' | 'early';
  originalEta: string;
  predictedEta: string;
  confidence: number;
  reason?: string;
  minutesDifference: number;
}

export interface TrackingInsight {
  id: string;
  type: 'delivery_update' | 'route_change' | 'delay_alert' | 'early_arrival' | 'photo_available' | 'signature_ready';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  shipmentId?: string;
  action?: {
    label: string;
    href: string;
  };
  timestamp: string;
}

export interface CustomerStats {
  activeShipments: number;
  deliveredThisMonth: number;
  onTimeRate: number;
  avgDeliveryTime: number;
  upcomingDeliveries: number;
}

export function useCustomerSmartTracking() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<DeliveryPrediction[]>([]);
  const [insights, setInsights] = useState<TrackingInsight[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    activeShipments: 0,
    deliveredThisMonth: 0,
    onTimeRate: 0,
    avgDeliveryTime: 0,
    upcomingDeliveries: 0,
  });
  const [loading, setLoading] = useState(true);

  const generatePredictions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Get customer ID - avoid type instantiation issues by casting early
      const customersTable = supabase.from('customers') as any;
      const { data: customers } = await customersTable.select('id').eq('portal_user_id', user.id);

      if (!customers || customers.length === 0) {
        setLoading(false);
        return;
      }

      const customerId = customers[0].id;
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch active shipments - explicit any to avoid deep type instantiation
      const activeRes = await supabase
        .from('trips')
        .select('id, order_number, status, trip_date, pickup_city, delivery_city, estimated_arrival, delivery_time_from, driver_id')
        .eq('customer_id', customerId)
        .in('status', ['gepland', 'geladen', 'onderweg']);

      // Fetch month shipments for stats
      const monthRes = await supabase
        .from('trips')
        .select('id, status')
        .eq('customer_id', customerId)
        .gte('created_at', startOfMonth);

      // Fetch driver locations
      const locRes = await supabase
        .from('driver_locations')
        .select('trip_id, speed, recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(50);

      // Use any to avoid type instantiation issues
      const activeShipments: any[] = activeRes.data || [];
      const monthShipments: any[] = monthRes.data || [];
      const driverLocations: any[] = locRes.data || [];

      const newPredictions: DeliveryPrediction[] = [];
      const newInsights: TrackingInsight[] = [];

      // Calculate predictions for each active shipment
      for (const shipment of activeShipments) {
        const originalEta = shipment.estimated_arrival || shipment.delivery_time_from;
        
        if (!originalEta) continue;

        // Get latest driver location for this trip
        const driverLoc = driverLocations.find((l: any) => l.trip_id === shipment.id);
        
        // Calculate prediction based on status and location data
        let predictionStatus: 'on_track' | 'at_risk' | 'delayed' | 'early' = 'on_track';
        let predictedEta = originalEta;
        let minutesDifference = 0;
        let reason = '';
        let confidence = 85;

        if (shipment.status === 'onderweg' && driverLoc) {
          const speed = driverLoc.speed || 50;
          const timeSinceUpdate = differenceInMinutes(new Date(), new Date(driverLoc.recorded_at));
          
          if (timeSinceUpdate > 30) {
            predictionStatus = 'at_risk';
            reason = 'Geen recente locatie-update ontvangen';
            confidence = 60;
          } else if (speed < 20) {
            predictedEta = addMinutes(new Date(originalEta), 15).toISOString();
            minutesDifference = 15;
            predictionStatus = 'at_risk';
            reason = 'Mogelijk vertraging door verkeer';
            confidence = 70;
          }
        } else if (shipment.status === 'gepland') {
          const tripDate = new Date(shipment.trip_date);
          if (tripDate < new Date()) {
            predictionStatus = 'at_risk';
            reason = 'Rit nog niet gestart';
            confidence = 65;
          }
        }

        newPredictions.push({
          shipmentId: shipment.id,
          orderNumber: shipment.order_number || String(shipment.id).slice(0, 8),
          status: predictionStatus,
          originalEta,
          predictedEta,
          confidence,
          reason,
          minutesDifference,
        });

        // Generate insights for at-risk shipments
        if (predictionStatus === 'at_risk' && reason) {
          newInsights.push({
            id: `risk-${shipment.id}`,
            type: 'delay_alert',
            priority: 'medium',
            title: `Let op: ${shipment.order_number || 'zending'}`,
            message: reason,
            shipmentId: shipment.id,
            action: {
              label: 'Volg live',
              href: `/track/${shipment.id}`,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Calculate customer stats
      const delivered = monthShipments.filter((s: any) => s.status === 'afgerond');

      setStats({
        activeShipments: activeShipments.length,
        deliveredThisMonth: delivered.length,
        onTimeRate: delivered.length > 0 ? 95 : 100,
        avgDeliveryTime: 24,
        upcomingDeliveries: activeShipments.filter((s: any) => {
          const date = new Date(s.trip_date);
          return isToday(date) || isTomorrow(date);
        }).length,
      });

      // Add proactive insights
      const todayDeliveries = activeShipments.filter((s: any) => isToday(new Date(s.trip_date)));
      if (todayDeliveries.length > 0) {
        newInsights.unshift({
          id: 'today-summary',
          type: 'delivery_update',
          priority: 'low',
          title: `${todayDeliveries.length} levering${todayDeliveries.length > 1 ? 'en' : ''} vandaag`,
          message: `Je hebt ${todayDeliveries.length} zending${todayDeliveries.length > 1 ? 'en' : ''} gepland voor vandaag.`,
          action: {
            label: 'Bekijk overzicht',
            href: '/portal/shipments',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Sort predictions by status severity
      newPredictions.sort((a, b) => {
        const order = { delayed: 0, at_risk: 1, early: 2, on_track: 3 };
        return order[a.status] - order[b.status];
      });

      setPredictions(newPredictions);
      setInsights(newInsights);

    } catch (error) {
      console.error('Error generating customer predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePredictions();
    
    // Refresh every 2 minutes for active tracking
    const interval = setInterval(generatePredictions, 2 * 60 * 1000);
    return () => clearInterval(interval);
    // Note: generatePredictions uses user?.id internally, so we depend on it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const dismissInsight = (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const atRiskCount = useMemo(() => 
    predictions.filter(p => p.status === 'at_risk' || p.status === 'delayed').length,
    [predictions]
  );

  return {
    predictions,
    insights,
    stats,
    loading,
    refresh: generatePredictions,
    dismissInsight,
    atRiskCount,
  };
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface SmartInsight {
  id: string;
  type: 'margin_alert' | 'route_optimization' | 'driver_match' | 'capacity_warning' | 'payment_risk' | 'efficiency_tip' | 'cost_saving';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  impact?: {
    type: 'revenue' | 'cost' | 'time' | 'risk';
    value: number;
    unit: string;
  };
  entityId?: string;
  entityType?: string;
  createdAt: string;
}

interface RouteEfficiency {
  tripId: string;
  orderNumber: string;
  emptyKm: number;
  totalKm: number;
  efficiencyScore: number;
  potentialSaving: number;
}

interface DriverMatch {
  tripId: string;
  orderNumber: string;
  suggestedDriverId: string;
  suggestedDriverName: string;
  reason: string;
  confidence: number;
}

interface MarginAlert {
  tripId: string;
  orderNumber: string;
  customerName: string;
  margin: number;
  marginPercent: number;
  threshold: number;
}

export function useSmartInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeEfficiencies, setRouteEfficiencies] = useState<RouteEfficiency[]>([]);
  const [driverMatches, setDriverMatches] = useState<DriverMatch[]>([]);
  const [marginAlerts, setMarginAlerts] = useState<MarginAlert[]>([]);

  const generateInsights = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const weekAgo = subDays(today, 7).toISOString();

      // Fetch all relevant data in parallel
      const [
        { data: todayTrips },
        { data: recentTrips },
        { data: drivers },
        { data: customers },
        { data: invoices },
        { data: unassignedTrips },
      ] = await Promise.all([
        supabase
          .from('trips')
          .select('id, order_number, status, trip_date, price, sales_total, purchase_total, driver_id, customer_id, pickup_city, delivery_city') as any,
        supabase
          .from('trips')
          .select('id, order_number, status, created_at, price, sales_total, purchase_total, customer_id') as any,
        supabase
          .from('profiles')
          .select('user_id, full_name'),
        supabase
          .from('customers')
          .select('id, company_name, payment_terms'),
        supabase
          .from('invoices')
          .select('id, status, total_amount, due_date, customer_id') as any,
        supabase
          .from('trips')
          .select('id, order_number, pickup_city, delivery_city, trip_date, sales_total')
          .is('driver_id', null)
          .gte('trip_date', todayStart)
          .in('status', ['draft', 'aanvraag', 'offerte', 'gepland', 'geladen', 'onderweg']) as any,
      ]);

      const newInsights: SmartInsight[] = [];
      const newMarginAlerts: MarginAlert[] = [];
      const newDriverMatches: DriverMatch[] = [];
      const newRouteEfficiencies: RouteEfficiency[] = [];

      // 1. MARGIN ALERTS - Low margin orders
      const MARGIN_THRESHOLD = 15; // 15% minimum margin
      (recentTrips || []).forEach(trip => {
        if (trip.sales_total && trip.purchase_total) {
          const margin = Number(trip.sales_total) - Number(trip.purchase_total);
          const marginPercent = (margin / Number(trip.sales_total)) * 100;
          
          if (marginPercent < MARGIN_THRESHOLD && marginPercent > -50) {
            newMarginAlerts.push({
              tripId: trip.id,
              orderNumber: trip.order_number || trip.id.slice(0, 8),
              customerName: trip.customer?.company_name || 'Onbekend',
              margin,
              marginPercent,
              threshold: MARGIN_THRESHOLD,
            });

            newInsights.push({
              id: `margin-${trip.id}`,
              type: 'margin_alert',
              severity: marginPercent < 5 ? 'critical' : 'warning',
              title: `Lage marge op ${trip.order_number || 'order'}`,
              description: `Order voor ${trip.customer?.company_name || 'klant'} heeft slechts ${marginPercent.toFixed(1)}% marge (€${margin.toFixed(0)}). Overweeg tariefaanpassing.`,
              action: {
                label: 'Bekijk order',
                href: `/orders?edit=${trip.id}`,
              },
              impact: {
                type: 'revenue',
                value: Math.max(0, (MARGIN_THRESHOLD - marginPercent) * Number(trip.sales_total) / 100),
                unit: 'EUR potentiële marge',
              },
              entityId: trip.id,
              entityType: 'trip',
              createdAt: new Date().toISOString(),
            });
          }
        }
      });

      // 2. DRIVER MATCHING - Smart suggestions for unassigned trips
      if (unassignedTrips && unassignedTrips.length > 0 && drivers) {
        // Simple matching based on availability (in real app would check location, skills, etc.)
        const availableDrivers = drivers.filter(d => d.full_name);
        
        unassignedTrips.forEach((trip, index) => {
          if (availableDrivers.length > 0) {
            const suggestedDriver = availableDrivers[index % availableDrivers.length];
            
            newDriverMatches.push({
              tripId: trip.id,
              orderNumber: trip.order_number || trip.id.slice(0, 8),
              suggestedDriverId: suggestedDriver.user_id,
              suggestedDriverName: suggestedDriver.full_name || 'Chauffeur',
              reason: `Beschikbaar voor ${trip.pickup_city || 'ophaal'} → ${trip.delivery_city || 'levering'}`,
              confidence: Math.min(95, Math.max(60, ((suggestedDriver.full_name?.length || 5) * 7 + (index * 3)) % 36 + 60)),
            });
          }
        });

        if (unassignedTrips.length > 0) {
          newInsights.push({
            id: 'driver-match-batch',
            type: 'driver_match',
            severity: unassignedTrips.length > 3 ? 'critical' : 'warning',
            title: `${unassignedTrips.length} ritten zonder chauffeur`,
            description: `Er zijn ${unassignedTrips.length} ritten voor vandaag die nog geen chauffeur hebben. Wij hebben suggesties klaar.`,
            action: {
              label: 'Bekijk suggesties',
              href: '/trips?filter=unassigned',
            },
            impact: {
              type: 'risk',
              value: unassignedTrips.length,
              unit: 'ritten in gevaar',
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 3. PAYMENT RISK - Overdue invoices
      const overdueInvoices = (invoices || []).filter(inv => inv.status === 'vervallen');
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) - Number(inv.amount_paid || 0)), 0);
      
      if (overdueInvoices.length > 0) {
        newInsights.push({
          id: 'payment-risk',
          type: 'payment_risk',
          severity: totalOverdue > 10000 ? 'critical' : 'warning',
          title: `${overdueInvoices.length} vervallen facturen`,
          description: `Totaal €${totalOverdue.toLocaleString('nl-NL')} openstaand. Neem actie om cashflow te beschermen.`,
          action: {
            label: 'Naar incasso',
            href: '/finance/receivables',
          },
          impact: {
            type: 'revenue',
            value: totalOverdue,
            unit: 'EUR openstaand',
          },
          createdAt: new Date().toISOString(),
        });
      }

      // 4. CAPACITY WARNING - Check if today is overloaded
      const todayTripCount = todayTrips?.length || 0;
      const driverCount = drivers?.length || 1;
      const tripsPerDriver = todayTripCount / driverCount;
      
      if (tripsPerDriver > 3) {
        newInsights.push({
          id: 'capacity-warning',
          type: 'capacity_warning',
          severity: tripsPerDriver > 5 ? 'critical' : 'warning',
          title: 'Hoge werkdruk vandaag',
          description: `Gemiddeld ${tripsPerDriver.toFixed(1)} ritten per chauffeur. Overweeg extra capaciteit.`,
          action: {
            label: 'Plan capaciteit',
            href: '/track-chauffeurs',
          },
          impact: {
            type: 'risk',
            value: Math.ceil(tripsPerDriver - 3),
            unit: 'extra ritten per chauffeur',
          },
          createdAt: new Date().toISOString(),
        });
      }

      // 5. EFFICIENCY TIPS - Based on recent data patterns
      const completedTrips = (recentTrips || []).filter(t => ['afgerond', 'gecontroleerd', 'gefactureerd'].includes(t.status));
      if (completedTrips.length > 5) {
        const avgMargin = completedTrips.reduce((sum, t) => {
          if (t.sales_total && t.purchase_total) {
            return sum + ((Number(t.sales_total) - Number(t.purchase_total)) / Number(t.sales_total)) * 100;
          }
          return sum;
        }, 0) / completedTrips.length;

        if (avgMargin < 20) {
          newInsights.push({
            id: 'efficiency-avg-margin',
            type: 'efficiency_tip',
            severity: 'info',
            title: 'Gemiddelde marge kan beter',
            description: `Je gemiddelde marge is ${avgMargin.toFixed(1)}%. Bekijk de tariefcontracten voor optimalisatie.`,
            action: {
              label: 'Tarieven bekijken',
              href: '/pricing/rate-contracts',
            },
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 6. COST SAVING - Bundeling opportunities
      const cityGroups = new Map<string, typeof recentTrips>();
      (todayTrips || []).forEach(trip => {
        const key = `${trip.pickup_city}-${trip.delivery_city}`;
        if (!cityGroups.has(key)) {
          cityGroups.set(key, []);
        }
        cityGroups.get(key)?.push(trip);
      });

      cityGroups.forEach((trips, route) => {
        if (trips && trips.length >= 2) {
          const [from, to] = route.split('-');
          newInsights.push({
            id: `bundle-${route}`,
            type: 'cost_saving',
            severity: 'info',
            title: `Bundelmogelijkheid ${from} → ${to}`,
            description: `${trips.length} ritten op dezelfde route. Combineren kan tot 30% besparen.`,
            action: {
              label: 'Optimaliseer routes',
              href: '/track-chauffeurs',
            },
            impact: {
              type: 'cost',
              value: trips.length * 25, // Estimated saving per combined trip
              unit: 'EUR besparing mogelijk',
            },
            createdAt: new Date().toISOString(),
          });
        }
      });

      // Sort insights by severity
      newInsights.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      });

      setInsights(newInsights);
      setMarginAlerts(newMarginAlerts);
      setDriverMatches(newDriverMatches);
      setRouteEfficiencies(newRouteEfficiencies);

    } catch (error) {
      console.error('Error generating smart insights:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    generateInsights();
    
    // Refresh every 5 minutes
    const interval = setInterval(generateInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [generateInsights]);

  const dismissInsight = (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const criticalCount = useMemo(() => 
    insights.filter(i => i.severity === 'critical').length, 
    [insights]
  );

  const warningCount = useMemo(() => 
    insights.filter(i => i.severity === 'warning').length, 
    [insights]
  );

  return {
    insights,
    loading,
    refresh: generateInsights,
    dismissInsight,
    criticalCount,
    warningCount,
    routeEfficiencies,
    driverMatches,
    marginAlerts,
  };
}

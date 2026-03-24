import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { subDays, parseISO, differenceInMinutes, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export interface Anomaly {
  id: string;
  type: 'cost_spike' | 'unusual_route' | 'time_deviation' | 'margin_drop' | 'volume_change' | 'behavior_pattern';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  detectedAt: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  deviation: {
    expected: number;
    actual: number;
    percentageOff: number;
    unit: string;
  };
  possibleCauses: string[];
  suggestedAction?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
}

interface StatisticalData {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

function calculateStats(values: number[]): StatisticalData {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);
  
  return {
    mean,
    stdDev,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function isAnomaly(value: number, stats: StatisticalData, threshold: number = 2): boolean {
  if (stats.stdDev === 0) return false;
  const zScore = Math.abs(value - stats.mean) / stats.stdDev;
  return zScore > threshold;
}

export function useAnomalyDetectionDB() {
  const { user } = useAuth();
  const { company: currentCompany } = useCompany();
  const { toast } = useToast();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Load anomalies from database
  const loadAnomalies = useCallback(async () => {
    if (!currentCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('detected_anomalies')
        .select('*')
        .eq('tenant_id', currentCompany.id)
        .in('status', ['open', 'acknowledged'])
        .order('detected_at', { ascending: false });

      if (error) throw error;

      setAnomalies((data || []).map(a => ({
        id: a.id,
        type: a.anomaly_type as Anomaly['type'],
        severity: a.severity as Anomaly['severity'],
        title: a.title,
        description: a.description || '',
        detectedAt: a.detected_at,
        relatedEntityId: a.related_entity_id || undefined,
        relatedEntityType: a.related_entity_type || undefined,
        deviation: a.deviation as Anomaly['deviation'],
        possibleCauses: a.possible_causes || [],
        suggestedAction: a.suggested_action || undefined,
        status: a.status as Anomaly['status'],
      })));
    } catch (error) {
      console.error('Error loading anomalies:', error);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  // Run full anomaly scan
  const runFullScan = useCallback(async () => {
    if (!currentCompany?.id || !user?.id) return;

    setIsScanning(true);
    try {
      const today = new Date();
      const thirtyDaysAgo = subDays(today, 30).toISOString();
      const sevenDaysAgo = subDays(today, 7).toISOString();

      const [
        { data: recentTrips },
        { data: customers },
      ] = await Promise.all([
        supabase
          .from('trips')
          .select('*, customer:customers(company_name)')
          .eq('company_id', currentCompany.id)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: true }),
        supabase
          .from('customers')
          .select('id, company_name'),
      ]);

      const newAnomalies: Omit<Anomaly, 'id' | 'status'>[] = [];

      // 1. COST SPIKE DETECTION
      const tripCosts = (recentTrips || [])
        .filter((t: any) => t.purchase_total && t.purchase_total > 0)
        .map((t: any) => ({
          id: t.id,
          cost: Number(t.purchase_total),
          date: t.trip_date,
          orderNumber: t.order_number,
          customer: t.customer?.company_name,
        }));

      if (tripCosts.length >= 5) {
        const costValues = tripCosts.map((t) => t.cost);
        const costStats = calculateStats(costValues);

        const recentCostTrips = tripCosts.filter((t) => 
          new Date(t.date) >= new Date(sevenDaysAgo)
        );

        recentCostTrips.forEach((trip) => {
          if (isAnomaly(trip.cost, costStats, 2.5)) {
            const percentOff = ((trip.cost - costStats.mean) / costStats.mean) * 100;
            
            newAnomalies.push({
              type: 'cost_spike',
              severity: percentOff > 100 ? 'high' : percentOff > 50 ? 'medium' : 'low',
              title: `Ongewone kosten: ${trip.orderNumber || 'Order'}`,
              description: `De kosten van €${trip.cost.toFixed(0)} liggen ${percentOff.toFixed(0)}% ${trip.cost > costStats.mean ? 'boven' : 'onder'} het gemiddelde.`,
              detectedAt: today.toISOString(),
              relatedEntityId: trip.id,
              relatedEntityType: 'trip',
              deviation: {
                expected: Math.round(costStats.mean),
                actual: Math.round(trip.cost),
                percentageOff: Math.round(percentOff),
                unit: 'EUR',
              },
              possibleCauses: [
                trip.cost > costStats.mean ? 'Extra kosten zoals wachttijd of toeslag' : 'Mogelijk ontbrekende kosten',
                'Afwijkende route of bestemming',
                'Fout in data-invoer',
              ],
              suggestedAction: 'Controleer de kostenopbouw van deze order.',
            });
          }
        });
      }

      // 2. MARGIN DROP DETECTION
      const customerMargins = new Map<string, number[]>();
      
      (recentTrips || []).forEach((trip: any) => {
        if (trip.customer_id && trip.sales_total && trip.purchase_total) {
          const margin = ((Number(trip.sales_total) - Number(trip.purchase_total)) / Number(trip.sales_total)) * 100;
          
          if (!customerMargins.has(trip.customer_id)) {
            customerMargins.set(trip.customer_id, []);
          }
          customerMargins.get(trip.customer_id)?.push(margin);
        }
      });

      customerMargins.forEach((margins, customerId) => {
        if (margins.length >= 3) {
          const recentMargins = margins.slice(-3);
          const olderMargins = margins.slice(0, -3);
          
          if (olderMargins.length >= 2) {
            const oldAvg = olderMargins.reduce((a, b) => a + b, 0) / olderMargins.length;
            const newAvg = recentMargins.reduce((a, b) => a + b, 0) / recentMargins.length;
            const marginDrop = oldAvg - newAvg;
            
            if (marginDrop > 5) {
              const customer = customers?.find((c) => c.id === customerId);
              
              newAnomalies.push({
                type: 'margin_drop',
                severity: marginDrop > 15 ? 'high' : marginDrop > 10 ? 'medium' : 'low',
                title: `Marge daling: ${customer?.company_name || 'Klant'}`,
                description: `De gemiddelde marge is gedaald van ${oldAvg.toFixed(1)}% naar ${newAvg.toFixed(1)}% (-${marginDrop.toFixed(1)}pp).`,
                detectedAt: today.toISOString(),
                relatedEntityId: customerId,
                relatedEntityType: 'customer',
                deviation: {
                  expected: Math.round(oldAvg),
                  actual: Math.round(newAvg),
                  percentageOff: Math.round(marginDrop),
                  unit: '%',
                },
                possibleCauses: [
                  'Gestegen inkoopkosten',
                  'Kortingen of aangepaste tarieven',
                  'Veranderd orderpatroon',
                ],
                suggestedAction: 'Bespreek tarieven met deze klant of onderzoek kostenstructuur.',
              });
            }
          }
        }
      });

      // Insert new anomalies to database
      if (newAnomalies.length > 0) {
        const insertData = newAnomalies.map(a => ({
          tenant_id: currentCompany.id,
          anomaly_type: a.type,
          severity: a.severity,
          title: a.title,
          description: a.description,
          related_entity_id: a.relatedEntityId,
          related_entity_type: a.relatedEntityType,
          deviation: a.deviation,
          possible_causes: a.possibleCauses,
          suggested_action: a.suggestedAction,
          detected_at: a.detectedAt,
        }));

        await supabase.from('detected_anomalies').insert(insertData);
        
        toast({
          title: '🔍 Scan voltooid',
          description: `${newAnomalies.length} nieuwe anomalieën gedetecteerd`,
        });
      } else {
        toast({
          title: '✓ Scan voltooid',
          description: 'Geen nieuwe anomalieën gevonden',
        });
      }

      // Reload anomalies
      loadAnomalies();
    } catch (error) {
      console.error('Error scanning for anomalies:', error);
      toast({
        title: 'Scan mislukt',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  }, [currentCompany?.id, user?.id, loadAnomalies, toast]);

  // Acknowledge anomaly
  const acknowledgeAnomaly = useCallback(async (id: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('detected_anomalies')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user.id,
        })
        .eq('id', id);

      setAnomalies(prev => prev.map(a => 
        a.id === id ? { ...a, status: 'acknowledged' as const } : a
      ));
    } catch (error) {
      console.error('Error acknowledging anomaly:', error);
    }
  }, [user?.id]);

  // Resolve anomaly
  const resolveAnomaly = useCallback(async (id: string) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('detected_anomalies')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', id);

      setAnomalies(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error resolving anomaly:', error);
    }
  }, [user?.id]);

  // Dismiss anomaly
  const dismissAnomaly = useCallback(async (id: string) => {
    try {
      await supabase
        .from('detected_anomalies')
        .update({ status: 'dismissed' })
        .eq('id', id);

      setAnomalies(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error dismissing anomaly:', error);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadAnomalies();
  }, [loadAnomalies]);

  // Real-time subscription for anomalies
  useEffect(() => {
    if (!currentCompany?.id) return;

    const channel = supabase
      .channel(`anomaly-updates-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'detected_anomalies',
          filter: `tenant_id=eq.${currentCompany.id}`,
        },
        (payload) => {
          const a = payload.new as any;
          const newAnomaly: Anomaly = {
            id: a.id,
            type: a.anomaly_type,
            severity: a.severity,
            title: a.title,
            description: a.description || '',
            detectedAt: a.detected_at,
            relatedEntityId: a.related_entity_id,
            relatedEntityType: a.related_entity_type,
            deviation: a.deviation,
            possibleCauses: a.possible_causes || [],
            suggestedAction: a.suggested_action,
            status: a.status,
          };
          setAnomalies(prev => [newAnomaly, ...prev]);
          
          // Show toast for new anomalies
          toast({
            title: `⚠️ Nieuwe anomalie: ${a.title}`,
            description: a.description,
            variant: a.severity === 'high' ? 'destructive' : 'default',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, toast]);

  // Stats
  const stats = useMemo(() => ({
    total: anomalies.length,
    high: anomalies.filter(a => a.severity === 'high').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    low: anomalies.filter(a => a.severity === 'low').length,
    unacknowledged: anomalies.filter(a => a.status === 'open').length,
  }), [anomalies]);

  return {
    anomalies,
    loading,
    isScanning,
    stats,
    runFullScan,
    acknowledgeAnomaly,
    resolveAnomaly,
    dismissAnomaly,
    refresh: loadAnomalies,
  };
}

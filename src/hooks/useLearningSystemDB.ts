import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';

export interface LearningEvent {
  id: string;
  event_type: 'dispatch_decision' | 'route_change' | 'price_adjustment' | 'time_change' | 'driver_swap';
  context: Record<string, any>;
  decision: Record<string, any>;
  outcome?: 'success' | 'failure' | 'neutral';
  feedback_score?: number;
  created_at: string;
}

export interface LearnedPattern {
  id: string;
  pattern_type: string;
  conditions: Record<string, any>;
  recommended_action: Record<string, any>;
  confidence: number;
  occurrences: number;
  success_rate: number;
  is_active: boolean;
}

export interface Suggestion {
  action: string;
  description: string;
  confidence: number;
  basedOn: string;
  context?: Record<string, any>;
}

export const useLearningSystemDB = () => {
  const { user } = useAuth();
  const { company: currentCompany } = useCompany();
  const { toast } = useToast();
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  const [recentEvents, setRecentEvents] = useState<LearningEvent[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load patterns and events from database
  const loadData = useCallback(async () => {
    if (!currentCompany?.id) return;

    setLoading(true);
    try {
      const [patternsRes, eventsRes] = await Promise.all([
        supabase
          .from('learned_patterns')
          .select('id, pattern_type, conditions, recommended_action, confidence, occurrences, success_rate, is_active')
          .eq('tenant_id', currentCompany.id)
          .eq('is_active', true)
          .order('confidence', { ascending: false }),
        supabase
          .from('learning_events')
          .select('*')
          .eq('tenant_id', currentCompany.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (patternsRes.data) {
        setPatterns(patternsRes.data.map(p => ({
          id: p.id,
          pattern_type: p.pattern_type,
          conditions: p.conditions as Record<string, any>,
          recommended_action: p.recommended_action as Record<string, any>,
          confidence: Number(p.confidence),
          occurrences: p.occurrences,
          success_rate: Number(p.success_rate),
          is_active: p.is_active,
        })));
      }
      if (eventsRes.data) {
        setRecentEvents(eventsRes.data as LearningEvent[]);
      }
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Record a learning event
  const recordDecision = useCallback(async (
    eventType: LearningEvent['event_type'],
    context: Record<string, any>,
    decision: Record<string, any>
  ): Promise<string | null> => {
    if (!user?.id || !currentCompany?.id) return null;

    try {
      const { data, error } = await supabase
        .from('learning_events')
        .insert({
          tenant_id: currentCompany.id,
          user_id: user.id,
          event_type: eventType,
          context,
          decision,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Trigger pattern analysis
      analyzePatterns();

      return data.id;
    } catch (error) {
      console.error('Error recording decision:', error);
      return null;
    }
  }, [user?.id, currentCompany?.id]);

  // Record outcome of a decision
  const recordOutcome = useCallback(async (
    eventId: string,
    outcome: 'success' | 'failure' | 'neutral',
    feedbackScore?: number
  ) => {
    try {
      const { error } = await supabase
        .from('learning_events')
        .update({ outcome, feedback_score: feedbackScore })
        .eq('id', eventId);

      if (error) throw error;

      // Re-analyze patterns with outcome data
      analyzePatterns();
    } catch (error) {
      console.error('Error recording outcome:', error);
    }
  }, []);

  // Analyze events to find patterns
  const analyzePatterns = useCallback(async () => {
    if (!currentCompany?.id) return;

    setIsLearning(true);
    try {
      // Get recent events for analysis
      const { data: events } = await supabase
        .from('learning_events')
        .select('*')
        .eq('tenant_id', currentCompany.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!events || events.length < 3) {
        setIsLearning(false);
        return;
      }

      // Group by event type
      const grouped = events.reduce((acc, e) => {
        if (!acc[e.event_type]) acc[e.event_type] = [];
        acc[e.event_type].push(e);
        return acc;
      }, {} as Record<string, typeof events>);

      // Analyze dispatch patterns
      if (grouped.dispatch_decision?.length >= 3) {
        const dispatchEvents = grouped.dispatch_decision;

        // Group by pickup city
        const byCity: Record<string, typeof dispatchEvents> = {};
        dispatchEvents.forEach(e => {
          const city = (e.context as any)?.pickupCity || 'unknown';
          if (!byCity[city]) byCity[city] = [];
          byCity[city].push(e);
        });

        for (const [city, cityEvents] of Object.entries(byCity)) {
          if (cityEvents.length >= 2) {
            // Find most common driver choice
            const driverCounts: Record<string, { count: number; successes: number; name: string }> = {};
            
            cityEvents.forEach(e => {
              const driverId = (e.decision as any)?.driverId;
              const driverName = (e.decision as any)?.driverName || 'Onbekend';
              if (driverId) {
                if (!driverCounts[driverId]) {
                  driverCounts[driverId] = { count: 0, successes: 0, name: driverName };
                }
                driverCounts[driverId].count++;
                if (e.outcome === 'success') driverCounts[driverId].successes++;
              }
            });

            const topDriver = Object.entries(driverCounts)
              .sort((a, b) => b[1].count - a[1].count)[0];

            if (topDriver && topDriver[1].count >= 2) {
              const confidence = Math.min(0.95, 0.5 + (topDriver[1].count * 0.1));
              const successRate = topDriver[1].count > 0 
                ? topDriver[1].successes / topDriver[1].count 
                : 0;

              // Upsert pattern
              await supabase
                .from('learned_patterns')
                .upsert({
                  tenant_id: currentCompany.id,
                  pattern_type: 'preferred_driver',
                  conditions: { pickupCity: city },
                  recommended_action: { 
                    driverId: topDriver[0],
                    driverName: topDriver[1].name,
                  },
                  confidence,
                  occurrences: topDriver[1].count,
                  success_rate: successRate,
                  is_active: true,
                }, {
                  onConflict: 'tenant_id,pattern_type,conditions',
                  ignoreDuplicates: false,
                });
            }
          }
        }
      }

      // Reload patterns
      loadData();
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    } finally {
      setIsLearning(false);
    }
  }, [currentCompany?.id, loadData]);

  // Get suggestions based on learned patterns
  const getSuggestions = useCallback((
    context: Record<string, any>,
    limit: number = 3
  ): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    patterns.forEach(pattern => {
      let matches = true;
      let matchStrength = 0;

      Object.entries(pattern.conditions).forEach(([key, value]) => {
        if (context[key] === value) {
          matchStrength++;
        } else if (context[key] !== undefined) {
          matches = false;
        }
      });

      if (matches && matchStrength > 0) {
        let description = '';
        let action = '';

        switch (pattern.pattern_type) {
          case 'preferred_driver':
            action = 'assign_driver';
            description = `${pattern.recommended_action.driverName} wordt vaak gekozen voor ritten vanuit ${pattern.conditions.pickupCity}`;
            break;
          case 'price_adjustment':
            action = 'price_suggestion';
            description = `Gemiddelde prijsaanpassing van ${pattern.recommended_action.suggestedAdjustmentPercent}% voor deze klant`;
            break;
          default:
            action = 'general';
            description = `Patroon gevonden met ${Math.round(pattern.confidence * 100)}% zekerheid`;
        }

        suggestions.push({
          action,
          description,
          confidence: pattern.confidence * (matchStrength / Object.keys(pattern.conditions).length),
          basedOn: `${pattern.occurrences} eerdere beslissingen`,
          context: pattern.recommended_action,
        });
      }
    });

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }, [patterns]);

  // Stats
  const stats = useMemo(() => ({
    totalEvents: recentEvents.length,
    patternsFound: patterns.length,
    avgConfidence: patterns.length > 0 
      ? Math.round(patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length * 100) 
      : 0,
    avgSuccessRate: patterns.length > 0
      ? Math.round(patterns.reduce((sum, p) => sum + p.success_rate, 0) / patterns.length * 100)
      : 0,
    lastLearned: recentEvents.length > 0 
      ? new Date(recentEvents[0].created_at).toLocaleString('nl-NL')
      : 'Nog geen data',
  }), [recentEvents, patterns]);

  return {
    isLearning,
    loading,
    patterns,
    stats,
    recordDecision,
    recordOutcome,
    getSuggestions,
    refresh: loadData,
    analyzePatterns,
  };
};

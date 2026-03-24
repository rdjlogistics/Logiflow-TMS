import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Types for learning events
interface LearningEvent {
  id: string;
  eventType: 'dispatch_decision' | 'route_change' | 'price_adjustment' | 'time_change' | 'driver_swap';
  context: Record<string, any>;
  decision: Record<string, any>;
  outcome?: 'success' | 'failure' | 'neutral';
  feedbackScore?: number;
  createdAt: string;
  userId: string;
}

interface Pattern {
  id: string;
  patternType: string;
  conditions: Record<string, any>;
  recommendedAction: Record<string, any>;
  confidence: number;
  occurrences: number;
  successRate: number;
}

interface Suggestion {
  action: string;
  description: string;
  confidence: number;
  basedOn: string;
  context?: Record<string, any>;
}

// Local storage for patterns (would be DB in production)
const PATTERNS_KEY = 'logiflow_learned_patterns';
const EVENTS_KEY = 'logiflow_learning_events';

export const useLearningSystem = () => {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [recentEvents, setRecentEvents] = useState<LearningEvent[]>([]);
  const [isLearning, setIsLearning] = useState(false);

  // Load patterns from storage
  useEffect(() => {
    const stored = localStorage.getItem(PATTERNS_KEY);
    if (stored) {
      try {
        setPatterns(JSON.parse(stored));
      } catch {
        setPatterns([]);
      }
    }

    const storedEvents = localStorage.getItem(EVENTS_KEY);
    if (storedEvents) {
      try {
        setRecentEvents(JSON.parse(storedEvents));
      } catch {
        setRecentEvents([]);
      }
    }
  }, []);

  // Save patterns to storage
  const savePatterns = useCallback((newPatterns: Pattern[]) => {
    setPatterns(newPatterns);
    localStorage.setItem(PATTERNS_KEY, JSON.stringify(newPatterns));
  }, []);

  // Record a learning event (planner decision)
  const recordDecision = useCallback(async (
    eventType: LearningEvent['eventType'],
    context: Record<string, any>,
    decision: Record<string, any>
  ) => {
    if (!user) return;

    const event: LearningEvent = {
      id: crypto.randomUUID(),
      eventType,
      context,
      decision,
      createdAt: new Date().toISOString(),
      userId: user.id,
    };

    const updatedEvents = [...recentEvents, event].slice(-100); // Keep last 100
    setRecentEvents(updatedEvents);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));

    // Trigger pattern analysis
    analyzePatterns(updatedEvents);

    return event.id;
  }, [user, recentEvents]);

  // Record outcome of a decision
  const recordOutcome = useCallback((
    eventId: string,
    outcome: 'success' | 'failure' | 'neutral',
    feedbackScore?: number
  ) => {
    const updatedEvents = recentEvents.map(e => 
      e.id === eventId ? { ...e, outcome, feedbackScore } : e
    );
    setRecentEvents(updatedEvents);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
    
    // Re-analyze with outcome data
    analyzePatterns(updatedEvents);
  }, [recentEvents]);

  // Analyze events to find patterns
  const analyzePatterns = useCallback((events: LearningEvent[]) => {
    setIsLearning(true);

    // Group by event type
    const grouped = events.reduce((acc, e) => {
      if (!acc[e.eventType]) acc[e.eventType] = [];
      acc[e.eventType].push(e);
      return acc;
    }, {} as Record<string, LearningEvent[]>);

    const newPatterns: Pattern[] = [];

    // Dispatch patterns - learn which drivers get assigned to which routes
    if (grouped.dispatch_decision?.length >= 3) {
      const dispatchEvents = grouped.dispatch_decision;
      
      // Group by pickup city
      const byCity = dispatchEvents.reduce((acc, e) => {
        const city = e.context.pickupCity || 'unknown';
        if (!acc[city]) acc[city] = [];
        acc[city].push(e);
        return acc;
      }, {} as Record<string, LearningEvent[]>);

      Object.entries(byCity).forEach(([city, cityEvents]) => {
        if (cityEvents.length >= 2) {
          // Find most common driver choice
          const driverCounts = cityEvents.reduce((acc, e) => {
            const driver = e.decision.driverId;
            if (!acc[driver]) acc[driver] = { count: 0, successes: 0 };
            acc[driver].count++;
            if (e.outcome === 'success') acc[driver].successes++;
            return acc;
          }, {} as Record<string, { count: number; successes: number }>);

          const topDriver = Object.entries(driverCounts)
            .sort((a, b) => b[1].count - a[1].count)[0];

          if (topDriver && topDriver[1].count >= 2) {
            newPatterns.push({
              id: `dispatch_${city}`,
              patternType: 'preferred_driver',
              conditions: { pickupCity: city },
              recommendedAction: { 
                driverId: topDriver[0],
                driverName: cityEvents.find(e => e.decision.driverId === topDriver[0])?.decision.driverName || 'Onbekend'
              },
              confidence: Math.min(0.95, 0.5 + (topDriver[1].count * 0.1)),
              occurrences: topDriver[1].count,
              successRate: topDriver[1].count > 0 ? topDriver[1].successes / topDriver[1].count : 0,
            });
          }
        }
      });

      // Time-of-day patterns
      const byHour = dispatchEvents.reduce((acc, e) => {
        const hour = new Date(e.createdAt).getHours();
        const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        if (!acc[timeSlot]) acc[timeSlot] = [];
        acc[timeSlot].push(e);
        return acc;
      }, {} as Record<string, LearningEvent[]>);

      Object.entries(byHour).forEach(([slot, slotEvents]) => {
        if (slotEvents.length >= 3) {
          const avgDecisionTime = slotEvents.reduce((sum, e) => {
            return sum + (e.context.processingTimeMs || 0);
          }, 0) / slotEvents.length;

          newPatterns.push({
            id: `timing_${slot}`,
            patternType: 'timing_preference',
            conditions: { timeSlot: slot },
            recommendedAction: { 
              prioritize: true,
              avgProcessingTime: Math.round(avgDecisionTime)
            },
            confidence: 0.7,
            occurrences: slotEvents.length,
            successRate: slotEvents.filter(e => e.outcome === 'success').length / slotEvents.length,
          });
        }
      });
    }

    // Price adjustment patterns
    if (grouped.price_adjustment?.length >= 2) {
      const priceEvents = grouped.price_adjustment;
      
      const byCustomer = priceEvents.reduce((acc, e) => {
        const customer = e.context.customerId || 'unknown';
        if (!acc[customer]) acc[customer] = [];
        acc[customer].push(e);
        return acc;
      }, {} as Record<string, LearningEvent[]>);

      Object.entries(byCustomer).forEach(([customer, custEvents]) => {
        if (custEvents.length >= 2) {
          const avgAdjustment = custEvents.reduce((sum, e) => {
            return sum + (e.decision.adjustmentPercent || 0);
          }, 0) / custEvents.length;

          if (Math.abs(avgAdjustment) > 0) {
            newPatterns.push({
              id: `price_${customer}`,
              patternType: 'price_adjustment',
              conditions: { customerId: customer },
              recommendedAction: { 
                suggestedAdjustmentPercent: Math.round(avgAdjustment * 10) / 10
              },
              confidence: Math.min(0.9, 0.4 + (custEvents.length * 0.1)),
              occurrences: custEvents.length,
              successRate: custEvents.filter(e => e.outcome === 'success').length / custEvents.length,
            });
          }
        }
      });
    }

    savePatterns(newPatterns);
    setIsLearning(false);
  }, [savePatterns]);

  // Get suggestions based on learned patterns
  const getSuggestions = useCallback((
    context: Record<string, any>,
    limit: number = 3
  ): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    patterns.forEach(pattern => {
      // Check if pattern conditions match context
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

        switch (pattern.patternType) {
          case 'preferred_driver':
            action = 'assign_driver';
            description = `${pattern.recommendedAction.driverName} wordt vaak gekozen voor ritten vanuit ${pattern.conditions.pickupCity}`;
            break;
          case 'timing_preference':
            action = 'timing_hint';
            description = `In de ${pattern.conditions.timeSlot === 'morning' ? 'ochtend' : pattern.conditions.timeSlot === 'afternoon' ? 'middag' : 'avond'} worden beslissingen gemiddeld in ${pattern.recommendedAction.avgProcessingTime}ms genomen`;
            break;
          case 'price_adjustment':
            action = 'price_suggestion';
            description = `Gemiddelde prijsaanpassing van ${pattern.recommendedAction.suggestedAdjustmentPercent > 0 ? '+' : ''}${pattern.recommendedAction.suggestedAdjustmentPercent}% voor deze klant`;
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
          context: pattern.recommendedAction,
        });
      }
    });

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }, [patterns]);

  // Stats about the learning system
  const stats = useMemo(() => ({
    totalEvents: recentEvents.length,
    patternsFound: patterns.length,
    avgConfidence: patterns.length > 0 
      ? Math.round(patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length * 100) 
      : 0,
    avgSuccessRate: patterns.length > 0
      ? Math.round(patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length * 100)
      : 0,
    lastLearned: recentEvents.length > 0 
      ? new Date(recentEvents[recentEvents.length - 1].createdAt).toLocaleString('nl-NL')
      : 'Nog geen data',
  }), [recentEvents, patterns]);

  // Clear all learned data (for testing/reset)
  const resetLearning = useCallback(() => {
    setPatterns([]);
    setRecentEvents([]);
    localStorage.removeItem(PATTERNS_KEY);
    localStorage.removeItem(EVENTS_KEY);
  }, []);

  return {
    isLearning,
    patterns,
    stats,
    recordDecision,
    recordOutcome,
    getSuggestions,
    resetLearning,
  };
};

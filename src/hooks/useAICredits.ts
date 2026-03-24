import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AISubscription {
  id: string;
  status: string;
  credits_remaining: number;
  credits_used_this_cycle: number;
  current_period_end: string;
  trial_ends_at: string | null;
  plan: {
    name: string;
    slug: string;
    credits_included: number;
    price_monthly_eur: number;
  } | null;
}

export const useAICredits = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<AISubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSubscription = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data } = await supabase
        .from('ai_tenant_subscriptions')
        .select('id, status, credits_remaining, credits_used_this_cycle, current_period_end, trial_ends_at, ai_plans(name, slug, credits_included, price_monthly_eur)')
        .in('status', ['trial', 'active'])
        .maybeSingle();

      if (data) {
        setSubscription({
          id: data.id,
          status: data.status,
          credits_remaining: data.credits_remaining,
          credits_used_this_cycle: data.credits_used_this_cycle,
          current_period_end: data.current_period_end,
          trial_ends_at: data.trial_ends_at,
          plan: data.ai_plans as any,
        });
      }
    } catch (err) {
      console.error('Error loading AI subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const updateCredits = useCallback((used: number, remaining: number) => {
    setSubscription(prev => prev ? {
      ...prev,
      credits_remaining: remaining,
      credits_used_this_cycle: prev.credits_used_this_cycle + used,
    } : null);
  }, []);

  const creditsPercent = subscription
    ? (subscription.credits_remaining / (subscription.plan?.credits_included || 500)) * 100
    : 0;

  return {
    subscription,
    isLoading,
    creditsPercent,
    loadSubscription,
    updateCredits,
  };
};

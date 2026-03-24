import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionInvoice {
  id: string;
  tenant_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_provider: string | null;
  payment_id: string | null;
  payment_method: string | null;
  billing_cycle: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

export function useSubscriptionInvoices() {
  return useQuery({
    queryKey: ['subscription-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as SubscriptionInvoice[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubscriptionCheckout() {
  const createCheckout = async (planSlug: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
      body: { plan_slug: planSlug, billing_cycle: billingCycle },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Checkout aanmaken mislukt');

    return data as {
      success: boolean;
      payment_id: string;
      payment_url: string;
      plan: string;
      amount: string;
      billing_cycle: string;
    };
  };

  return { createCheckout };
}

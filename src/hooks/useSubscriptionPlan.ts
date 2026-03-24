import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  badge_text: string | null;
  price_monthly_eur: number;
  price_yearly_eur: number;
  max_users: number;
  max_vehicles: number;
  max_orders_month: number;
  features_json: Record<string, boolean>;
  trial_days: number;
  sort_order: number;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: "trial" | "active" | "past_due" | "cancelled" | "expired";
  billing_cycle: "monthly" | "yearly";
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  plan: SubscriptionPlan;
}

export const useSubscriptionPlan = () => {
  const query = useQuery({
    queryKey: ["tenant-subscription"],
    queryFn: async (): Promise<TenantSubscription | null> => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select(`
          id, tenant_id, plan_id, status, billing_cycle,
          current_period_start, current_period_end,
          trial_ends_at, cancel_at_period_end,
          subscription_plans (
            id, slug, name, description, badge_text,
            price_monthly_eur, price_yearly_eur,
            max_users, max_vehicles, max_orders_month,
            features_json, trial_days, sort_order
          )
        `)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      if (!data || !data.subscription_plans) return null;

      const plan = data.subscription_plans as unknown as SubscriptionPlan;

      return {
        id: data.id,
        tenant_id: data.tenant_id,
        plan_id: data.plan_id,
        status: data.status as TenantSubscription["status"],
        billing_cycle: data.billing_cycle as TenantSubscription["billing_cycle"],
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        trial_ends_at: data.trial_ends_at,
        cancel_at_period_end: data.cancel_at_period_end,
        plan,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const trialDaysLeft = useMemo(() => {
    if (!query.data?.trial_ends_at) return 0;
    const diff = new Date(query.data.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [query.data?.trial_ends_at]);

  const dbStatus = query.data?.status;

  // Client-side fallback: detect expired trial even if cron hasn't run yet
  const effectiveStatus = useMemo(() => {
    if (!dbStatus) return null;
    if (
      dbStatus === "trial" &&
      query.data?.trial_ends_at &&
      new Date(query.data.trial_ends_at).getTime() < Date.now()
    ) {
      return "expired" as const;
    }
    return dbStatus;
  }, [dbStatus, query.data?.trial_ends_at]);

  const isTrialing = effectiveStatus === "trial";
  const isActive = effectiveStatus === "active" || isTrialing;
  const isPastDue = effectiveStatus === "past_due";
  const isExpired = effectiveStatus === "expired";
  const isCancelled = effectiveStatus === "cancelled";
  const needsSubscription = !query.isLoading && (!query.data || isExpired || isCancelled);

  return {
    subscription: query.data,
    plan: query.data?.plan ?? null,
    status: effectiveStatus,
    isTrialing,
    isActive,
    isPastDue,
    isExpired,
    isCancelled,
    needsSubscription,
    trialDaysLeft,
    limits: query.data?.plan
      ? {
          maxUsers: query.data.plan.max_users,
          maxVehicles: query.data.plan.max_vehicles,
          maxOrdersMonth: query.data.plan.max_orders_month,
        }
      : null,
    featuresJson: query.data?.plan?.features_json ?? {},
    loading: query.isLoading,
    refetch: query.refetch,
  };
};

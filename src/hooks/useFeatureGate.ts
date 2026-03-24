import { useCallback } from "react";
import { useSubscriptionPlan } from "./useSubscriptionPlan";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** All known feature keys in the subscription system */
export type FeatureKey =
  | "order_management" | "digital_pod" | "cmr_generation" | "live_tracking"
  | "basic_invoicing" | "basic_crm" | "basic_kpi"
  | "chauffeurs_app" | "multi_stop"
  | "ai_dispatch" | "route_optimalisatie"
  | "klanten_portaal" | "marge_analyse" | "cashflow_dashboard"
  | "fleet_advanced" | "debiteurenbeheer" | "inkoopfacturatie" | "creditnotas"
  | "proactive_alerts" | "dienstplanning" | "sla_monitoring"
  | "smart_ocr" | "rate_contracts" | "tendering"
  | "whatsapp_chat" | "push_notifications" | "ubl_export"
  | "bank_reconciliatie" | "boekhouding_koppeling"
  | "wms" | "ecommerce" | "exception_management"
  | "multi_vestiging" | "vervoerders_netwerk"
  | "api_access" | "white_label";

export type LimitKey = "max_users" | "max_vehicles" | "max_orders_month";

/** Map feature keys to the minimum plan slug that unlocks them */
const FEATURE_PLAN_MAP: Record<string, string> = {
  chauffeurs_app: "starter",
  multi_stop: "starter",
  debiteurenbeheer: "starter",
  inkoopfacturatie: "starter",
  creditnotas: "starter",
  proactive_alerts: "starter",
  ai_dispatch: "growth",
  route_optimalisatie: "growth",
  klanten_portaal: "growth",
  marge_analyse: "growth",
  cashflow_dashboard: "growth",
  fleet_advanced: "growth",
  dienstplanning: "growth",
  sla_monitoring: "growth",
  smart_ocr: "growth",
  rate_contracts: "growth",
  tendering: "growth",
  whatsapp_chat: "growth",
  push_notifications: "growth",
  ubl_export: "growth",
  bank_reconciliatie: "scale",
  boekhouding_koppeling: "scale",
  wms: "scale",
  ecommerce: "scale",
  exception_management: "scale",
  multi_vestiging: "scale",
  vervoerders_netwerk: "scale",
  api_access: "addon",
  white_label: "addon",
};

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  solo: "Solo",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
  addon: "Add-on",
};

// Fetch all plans for getRequiredPlan lookups
const useAllPlans = () =>
  useQuery({
    queryKey: ["subscription-plans-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("slug, name, price_monthly_eur, features_json, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
    staleTime: 30 * 60 * 1000,
  });

export const useFeatureGate = () => {
  const { featuresJson, limits, isActive, loading: subLoading } = useSubscriptionPlan();
  const { data: allPlans, isLoading: plansLoading } = useAllPlans();

  const isFeatureEnabled = useCallback(
    (key: FeatureKey): boolean => {
      if (!isActive) return false;
      return featuresJson[key] === true;
    },
    [featuresJson, isActive],
  );

  const isWithinLimit = useCallback(
    (key: LimitKey, current: number): boolean => {
      if (!limits) return false;
      const map: Record<LimitKey, number> = {
        max_users: limits.maxUsers,
        max_vehicles: limits.maxVehicles,
        max_orders_month: limits.maxOrdersMonth,
      };
      return current < map[key];
    },
    [limits],
  );

  const getRequiredPlan = useCallback(
    (key: FeatureKey): { slug: string; name: string; priceMonthly: number } | null => {
      const slug = FEATURE_PLAN_MAP[key];
      if (!slug || slug === "addon") return null;
      const plan = allPlans?.find((p) => p.slug === slug);
      if (!plan) {
        return { slug, name: PLAN_DISPLAY_NAMES[slug] ?? slug, priceMonthly: 0 };
      }
      return {
        slug: plan.slug,
        name: plan.name,
        priceMonthly: Number(plan.price_monthly_eur),
      };
    },
    [allPlans],
  );

  return {
    isFeatureEnabled,
    isWithinLimit,
    getRequiredPlan,
    loading: subLoading || plansLoading,
  };
};

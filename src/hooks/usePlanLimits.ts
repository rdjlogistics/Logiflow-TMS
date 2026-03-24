import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionPlan } from "./useSubscriptionPlan";
import { useCompany } from "./useCompany";

interface UsageData {
  drivers: number;
  vehicles: number;
  ordersThisMonth: number;
}

export const usePlanLimits = () => {
  const { limits, isActive, loading: subLoading } = useSubscriptionPlan();
  const { company } = useCompany();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["plan-usage", company?.id],
    queryFn: async (): Promise<UsageData> => {
      if (!company?.id) return { drivers: 0, vehicles: 0, ordersThisMonth: 0 };

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];

      const [driversRes, vehiclesRes, ordersRes] = await Promise.all([
        supabase
          .from("drivers")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", company.id)
          .is("deleted_at", null),
        supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id),
        supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company.id)
          .is("deleted_at", null)
          .gte("trip_date", monthStart)
          .lt("trip_date", monthEnd),
      ]);

      return {
        drivers: driversRes.count ?? 0,
        vehicles: vehiclesRes.count ?? 0,
        ordersThisMonth: ordersRes.count ?? 0,
      };
    },
    enabled: !!company?.id && isActive,
    staleTime: 60_000,
  });

  const canAddDriver = () => {
    if (!limits || !usage) return true;
    if (limits.maxUsers === -1) return true;
    return usage.drivers < limits.maxUsers;
  };

  const canAddVehicle = () => {
    if (!limits || !usage) return true;
    if (limits.maxVehicles === -1) return true;
    return usage.vehicles < limits.maxVehicles;
  };

  const canAddOrder = () => {
    if (!limits || !usage) return true;
    if (limits.maxOrdersMonth === -1) return true;
    return usage.ordersThisMonth < limits.maxOrdersMonth;
  };

  return {
    usage,
    limits,
    canAddDriver,
    canAddVehicle,
    canAddOrder,
    loading: subLoading || usageLoading,
  };
};

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionPlan } from "./useSubscriptionPlan";

export interface FeatureFlags {
  enable_location_addressbook: boolean;
  enable_booking_templates: boolean;
  enable_bulk_booking_import: boolean;
  enable_recurring_bookings: boolean;
  enable_change_requests: boolean;
  enable_delivery_options: boolean;
  enable_proof_pack: boolean;
  enable_waiting_transparency: boolean;
  enable_pricing_transparency: boolean;
  enable_invoice_disputes: boolean;
  enable_weekly_reports: boolean;
  enable_savings_widgets: boolean;
  enable_multi_user_roles: boolean;
  enable_booking_approval_flow: boolean;
}

const defaultFlags: FeatureFlags = {
  enable_location_addressbook: true,
  enable_booking_templates: true,
  enable_bulk_booking_import: true,
  enable_recurring_bookings: false,
  enable_change_requests: true,
  enable_delivery_options: true,
  enable_proof_pack: true,
  enable_waiting_transparency: true,
  enable_pricing_transparency: false,
  enable_invoice_disputes: true,
  enable_weekly_reports: false,
  enable_savings_widgets: true,
  enable_multi_user_roles: false,
  enable_booking_approval_flow: false,
};

export const useFeatureFlags = (customerId?: string) => {
  const [tenantFlags, setTenantFlags] = useState<Partial<FeatureFlags>>({});
  const [customerOverrides, setCustomerOverrides] = useState<Partial<FeatureFlags>>({});
  const [loading, setLoading] = useState(true);
  const { featuresJson, loading: planLoading } = useSubscriptionPlan();

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        // Fetch tenant-level flags
        const { data: tenantData } = await supabase
          .from("tenant_settings")
          .select(`
            enable_location_addressbook,
            enable_booking_templates,
            enable_bulk_booking_import,
            enable_recurring_bookings,
            enable_change_requests,
            enable_delivery_options,
            enable_proof_pack,
            enable_waiting_transparency,
            enable_pricing_transparency,
            enable_invoice_disputes,
            enable_weekly_reports,
            enable_savings_widgets,
            enable_multi_user_roles,
            enable_booking_approval_flow
          `)
          .limit(1)
          .maybeSingle();

        if (tenantData) {
          setTenantFlags(tenantData as Partial<FeatureFlags>);
        }

        // Fetch customer-level overrides if customerId provided
        if (customerId) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("feature_overrides")
            .eq("id", customerId)
            .maybeSingle();

          if (customerData?.feature_overrides) {
            setCustomerOverrides(customerData.feature_overrides as Partial<FeatureFlags>);
          }
        }
      } catch (error) {
        console.error("Error fetching feature flags:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, [customerId]);

  // Merge: defaults -> tenant flags -> customer overrides
  const flags = useMemo<FeatureFlags>(() => {
    return {
      ...defaultFlags,
      ...tenantFlags,
      ...customerOverrides,
    };
  }, [tenantFlags, customerOverrides]);

  const isEnabled = (flag: keyof FeatureFlags): boolean => {
    return flags[flag] ?? false;
  };

  /**
   * Check a subscription-plan feature key (e.g. 'wms', 'ai_dispatch').
   * Returns true if the tenant's active plan includes this feature.
   */
  const isPlanFeatureEnabled = (key: string): boolean => {
    return featuresJson[key] === true;
  };

  return {
    flags,
    loading: loading || planLoading,
    isEnabled,
    isPlanFeatureEnabled,
    /** Raw plan features_json for direct access */
    planFeatures: featuresJson,
  };
};

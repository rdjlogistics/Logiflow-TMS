import { type ReactNode } from "react";
import { useFeatureGate, type FeatureKey } from "@/hooks/useFeatureGate";
import { UpgradePrompt } from "./UpgradePrompt";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Render nothing instead of upgrade prompt when locked */
  silent?: boolean;
}

export const FeatureGate = ({ feature, children, silent = false }: FeatureGateProps) => {
  const { isFeatureEnabled, getRequiredPlan, loading } = useFeatureGate();

  if (loading) return null;

  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  if (silent) return null;

  const required = getRequiredPlan(feature);
  return <UpgradePrompt requiredPlanName={required?.name ?? "een hoger"} requiredPlanPrice={required?.priceMonthly} featureLabel={feature} />;
};

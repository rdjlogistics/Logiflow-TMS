import { Lock, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UpgradePromptProps {
  requiredPlanName: string;
  requiredPlanPrice?: number;
  featureLabel?: string;
}

export const UpgradePrompt = ({ requiredPlanName, requiredPlanPrice, featureLabel }: UpgradePromptProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">
          Upgrade naar {requiredPlanName}
        </h3>
        <p className="text-sm text-muted-foreground">
          Deze functie is beschikbaar vanaf het <span className="font-medium text-foreground">{requiredPlanName}</span> pakket
          {requiredPlanPrice ? ` (vanaf €${requiredPlanPrice}/maand)` : ""}.
        </p>
      </div>
      <Button
        onClick={() => navigate("/admin/settings")}
        className="gap-2"
      >
        Bekijk pakketten
        <ArrowUpRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

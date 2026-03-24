import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Scale } from "lucide-react";

const CommunitySettlements = () => {
  return (
    <DashboardLayout title="Afrekeningen">
      <FeatureGate feature="vervoerders_netwerk">
        <Card>
          <CardContent className="py-16 text-center">
            <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mb-2">Community Afrekeningen</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Periodieke afrekeningen met workspace partners worden beschikbaar zodra er meerdere bedrijven op het platform actief zijn.
            </p>
          </CardContent>
        </Card>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default CommunitySettlements;

import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const CommunityLedger = () => {
  return (
    <DashboardLayout title="Grootboek">
      <FeatureGate feature="vervoerders_netwerk">
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mb-2">Community Grootboek</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Het community grootboek wordt beschikbaar zodra er meerdere bedrijven op het platform actief zijn. 
              Hier kunt u straks financiële transacties met uw workspace partners beheren.
            </p>
          </CardContent>
        </Card>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default CommunityLedger;

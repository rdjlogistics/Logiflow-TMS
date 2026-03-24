import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { UsersRound } from "lucide-react";

const CommunityWorkspaces = () => {
  return (
    <DashboardLayout title="Community Workspaces">
      <FeatureGate feature="vervoerders_netwerk">
        <Card>
          <CardContent className="py-16 text-center">
            <UsersRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mb-2">Community Workspaces</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Beheer samenwerkingsverbanden met andere transportbedrijven. Deze functionaliteit wordt beschikbaar zodra er meerdere bedrijven op het platform actief zijn.
            </p>
          </CardContent>
        </Card>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default CommunityWorkspaces;

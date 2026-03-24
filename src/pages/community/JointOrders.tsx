import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent } from "@/components/ui/card";
import { Handshake } from "lucide-react";

const JointOrders = () => {
  return (
    <DashboardLayout title="Gezamenlijke Ritten">
      <FeatureGate feature="vervoerders_netwerk">
        <Card>
          <CardContent className="py-16 text-center">
            <Handshake className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mb-2">Gezamenlijke Ritten</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Beheer ritten die je deelt met partners in je workspaces. Deze functionaliteit wordt beschikbaar zodra er meerdere bedrijven op het platform actief zijn.
            </p>
          </CardContent>
        </Card>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default JointOrders;

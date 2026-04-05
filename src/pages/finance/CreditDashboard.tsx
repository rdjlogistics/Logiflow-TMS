import { Card, CardContent } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export const CreditDashboardContent = () => (
  <Card>
    <CardContent className="p-8 text-center text-muted-foreground">
      <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <h3 className="font-semibold text-foreground mb-1">Kredietbeheer</h3>
      <p className="text-sm">Kredietlimieten en betalingsgedrag worden hier weergegeven.</p>
    </CardContent>
  </Card>
);

export default CreditDashboardContent;

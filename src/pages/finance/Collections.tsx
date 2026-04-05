import { Card, CardContent } from "@/components/ui/card";
import { Scale } from "lucide-react";

export const CollectionsContent = () => (
  <Card>
    <CardContent className="p-8 text-center text-muted-foreground">
      <Scale className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <h3 className="font-semibold text-foreground mb-1">Incasso</h3>
      <p className="text-sm">Incasso-overzicht wordt hier weergegeven zodra er openstaande vorderingen zijn.</p>
    </CardContent>
  </Card>
);

export default CollectionsContent;

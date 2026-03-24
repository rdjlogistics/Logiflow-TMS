import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Map, Truck, Loader2 } from "lucide-react";

const LiveBoard = () => {
  const { user } = useAuth();

  const { data: activeTrips = [], isLoading } = useQuery({
    queryKey: ["live-board", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("trips")
        .select("id, order_number, status, pickup_city, delivery_city, drivers(name), vehicles(license_plate)")
        .eq("company_id", companyId)
        .in("status", ["onderweg", "geladen", "gepland"])
        .is("deleted_at", null)
        .order("trip_date", { ascending: false })
        .limit(50);

      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30s
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "onderweg": return "text-primary";
      case "geladen": return "text-amber-600";
      case "gepland": return "text-blue-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <DashboardLayout title="Live Board">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <CardTitle>Live Board</CardTitle>
            <Badge variant="outline">{activeTrips.length} actief</Badge>
          </div>
          <CardDescription>Overzicht van alle actieve ritten</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : activeTrips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>Geen actieve ritten op dit moment</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTrips.map((trip: any) => (
                <div key={trip.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Truck className={`h-5 w-5 ${statusColor(trip.status)}`} />
                    <div>
                      <p className="font-medium">{trip.order_number ?? trip.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.pickup_city ?? "—"} → {trip.delivery_city ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p>{(trip.drivers as any)?.name ?? "Geen chauffeur"}</p>
                      <p className="text-muted-foreground">{(trip.vehicles as any)?.license_plate ?? "—"}</p>
                    </div>
                    <Badge variant={trip.status === "onderweg" ? "default" : "secondary"}>
                      {trip.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default LiveBoard;

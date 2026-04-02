import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { FileSearch, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { AuditReviewDialog } from "@/components/enterprise/AuditReviewDialog";

const AuditQueue = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Query trips with price anomalies: where profit_margin_pct < -5 or abs distance deviation > 15%
  const { data: auditItems = [], isLoading } = useQuery({
    queryKey: ["audit-queue", user?.id],
    queryFn: async () => {
      const { data: companyRow } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyRow) return [];

      // Get recent trips that may have anomalies
      const { data: trips } = await supabase
        .from("trips")
        .select("id, order_number, status, sales_total, purchase_total, profit_margin_pct, distance_km, sales_distance_km, trip_date, customer_id, customers(company_name)")
        .eq("company_id", companyRow)
        .is("deleted_at", null)
        .not("sales_total", "is", null)
        .not("purchase_total", "is", null)
        .order("trip_date", { ascending: false })
        .limit(100);

      if (!trips) return [];

      // Detect anomalies
      const anomalies: Array<{
        id: string;
        type: string;
        order: string;
        amount: string;
        severity: "high" | "medium" | "low";
        tripDate: string;
        customer: string;
      }> = [];

      for (const trip of trips) {
        const margin = trip.profit_margin_pct ?? 0;
        const salesTotal = trip.sales_total ?? 0;
        const purchaseTotal = trip.purchase_total ?? 0;
        const diff = salesTotal - purchaseTotal;

        // Negative margin = price anomaly
        if (margin < -5) {
          anomalies.push({
            id: trip.id,
            type: "Prijsafwijking",
            order: trip.order_number ?? trip.id.slice(0, 8),
            amount: `€${Math.abs(diff).toFixed(2)} verlies`,
            severity: margin < -20 ? "high" : "medium",
            tripDate: trip.trip_date ?? "",
            customer: (trip.customers as any)?.company_name ?? "Onbekend",
          });
        }

        // Distance deviation
        if (trip.distance_km && trip.sales_distance_km && trip.sales_distance_km > 0) {
          const deviation = Math.abs(trip.distance_km - trip.sales_distance_km) / trip.sales_distance_km;
          if (deviation > 0.15) {
            anomalies.push({
              id: trip.id + "-dist",
              type: "Afstandsafwijking",
              order: trip.order_number ?? trip.id.slice(0, 8),
              amount: `${(deviation * 100).toFixed(0)}% meer km dan gepland`,
              severity: deviation > 0.3 ? "high" : "low",
              tripDate: trip.trip_date ?? "",
              customer: (trip.customers as any)?.company_name ?? "Onbekend",
            });
          }
        }
      }

      return anomalies;
    },
    enabled: !!user,
  });

  const visibleItems = auditItems.filter((item) => !resolvedIds.includes(item.id));

  const handleResolve = async (item: any, resolution: string, notes: string) => {
    const tripId = item.id.replace('-dist', '');
    try {
      await supabase.from('anomaly_events').insert({
        tenant_id: (await supabase.rpc('get_user_company_cached', { p_user_id: user!.id })).data,
        anomaly_type: item.type === 'Prijsafwijking' ? 'price_deviation' : 'distance_deviation',
        entity_type: 'trip',
        entity_id: tripId,
        title: `${item.type}: ${item.order}`,
        description: notes || resolution,
        severity: item.severity,
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user!.id,
        resolution_notes: `${resolution}: ${notes}`,
      });
    } catch {}
    setResolvedIds((prev) => [...prev, item.id]);
    queryClient.invalidateQueries({ queryKey: ['audit-queue'] });
  };

  const openReview = (item: any) => {
    setReviewItem(item);
    setReviewOpen(true);
  };

  return (
    <DashboardLayout title="Audit Queue">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-rose-500" />
            <CardTitle>Audit Queue</CardTitle>
            {visibleItems.length > 0 && <Badge variant="destructive">{visibleItems.length}</Badge>}
          </div>
          <CardDescription>Automatisch gedetecteerde afwijkingen in tarieven en uitvoering</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {visibleItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "default" : "secondary"}>
                      {item.severity.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-medium">{item.type}</p>
                      <p className="text-sm text-muted-foreground">
                        Order {item.order} — {item.customer} — {item.amount}
                      </p>
                      {item.tripDate && (
                        <p className="text-xs text-muted-foreground">{format(new Date(item.tripDate), "d MMM yyyy", { locale: nl })}</p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openReview(item)}>Afhandelen</Button>
                </div>
              ))}
              {visibleItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p>Geen openstaande audit items</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AuditReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        item={reviewItem}
        onResolve={handleResolve}
      />
    </DashboardLayout>
  );
};

export default AuditQueue;

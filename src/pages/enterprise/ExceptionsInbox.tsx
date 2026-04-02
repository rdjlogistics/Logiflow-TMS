import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Radar, AlertTriangle, CheckCircle, Loader2, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ExceptionActionDialog } from "@/components/enterprise/ExceptionActionDialog";

const ExceptionsInbox = () => {
  const { user } = useAuth();
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [actionException, setActionException] = useState<any>(null);
  const [actionMode, setActionMode] = useState<"ping" | "resolve">("resolve");
  const [actionOpen, setActionOpen] = useState(false);

  const { data: exceptions = [], isLoading } = useQuery({
    queryKey: ["exceptions-inbox", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("anomaly_events")
        .select("*")
        .eq("tenant_id", companyId)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(50);

      return data ?? [];
    },
    enabled: !!user,
  });

  const visible = exceptions.filter((e: any) => !resolvedIds.includes(e.id));

  const handleResolve = async (id: string) => {
    await supabase.from("anomaly_events").update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user!.id }).eq("id", id);
    setResolvedIds((prev) => [...prev, id]);
    toast({ title: "Exception opgelost ✓" });
  };

  const openAction = (e: any, mode: "ping" | "resolve") => {
    setActionException({
      type: e.title,
      order: e.entity_id ?? e.id.slice(0, 8),
      time: e.description ?? "",
      severity: e.severity ?? "warning",
      _id: e.id,
    });
    setActionMode(mode);
    setActionOpen(true);
  };

  return (
    <DashboardLayout title="Exceptions Inbox">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-orange-500" />
            <CardTitle>Exceptions Inbox</CardTitle>
            {visible.length > 0 && <Badge variant="destructive">{visible.length}</Badge>}
          </div>
          <CardDescription>Gedetecteerde afwijkingen in operatie</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p>Geen openstaande exceptions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-5 w-5 ${e.severity === "critical" ? "text-destructive" : e.severity === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{e.title}</p>
                        <Badge variant={e.severity === "critical" ? "destructive" : "secondary"}>{e.severity ?? e.anomaly_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{e.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), "d MMM HH:mm", { locale: nl })}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openAction(e, "ping")}>
                      <Bell className="h-3 w-3 mr-1" /> Ping
                    </Button>
                    <Button size="sm" onClick={() => openAction(e, "resolve")}>Oplossen</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExceptionActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        exception={actionException}
        mode={actionMode}
        onResolve={(exc) => handleResolve((exc as any)._id ?? exc.order)}
        onPing={async (exc, message) => {
          try {
            const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
            if (!companyId) return;
            const entityId = (exc as any)._id ?? exc.order;
            await supabase.from("notifications").insert({
              tenant_id: companyId,
              user_id: user!.id,
              title: `Ping: ${exc.type}`,
              message: message || `Status update gevraagd voor order ${exc.order}`,
              type: "ping",
              channel: "push",
              entity_type: "anomaly_event",
              entity_id: entityId,
            });
            toast({ title: "Ping verzonden ✓", description: `Notificatie aangemaakt voor order ${exc.order}` });
          } catch (err: any) {
            toast({ title: "Ping mislukt", description: err.message, variant: "destructive" });
          }
        }}
      />
    </DashboardLayout>
  );
};

export default ExceptionsInbox;

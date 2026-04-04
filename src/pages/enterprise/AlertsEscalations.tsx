import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertRuleDialog } from "@/components/enterprise/AlertRuleDialog";

const AlertsEscalations = () => {
  const { user } = useAuth();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["alert-rules", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("alert_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("name");

      return data ?? [];
    },
    enabled: !!user,
  });

  // Live exceptions as active alerts
  const { data: activeAlerts = [] } = useQuery({
    queryKey: ["active-alerts", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("anomaly_events")
        .select("*")
        .eq("tenant_id", companyId)
        .eq("is_resolved", false)
        .in("severity", ["warning", "critical"])
        .order("created_at", { ascending: false })
        .limit(10);

      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout title="Alerts & Escalations">
      <div className="space-y-4">
        {activeAlerts.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500 animate-pulse" />
                <CardTitle className="text-amber-700 dark:text-amber-300">Actieve Alerts</CardTitle>
                <Badge variant="destructive">{activeAlerts.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeAlerts.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${alert.severity === "critical" ? "text-destructive" : "text-amber-500"}`} />
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                    <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Alert Regels</CardTitle>
              </div>
              <Button size="sm" onClick={() => { setSelectedRule(null); setRuleDialogOpen(true); >
                Nieuwe Regel
              </Button>
            </div>
            <CardDescription>Configureer automatische escalatie regels</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Nog geen alert regels geconfigureerd</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule: any) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{rule.name}</span>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Actief" : "Inactief"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      <div className="flex gap-2 mt-1">
                        {rule.notification_channels?.map((ch: string) => (
                          <Badge key={ch} variant="outline">{ch}</Badge>
                        ))}
                        {rule.escalation_after_minutes && (
                          <Badge variant="outline">Escalatie na {rule.escalation_after_minutes} min</Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRule(rule); setRuleDialogOpen(true); >
                      Bewerken
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertRuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        rule={selectedRule}
        onSave={async (ruleData) => {
          try {
            const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
            if (!companyId) return;
            const escalationMinutes = ruleData.autoEscalate ? parseInt(ruleData.autoEscalate.replace(/[^0-9]/g, '')) || 15 : 15;
            if (selectedRule?.id && !selectedRule.id.startsWith("ALT-")) {
              await supabase.from("alert_rules").update({
                name: ruleData.name || "",
                description: ruleData.trigger || "",
                notification_channels: ruleData.channels || [],
                escalation_after_minutes: escalationMinutes,
                is_active: true,
              }).eq("id", selectedRule.id);
            } else {
              await supabase.from("alert_rules").insert({
                company_id: companyId,
                name: ruleData.name || "",
                description: ruleData.trigger || "",
                notification_channels: ruleData.channels || [],
                escalation_after_minutes: escalationMinutes,
                is_active: true,
              });
            }
            toast({ title: "Regel opgeslagen ✓" });
          } catch (err: any) {
            toast({ title: "Fout bij opslaan", description: err.message, variant: "destructive" });
          }
        }}
      />
    </DashboardLayout>
  );
};

export default AlertsEscalations;

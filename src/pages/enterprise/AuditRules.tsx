import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AuditRules = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["audit-rules", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("audit_tolerance_rules")
        .select("*")
        .eq("company_id", companyId)
        .order("rule_name");

      return data ?? [];
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("audit_tolerance_rules")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-rules"] });
      toast({ title: "Regel bijgewerkt ✓" });
    },
  });

  return (
    <DashboardLayout title="Rules & Tolerances">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-500" />
            <CardTitle>Audit Rules & Tolerances</CardTitle>
          </div>
          <CardDescription>Configureer toleranties voor automatische flagging</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Nog geen audit regels geconfigureerd</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((r: any) => (
                <div key={r.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{r.rule_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Type: {r.rule_type}
                      {r.tolerance_percentage != null && ` • ${r.tolerance_percentage}%`}
                      {r.tolerance_amount != null && ` • €${r.tolerance_amount}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.auto_flag_enabled && <Badge variant="outline">Auto-flag</Badge>}
                    <Button
                      size="sm"
                      variant={r.is_active ? "default" : "secondary"}
                      onClick={() => toggleMutation.mutate({ id: r.id, isActive: r.is_active })}
                    >
                      {r.is_active ? "Actief" : "Inactief"}
                    </Button>
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

export default AuditRules;

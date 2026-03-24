import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Play, Plus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PlaybookDialog } from "@/components/enterprise/PlaybookDialog";
import { useState } from "react";

const Playbooks = () => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Playbooks are stored as alert_rules with specific exception_types
  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["playbooks", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("alert_rules")
        .select("*")
        .eq("company_id", companyId)
        .not("exception_types", "is", null)
        .order("name");

      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout title="Playbooks">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              <CardTitle>Exception Playbooks</CardTitle>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nieuw Playbook
            </Button>
          </div>
          <CardDescription>Geautomatiseerde actievoorstellen per exception type</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : playbooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Play className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Nog geen playbooks geconfigureerd</p>
              <p className="text-sm mt-1">Maak een playbook aan om automatische acties bij exceptions te definiëren</p>
            </div>
          ) : (
            <div className="space-y-3">
              {playbooks.map((pb: any) => (
                <div key={pb.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">{pb.name}</p>
                    <p className="text-sm text-muted-foreground">{pb.description}</p>
                    <div className="flex gap-2 mt-1">
                      {pb.exception_types?.map((t: string) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                      {pb.notification_channels?.map((ch: string) => (
                        <Badge key={ch} variant="secondary">{ch}</Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant={pb.is_active ? "default" : "secondary"}>
                    {pb.is_active ? "Actief" : "Inactief"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PlaybookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(playbook) => {
          toast({ title: "Playbook opgeslagen ✓", description: `Playbook "${playbook.name}" is aangemaakt.` });
        }}
      />
    </DashboardLayout>
  );
};

export default Playbooks;

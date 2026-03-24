import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Lock, AlertTriangle, Clock, Map, Plus, Loader2, Settings } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const Constraints = () => {
  const { user } = useAuth();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["planning-constraints", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("availability_blocks")
        .select("*")
        .eq("company_id", companyId)
        .order("start_time", { ascending: false })
        .limit(50);

      return data ?? [];
    },
    enabled: !!user,
  });

  const activeCount = blocks.length;
  const recurringCount = blocks.filter((b: any) => b.is_recurring).length;

  return (
    <DashboardLayout title="Planning Constraints">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Actieve blokkades</p><p className="text-2xl font-bold">{activeCount}</p></div><Lock className="h-8 w-8 text-primary" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Terugkerend</p><p className="text-2xl font-bold">{recurringCount}</p></div><Clock className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Entity types</p><p className="text-2xl font-bold">{new Set(blocks.map((b: any) => b.entity_type)).size}</p></div><Map className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Planning Constraints</CardTitle>
              </div>
              <Button size="sm" onClick={() => toast({ title: "Nieuwe constraint", description: "Ga naar Planning → Beschikbaarheid om blokkades toe te voegen." })}>
                <Plus className="h-4 w-4 mr-2" /> Nieuwe Regel
              </Button>
            </div>
            <CardDescription>Beschikbaarheidsblokkades voor chauffeurs en voertuigen</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : blocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Geen blokkades geconfigureerd</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block: any) => (
                  <div key={block.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <Badge variant="outline">{block.entity_type}</Badge>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{block.reason ?? block.block_type ?? "Blokkade"}</span>
                          {block.is_recurring && <Badge variant="secondary">Terugkerend</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(block.start_time), "d MMM HH:mm", { locale: nl })} — {format(new Date(block.end_time), "d MMM HH:mm", { locale: nl })}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Constraints;

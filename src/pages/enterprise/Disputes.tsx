import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DisputeDetailDialog } from "@/components/enterprise/DisputeDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, FileSpreadsheet, Clock, BadgeCheck, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const Disputes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [respondOpen, setRespondOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [detailCase, setDetailCase] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["disputes", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("claim_cases")
        .select("*, trips(order_number, customers(company_name))")
        .eq("tenant_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);

      return data ?? [];
    },
    enabled: !!user,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("claim_cases")
        .update({ status: "settled" as any, notes, resolved_at: new Date().toISOString(), resolved_by: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast({ title: "Dispute opgelost ✓" });
      setRespondOpen(false);
      setResponseText("");
    },
  });

  const filtered = cases.filter((c: any) =>
    filter === "all" ? true :
    filter === "open" ? !["settled", "rejected"].includes(c.status) :
    ["settled", "rejected"].includes(c.status)
  );

  const openCount = cases.filter((c: any) => !["settled", "rejected"].includes(c.status)).length;
  const totalAmount = cases.filter((c: any) => !["settled", "rejected"].includes(c.status)).reduce((s: number, c: any) => s + (c.claimed_amount ?? 0), 0);

  const statusLabel = (s: string) => {
    switch (s) {
      case "open": return "Open";
      case "in_review": return "In behandeling";
      case "awaiting_info": return "Info gevraagd";
      case "approved": return "Goedgekeurd";
      case "rejected": return "Afgewezen";
      case "settled": return "Opgelost";
      default: return s;
    }
  };

  return (
    <DashboardLayout title="Disputes">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Openstaand</p><p className="text-2xl font-bold">{openCount}</p></div><AlertTriangle className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Totaal bedrag</p><p className="text-2xl font-bold">€{totalAmount.toFixed(2)}</p></div><FileSpreadsheet className="h-8 w-8 text-rose-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">In behandeling</p><p className="text-2xl font-bold">{cases.filter((c: any) => c.status === "in_review").length}</p></div><Clock className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Opgelost</p><p className="text-2xl font-bold">{cases.filter((c: any) => ["settled", "rejected"].includes(c.status)).length}</p></div><BadgeCheck className="h-8 w-8 text-emerald-500" /></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                <CardTitle>Disputes</CardTitle>
                {openCount > 0 && <Badge variant="destructive">{openCount}</Badge>}
              </div>
              <div className="flex gap-2">
                {(["all", "open", "closed"] as const).map((f) => (
                  <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                    {f === "all" ? "Alle" : f === "open" ? "Open" : "Opgelost"}
                  </Button>
                ))}
              </div>
            </div>
            <CardDescription>Claims en geschillen over orders</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p>Geen disputes gevonden</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setDetailCase(c); setDetailOpen(true); }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{c.id.slice(0, 8).toUpperCase()}</span>
                        <Badge variant={!["settled", "rejected"].includes(c.status) ? "destructive" : "secondary"}>
                          {statusLabel(c.status)}
                        </Badge>
                        <Badge variant="outline">{c.claim_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(c.trips as any)?.customers?.company_name ?? "—"} • Order {(c.trips as any)?.order_number ?? "—"}
                      </p>
                      {c.notes && <p className="text-sm text-muted-foreground truncate">{c.notes}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-rose-600">€{(c.claimed_amount ?? 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "d MMM yyyy", { locale: nl })}</p>
                      </div>
                      {!["settled", "rejected"].includes(c.status) && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelectedCase(c); setRespondOpen(true); }}>Reageren</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Oplossen</DialogTitle>
            <DialogDescription>Markeer als opgelost met notitie</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{selectedCase?.claim_type}</p>
              <p className="text-sm text-muted-foreground">Bedrag: €{(selectedCase?.claimed_amount ?? 0).toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label>Oplossing</Label>
              <Textarea placeholder="Beschrijf de oplossing..." value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>Annuleren</Button>
            <Button onClick={() => resolveMutation.mutate({ id: selectedCase?.id, notes: responseText })} disabled={!responseText.trim() || resolveMutation.isPending}>
              {resolveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Oplossen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DisputeDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        dispute={detailCase ? {
          id: detailCase.id.slice(0, 8).toUpperCase(),
          carrier: (detailCase.trips as any)?.customers?.company_name ?? "—",
          order: (detailCase.trips as any)?.order_number ?? "—",
          type: detailCase.claim_type,
          amount: detailCase.claimed_amount ?? 0,
          status: detailCase.status,
          createdAt: format(new Date(detailCase.created_at), "d MMM yyyy", { locale: nl }),
          description: detailCase.notes ?? "Geen beschrijving",
        } : null}
        onResolve={() => {
          resolveMutation.mutate({ id: detailCase?.id, notes: "Opgelost via detail dialog" });
          setDetailOpen(false);
        }}
      />
    </DashboardLayout>
  );
};

export default Disputes;

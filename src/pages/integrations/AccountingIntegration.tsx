import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function AccountingIntegration() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.company_id;

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ["accounting-integrations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_integrations")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const startExactOnline = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("exact-oauth-start");
      if (error) throw error;
      if (data?.auth_url) {
        window.open(data.auth_url, "_blank");
      } else {
        toast({ title: "Exact Online", description: data?.message || "OAuth flow gestart" });
      }
    } catch (e: any) {
      toast({ title: "Fout", description: e.message || "Kan verbinding niet starten", variant: "destructive" });
    }
  };

  const providers = [
    { id: "exact_online", name: "Exact Online", description: "Volledige boekhouding integratie met facturen, relaties en grootboek synchronisatie", color: "bg-blue-500" },
    { id: "twinfield", name: "Twinfield", description: "Wolters Kluwer boekhoudpakket koppeling", color: "bg-emerald-500" },
    { id: "xero", name: "Xero", description: "Cloud boekhoudsoftware integratie", color: "bg-cyan-500" },
    { id: "quickbooks", name: "QuickBooks", description: "Intuit boekhouding en facturatie", color: "bg-green-500" },
  ];

  const activeIntegration = integrations.find((i: any) => i.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boekhouding Koppeling"
        description="Verbind je boekhoudpakket voor automatische synchronisatie"
      />

      {/* Active integration status */}
      {activeIntegration && (
        <Card variant="glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-semibold">Verbonden met {activeIntegration.provider}</p>
                  <p className="text-xs text-muted-foreground">
                    Laatst gesynchroniseerd: {activeIntegration.last_sync_at
                      ? format(new Date(activeIntegration.last_sync_at), "d MMM yyyy HH:mm", { locale: nl })
                      : "Nooit"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={activeIntegration.sync_status === "success" ? "default" : "destructive"}>
                  {activeIntegration.sync_status || "onbekend"}
                </Badge>
              </div>
            </div>
            {activeIntegration.sync_error && (
              <p className="mt-3 text-sm text-destructive">{activeIntegration.sync_error}</p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {activeIntegration.sync_invoices ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                <span>Facturen sync</span>
              </div>
              <div className="flex items-center gap-2">
                {activeIntegration.sync_customers ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                <span>Relaties sync</span>
              </div>
              <div className="flex items-center gap-2">
                {activeIntegration.sync_payments ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                <span>Betalingen sync</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map(p => {
          const connected = integrations.find((i: any) => i.provider === p.id && i.is_active);
          return (
            <Card key={p.id} variant={connected ? "glow" : "default"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${p.color} flex items-center justify-center`}>
                      <ArrowRightLeft className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription className="text-xs">{p.description}</CardDescription>
                    </div>
                  </div>
                  {connected && <Badge variant="default">Verbonden</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {p.id === "exact_online" ? (
                  <Button onClick={startExactOnline} variant={connected ? "outline" : "default"} className="w-full gap-2">
                    {connected ? <RefreshCw className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                    {connected ? "Opnieuw verbinden" : "Verbinden"}
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Binnenkort beschikbaar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync settings info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synchronisatie instellingen</CardTitle>
          <CardDescription>Configureer welke data wordt gesynchroniseerd met je boekhoudpakket</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• <strong>Facturen</strong> — Automatisch exporteren bij status 'verzonden'</p>
          <p>• <strong>Relaties</strong> — Klantgegevens synchroniseren bij aanmaken</p>
          <p>• <strong>Betalingen</strong> — Betalingsstatus bijwerken bij ontvangst</p>
          <p>• <strong>Grootboek</strong> — Mapping naar je rekeningschema</p>
        </CardContent>
      </Card>
    </div>
  );
}

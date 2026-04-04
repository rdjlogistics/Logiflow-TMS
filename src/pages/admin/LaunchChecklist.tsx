import { useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, Play,
  Shield, Database, Users, FileText, CreditCard, Settings,
  Truck, Package, Rocket, RefreshCw, Clock
} from "lucide-react";

interface CheckResult {
  key: string;
  name: string;
  category: string;
  status: "passed" | "failed" | "warning" | "pending" | "running";
  details?: string;
}

const CATEGORIES = [
  { key: "security", label: "Beveiliging", icon: Shield, color: "text-red-500" },
  { key: "data", label: "Data & Configuratie", icon: Database, color: "text-blue-500" },
  { key: "users", label: "Gebruikers & Rollen", icon: Users, color: "text-green-500" },
  { key: "finance", label: "Facturatie & Betaling", icon: CreditCard, color: "text-amber-500" },
  { key: "operations", label: "Operationeel", icon: Truck, color: "text-purple-500" },
  { key: "branding", label: "Branding & Instellingen", icon: Settings, color: "text-pink-500" },
];

const useRunChecklist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<CheckResult[]> => {
      const results: CheckResult[] = [];

      // Helper
      const addCheck = (key: string, name: string, category: string, passed: boolean, details?: string) => {
        results.push({ key, name, category, status: passed ? "passed" : "failed", details });
      };
      const addWarning = (key: string, name: string, category: string, details?: string) => {
        results.push({ key, name, category, status: "warning", details });
      };

      // 1. SECURITY CHECKS
      // Check if user_roles table has entries
      const { count: roleCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });
      addCheck("roles_exist", "Gebruikersrollen geconfigureerd", "security",
        (roleCount ?? 0) > 0, `${roleCount ?? 0} rollen gevonden`);

      // Check admin exists
      const { count: adminCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      addCheck("admin_exists", "Minimaal één admin account", "security",
        (adminCount ?? 0) > 0, `${adminCount ?? 0} admins`);

      // Check profiles exist
      const { count: profileCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      addCheck("profiles_exist", "Gebruikersprofielen aangemaakt", "security",
        (profileCount ?? 0) > 0, `${profileCount ?? 0} profielen`);

      // 2. DATA CHECKS
      // Company configured
      const { data: company } = await supabase
        .from("companies")
        .select("id, name, vat_number, iban, kvk_number, address")
        .limit(1)
        .maybeSingle();
      addCheck("company_configured", "Bedrijfsgegevens ingevuld", "data",
        !!(company?.name && company?.address),
        company?.name ? `${company.name}` : "Geen bedrijf gevonden");

      addCheck("company_vat", "BTW-nummer ingevuld", "data",
        !!company?.vat_number, company?.vat_number ?? "Ontbreekt");
      
      addCheck("company_iban", "IBAN ingevuld", "data",
        !!company?.iban, company?.iban ? "✓ Ingevuld" : "Ontbreekt");

      addCheck("company_kvk", "KvK-nummer ingevuld", "data",
        !!company?.kvk_number, company?.kvk_number ?? "Ontbreekt");

      // 3. USERS CHECKS
      const { count: driverCount } = await supabase
        .from("drivers")
        .select("*", { count: "exact", head: true });
      addCheck("drivers_exist", "Chauffeurs aangemaakt", "users",
        (driverCount ?? 0) > 0, `${driverCount ?? 0} chauffeurs`);

      const { count: customerCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      addCheck("customers_exist", "Klanten aangemaakt", "users",
        (customerCount ?? 0) > 0, `${customerCount ?? 0} klanten`);

      // 4. FINANCE CHECKS
      // Invoice settings
      const { data: invoiceSettings } = await supabase
        .from("invoice_settings")
        .select("id, number_prefix")
        .limit(1)
        .maybeSingle();
      addCheck("invoice_settings", "Factuur-instellingen geconfigureerd", "finance",
        !!invoiceSettings, invoiceSettings ? `Prefix: ${invoiceSettings.number_prefix}` : "Niet geconfigureerd");

      // Products exist
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      addCheck("products_exist", "Producten/tarieven aangemaakt", "finance",
        (productCount ?? 0) > 0, `${productCount ?? 0} producten`);

      // Subscription active
      const { data: subscription } = await supabase
        .from("tenant_subscriptions")
        .select("status, subscription_plans(name)")
        .limit(1)
        .maybeSingle();
      const subActive = subscription?.status === "active" || subscription?.status === "trial";
      addCheck("subscription_active", "Abonnement actief", "finance",
        subActive,
        subscription ? `${(subscription.subscription_plans as any)?.name} (${subscription.status})` : "Geen abonnement");

      // 5. OPERATIONS CHECKS
      const { count: vehicleCount } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true });
      addCheck("vehicles_exist", "Voertuigen aangemaakt", "operations",
        (vehicleCount ?? 0) > 0, `${vehicleCount ?? 0} voertuigen`);

      // Test order exists
      const { count: orderCount } = await supabase
        .from("trips")
        .select("*", { count: "exact", head: true });
      if ((orderCount ?? 0) > 0) {
        addCheck("test_order", "Test order aangemaakt", "operations", true, `${orderCount} orders`);
      } else {
        addWarning("test_order", "Geen test order aangemaakt", "operations", "Maak een testorder aan om de workflow te verifiëren");
      }

      // 6. BRANDING CHECKS
      const companyBranding = await supabase
        .from("companies")
        .select("logo_url, primary_color")
        .limit(1)
        .maybeSingle();
      addCheck("logo_uploaded", "Logo geüpload", "branding",
        !!companyBranding.data?.logo_url, companyBranding.data?.logo_url ? "✓ Logo aanwezig" : "Geen logo");
      
      addCheck("brand_color", "Huisstijl kleur ingesteld", "branding",
        !!companyBranding.data?.primary_color,
        companyBranding.data?.primary_color ?? "Standaard kleur");

      // Persist results to DB
      if (company?.id) {
        for (const result of results) {
          await supabase.from("launch_checklist_results").upsert({
            tenant_id: company.id,
            check_key: result.key,
            check_name: result.name,
            category: result.category,
            status: result.status,
            details_json: { details: result.details },
            checked_at: new Date().toISOString(),
          }, { onConflict: "tenant_id,check_key" });
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["launch-checklist"] });
      toast.success("Checklist voltooid!");
    },
    onError: (err) => {
      toast.error("Fout bij uitvoeren checklist: " + (err as Error).message);
    },
  });
};

const useSavedChecklist = () =>
  useQuery({
    queryKey: ["launch-checklist"],
    queryFn: async () => {
      const { data } = await supabase
        .from("launch_checklist_results")
        .select("*")
        .order("category")
        .order("check_key");
      return (data ?? []).map((r) => ({
        key: r.check_key,
        name: r.check_name,
        category: r.category,
        status: r.status as CheckResult["status"],
        details: (r.details_json as any)?.details,
        checkedAt: r.checked_at,
      }));
    },
    staleTime: 60_000,
  });

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "passed": return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "failed": return <XCircle className="h-5 w-5 text-destructive" />;
    case "warning": return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "running": return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    default: return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

const LaunchChecklist = () => {
  const { data: savedResults } = useSavedChecklist();
  const runChecklist = useRunChecklist();
  const [liveResults, setLiveResults] = useState<CheckResult[] | null>(null);

  const results = liveResults ?? savedResults ?? [];
  const passed = results.filter((r) => r.status === "passed").length;
  const total = results.length || 1;
  const score = Math.round((passed / total) * 100);

  const handleRun = async () => {
    setLiveResults(null);
    const res = await runChecklist.mutateAsync();
    setLiveResults(res);
  };

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    checks: results.filter((r) => r.category === cat.key),
  })).filter((g) => g.checks.length > 0);

  const isReady = score >= 80;

  return (
    <DashboardLayout title="Launch Checklist">
      <div}}}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" />
              Launch Gereedheid
            </h1>
            <p className="text-muted-foreground">
              Automatische controle of je tenant klaar is voor productie
            </p>
          </div>
          <Button
            onClick={handleRun}
            loading={runChecklist.isPending}
            size="lg"
            className="gap-2"
          >
            {runChecklist.isPending ? (
              <>Controleren...</>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Controle
              </>
            )}
          </Button>
        </div>

        {/* Score card */}
        {results.length > 0 && (
          <Card className={isReady ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className={`h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                  isReady ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                }`}>
                  {score}%
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {isReady ? "🎉 Klaar voor launch!" : "⚠️ Nog niet klaar"}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {passed}/{results.length} checks geslaagd
                    </span>
                  </div>
                  <Progress value={score} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {isReady
                      ? "Alle kritieke configuratie is voltooid. Je kunt live gaan."
                      : "Los de onderstaande problemen op voordat je live gaat."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {results.length === 0 && !runChecklist.isPending && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nog geen controle uitgevoerd</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Klik op "Start Controle" om automatisch te checken of alle
                configuratie, data en beveiliging correct is ingesteld.
              </p>
              <Button onClick={handleRun} size="lg" className="gap-2">
                <Play className="h-4 w-4" />
                Start Controle
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results by category */}
        {grouped.length > 0 && (
          <Accordion type="multiple" defaultValue={grouped.filter(g => g.checks.some(c => c.status !== "passed")).map(g => g.key)}>
            {grouped.map((group) => {
              const groupPassed = group.checks.filter((c) => c.status === "passed").length;
              const groupTotal = group.checks.length;
              const allPassed = groupPassed === groupTotal;
              const Icon = group.icon;

              return (
                <AccordionItem key={group.key} value={group.key}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 w-full">
                      <Icon className={`h-5 w-5 ${group.color}`} />
                      <span className="font-medium">{group.label}</span>
                      <div className="ml-auto mr-4 flex items-center gap-2">
                        <Badge variant={allPassed ? "default" : "secondary"}>
                          {groupPassed}/{groupTotal}
                        </Badge>
                        {allPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {group.checks.map((check) => (
                        <div
                          key={check.key}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <StatusIcon status={check.status} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{check.name}</p>
                            {check.details && (
                              <p className="text-xs text-muted-foreground truncate">{check.details}</p>
                            )}
                          </div>
                          <Badge
                            variant={
                              check.status === "passed" ? "default" :
                              check.status === "warning" ? "secondary" :
                              "destructive"
                            }
                            className="text-xs"
                          >
                            {check.status === "passed" ? "OK" :
                             check.status === "warning" ? "Waarschuwing" :
                             check.status === "failed" ? "Actie vereist" : "Wacht"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LaunchChecklist;

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plug, Wifi, WifiOff, RefreshCcw, Trash2, TestTube, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { MigrationConnector } from "@/hooks/useMigrationEngine";

const API_PROVIDERS = [
  {
    key: "TRANSPOREON",
    name: "Transporeon",
    description: "Europees logistics platform — REST API",
    fields: [
      { key: "api_url", label: "API URL", placeholder: "https://api.transporeon.com", type: "url" },
      { key: "api_key", label: "API Key", placeholder: "Uw Transporeon API key", type: "password" },
      { key: "api_secret", label: "API Secret", placeholder: "Uw Transporeon API secret", type: "password" },
    ],
  },
  {
    key: "BOLTRICS",
    name: "Boltrics",
    description: "Dynamics 365 TMS — OData API",
    fields: [
      { key: "api_url", label: "Tenant API URL", placeholder: "https://tenant.api.boltrics.com", type: "url" },
      { key: "bearer_token", label: "Bearer Token", placeholder: "OAuth2 bearer token", type: "password" },
    ],
  },
  {
    key: "CARGOWISE",
    name: "CargoWise",
    description: "Global logistics platform — Enterprise API",
    fields: [
      { key: "api_url", label: "Instance URL", placeholder: "https://instance.cargowise.com", type: "url" },
      { key: "api_key", label: "API Key", placeholder: "Uw CargoWise API key", type: "password" },
    ],
  },
] as const;

interface ApiConnectorPanelProps {
  projectId: string;
  connectors: MigrationConnector[];
  onConnectorCreated: () => void;
}

export function ApiConnectorPanel({ projectId, connectors, onConnectorCreated }: ApiConnectorPanelProps) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [syncSchedule, setSyncSchedule] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const apiConnectors = connectors.filter(c => c.type === "API_PULL");
  const provider = API_PROVIDERS.find(p => p.key === selectedProvider);

  const handleSaveConnector = async () => {
    if (!provider) return;
    setSaving(true);

    try {
      // 1. Create the connector record
      const { data: connector, error: createErr } = await supabase
        .from("migration_connectors")
        .insert({
          project_id: projectId,
          type: "API_PULL",
          config_json: { source_system: provider.key, provider_name: provider.name },
          status: "ACTIVE",
          sync_schedule: syncSchedule,
        } as any)
        .select()
        .single();

      if (createErr || !connector) throw new Error(createErr?.message || "Connector aanmaken mislukt");

      // 2. Store credentials in Vault via RPC
      const { error: vaultErr } = await supabase.rpc(
        "store_api_connector_credentials" as any,
        {
          p_connector_id: connector.id,
          p_credentials: credentials,
        },
      );

      if (vaultErr) {
        // Clean up connector if vault fails
        await supabase.from("migration_connectors").delete().eq("id", connector.id);
        throw new Error("Credentials opslaan mislukt: " + vaultErr.message);
      }

      toast({ title: "API Connector toegevoegd", description: `${provider.name} is succesvol geconfigureerd.` });
      setSetupOpen(false);
      setCredentials({});
      setSelectedProvider("");
      onConnectorCreated();
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (connectorId: string) => {
    setTesting(connectorId);
    try {
      const { data, error } = await supabase.functions.invoke("migration-api-sync", {
        body: { connector_id: connectorId, sync_type: "test" },
      });

      if (error) throw error;
      if (data?.success) {
        toast({ title: "Verbinding OK", description: data.message || "API verbinding succesvol getest." });
      } else {
        toast({ title: "Test mislukt", description: data?.error || "Onbekende fout", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Test mislukt", description: err.message, variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const handleSync = async (connectorId: string) => {
    setSyncing(connectorId);
    try {
      const { data, error } = await supabase.functions.invoke("migration-api-sync", {
        body: { connector_id: connectorId, sync_type: "full" },
      });

      if (error) throw error;
      if (data?.success) {
        toast({ title: "Sync voltooid", description: data.message || `${data.records_synced} records gesynchroniseerd.` });
        onConnectorCreated(); // Refresh
      } else {
        toast({ title: "Sync mislukt", description: data?.error || "Onbekende fout", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sync mislukt", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (connectorId: string) => {
    setDeleting(connectorId);
    try {
      const { error } = await supabase
        .from("migration_connectors")
        .delete()
        .eq("id", connectorId);
      if (error) throw error;
      toast({ title: "Connector verwijderd" });
      onConnectorCreated();
    } catch (err: any) {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {API_PROVIDERS.map((prov) => {
          const existingConn = apiConnectors.find(
            (c) => (c.config_json as any)?.source_system === prov.key,
          );

          return (
            <Card key={prov.key} variant={existingConn ? "glow" : "default"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{prov.name}</CardTitle>
                  {existingConn ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Wifi className="h-3 w-3 mr-1" />
                      Verbonden
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Niet verbonden
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{prov.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {existingConn ? (
                  <>
                    {/* Status info */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {existingConn.last_success_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Laatst gesync: {new Date(existingConn.last_success_at).toLocaleString("nl-NL")}
                        </div>
                      )}
                      {(existingConn as any).last_sync_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(existingConn as any).last_sync_count} records
                        </div>
                      )}
                      {existingConn.last_error && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {existingConn.last_error}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleTest(existingConn.id)}
                        disabled={testing === existingConn.id}
                      >
                        {testing === existingConn.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <TestTube className="h-3 w-3 mr-1" />
                        )}
                        Test
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSync(existingConn.id)}
                        disabled={syncing === existingConn.id}
                      >
                        {syncing === existingConn.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCcw className="h-3 w-3 mr-1" />
                        )}
                        Sync
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleDelete(existingConn.id)}
                        disabled={deleting === existingConn.id}
                      >
                        {deleting === existingConn.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedProvider(prov.key);
                      setCredentials({});
                      setSetupOpen(true);
                    }}
                  >
                    <Plug className="h-3 w-3 mr-1" />
                    Verbinden
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Setup Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{provider?.name} Verbinden</DialogTitle>
            <DialogDescription>
              Voer uw API credentials in om {provider?.name} te verbinden. Credentials worden veilig opgeslagen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {provider?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type === "password" ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={credentials[field.key] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label>Sync Schema</Label>
              <Select value={syncSchedule} onValueChange={setSyncSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Handmatig</SelectItem>
                  <SelectItem value="daily">Dagelijks</SelectItem>
                  <SelectItem value="hourly">Elk uur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveConnector}
              disabled={saving || !provider?.fields.every((f) => credentials[f.key]?.trim())}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
              Opslaan & Verbinden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

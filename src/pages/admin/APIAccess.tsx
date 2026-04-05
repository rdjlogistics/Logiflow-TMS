import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Copy, Eye, EyeOff, Shield, Clock } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function APIAccess() {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const tenantId = company?.id;

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["api-keys", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("company_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const keyValue = `lf_${crypto.randomUUID().replace(/-/g, "")}`;
      const keyPrefix = keyValue.substring(0, 8);
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(keyValue));
      const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("api_keys").insert({
        company_id: tenantId!,
        name: keyName,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: ["read", "write"],
        is_active: true,
      });
      if (error) throw error;
      return keyValue;
    },
    onSuccess: (keyValue) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      navigator.clipboard.writeText(keyValue);
      toast({ title: "API key aangemaakt", description: "Key is naar je klembord gekopieerd. Bewaar deze veilig — hij wordt niet meer getoond." });
      setDialogOpen(false);
      setKeyName("");
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("api_keys").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <DashboardLayout title="API Toegang" description="Beheer API keys voor externe integraties">
    <div className="space-y-6">
      <PageHeader
        title="API Toegang"
        description="Beheer API keys voor externe integraties"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nieuwe API key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>API key aanmaken</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Naam</Label>
                  <Input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Bijv. WMS integratie" />
                </div>
                <p className="text-xs text-muted-foreground">
                  De gegenereerde key wordt eenmalig getoond en naar je klembord gekopieerd. Bewaar deze veilig.
                </p>
                <Button onClick={() => createMutation.mutate()} disabled={!keyName || createMutation.isPending} className="w-full">
                  Genereer API key
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Totaal keys</p>
            <p className="text-2xl font-bold">{apiKeys.length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actief</p>
            <p className="text-2xl font-bold text-emerald-500">{apiKeys.filter((k: any) => k.is_active).length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Inactief</p>
            <p className="text-2xl font-bold text-muted-foreground">{apiKeys.filter((k: any) => !k.is_active).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> API Documentatie</CardTitle>
          <CardDescription>Gebruik je API key als Bearer token in de Authorization header</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-auto">
{`curl -X GET https://api.logiflow.nl/v1/orders \\
  -H "Authorization: Bearer lf_jouw_api_key" \\
  -H "Content-Type: application/json"`}
          </pre>
        </CardContent>
      </Card>

      {/* Keys list */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laden...</p>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Geen API keys</p>
            <p className="text-sm text-muted-foreground">Maak je eerste API key aan voor externe integraties</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key: any) => (
            <Card key={key.id} variant="interactive">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}••••••••</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {key.last_used_at
                        ? `Laatst: ${format(new Date(key.last_used_at), "d MMM HH:mm", { locale: nl })}`
                        : "Nooit gebruikt"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={key.is_active ? "default" : "secondary"}>
                    {key.is_active ? "Actief" : "Inactief"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: key.id, active: !key.is_active })}
                  >
                    {key.is_active ? "Deactiveer" : "Activeer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Key, Plus, Copy, Eye, EyeOff, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const APIKeys = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys", user?.id],
    queryFn: async () => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) return [];

      const { data } = await supabase
        .from("api_keys")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      return data ?? [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: companyId } = await supabase.rpc("get_user_company_cached", { p_user_id: user!.id });
      if (!companyId) throw new Error("No company");

      const rawKey = `lf_${crypto.randomUUID().replace(/-/g, "")}`;
      const prefix = rawKey.slice(0, 7);
      // Simple hash for storage (in production use proper hashing)
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey));
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const { error } = await supabase.from("api_keys").insert({
        company_id: companyId,
        name,
        key_hash: hashHex,
        key_prefix: prefix,
        scopes: ["read", "write"],
        created_by: user!.id,
      });
      if (error) throw error;

      navigator.clipboard.writeText(rawKey);
      return rawKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API Key aangemaakt ✓", description: "Key is gekopieerd naar klembord. Bewaar deze veilig!" });
      setNewKeyName("");
    },
    onError: () => {
      toast({ title: "Fout", description: "Kon API key niet aanmaken.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "API Key gedeactiveerd ✓" });
    },
  });

  return (
    <DashboardLayout title="API Keys">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <CardDescription>Beheer API keys voor externe integraties</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {keys.map((k: any) => (
                <div key={k.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{k.name}</p>
                      <Badge variant={k.is_active ? "default" : "secondary"}>{k.is_active ? "Actief" : "Inactief"}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-muted-foreground font-mono">
                        {showKeys[k.id] ? `${k.key_prefix}${"•".repeat(25)}` : `${k.key_prefix}${"•".repeat(25)}`}
                      </p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowKeys(prev => ({ ...prev, [k.id]: !prev[k.id] }))}>
                        {showKeys[k.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        navigator.clipboard.writeText(k.key_prefix + "...");
                        toast({ title: "Key prefix gekopieerd" });
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aangemaakt: {format(new Date(k.created_at), "d MMM yyyy", { locale: nl })}
                      {k.last_used_at && ` • Laatst gebruikt: ${format(new Date(k.last_used_at), "d MMM yyyy HH:mm", { locale: nl })}`}
                    </p>
                  </div>
                  {k.is_active && (
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(k.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Key naam (bijv. 'ERP Integratie')"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => createMutation.mutate(newKeyName)} disabled={!newKeyName.trim() || createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Nieuwe Key
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default APIKeys;

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Store, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function EcommerceHub() {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [platform, setPlatform] = useState("shopify");
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const tenantId = company?.id;

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["ecommerce-connections", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecommerce_connections")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ecommerce_connections").insert({
        tenant_id: tenantId!,
        platform,
        store_name: storeName,
        store_url: storeUrl,
        sync_status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ecommerce-connections"] });
      toast({ title: "Webshop verbinding aangemaakt" });
      setDialogOpen(false);
      setStoreName(""); setStoreUrl("");
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("ecommerce_connections").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ecommerce-connections"] }),
  });

  const platforms = [
    { id: "shopify", name: "Shopify", icon: "🛍️" },
    { id: "woocommerce", name: "WooCommerce", icon: "🔧" },
    { id: "magento", name: "Magento", icon: "🧱" },
    { id: "prestashop", name: "PrestaShop", icon: "🏪" },
    { id: "custom", name: "Custom API", icon: "⚙️" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-commerce Hub"
        description="Verbind je webshops voor automatische ordersynchronisatie"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Webshop toevoegen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Webshop verbinden</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {platforms.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Winkelnaam</Label>
                  <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Mijn Webshop" />
                </div>
                <div>
                  <Label>Shop URL</Label>
                  <Input value={storeUrl} onChange={e => setStoreUrl(e.target.value)} placeholder="https://mijnshop.nl" />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!storeName || !storeUrl || createMutation.isPending} className="w-full">
                  Verbinden
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
            <p className="text-xs text-muted-foreground">Verbindingen</p>
            <p className="text-2xl font-bold">{connections.length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actief</p>
            <p className="text-2xl font-bold text-emerald-500">{connections.filter((c: any) => c.is_active).length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fouten</p>
            <p className="text-2xl font-bold text-destructive">{connections.filter((c: any) => c.sync_error).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Connection list */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laden...</p>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Geen webshops verbonden</p>
            <p className="text-sm text-muted-foreground">Verbind je eerste webshop om orders automatisch te importeren</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map((conn: any) => (
            <Card key={conn.id} variant="interactive">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{conn.store_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{conn.platform} • {conn.store_url}</p>
                    {conn.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        Laatst: {format(new Date(conn.last_sync_at), "d MMM HH:mm", { locale: nl })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {conn.sync_error && <Badge variant="destructive">Fout</Badge>}
                  <Switch
                    checked={conn.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: conn.id, active: v })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

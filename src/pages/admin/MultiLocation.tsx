import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, MapPin } from "lucide-react";

export default function MultiLocation() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("NL");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const tenantId = profile?.company_id;

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["multi-locations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_locations")
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
      const { error } = await supabase.from("company_locations").insert({
        tenant_id: tenantId!,
        name,
        address,
        city,
        postal_code: postalCode,
        country,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multi-locations"] });
      toast({ title: "Vestiging aangemaakt" });
      setDialogOpen(false);
      setName(""); setAddress(""); setCity(""); setPostalCode(""); setContactName(""); setContactPhone("");
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-vestiging"
        description="Beheer je bedrijfsvestigingen en locaties"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Vestiging toevoegen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nieuwe vestiging</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Naam</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Hoofdkantoor Amsterdam" /></div>
                <div><Label>Adres</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Straat 123" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Postcode</Label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="1234 AB" /></div>
                  <div><Label>Plaats</Label><Input value={city} onChange={e => setCity(e.target.value)} placeholder="Amsterdam" /></div>
                </div>
                <div><Label>Land</Label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Contactpersoon</Label><Input value={contactName} onChange={e => setContactName(e.target.value)} /></div>
                  <div><Label>Telefoon</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} /></div>
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!name || !address || !city || createMutation.isPending} className="w-full">
                  Opslaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Totaal vestigingen</p>
            <p className="text-2xl font-bold">{locations.length}</p>
          </CardContent>
        </Card>
        <Card variant="stat">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actief</p>
            <p className="text-2xl font-bold text-emerald-500">{locations.filter((l: any) => l.is_active).length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laden...</p>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Nog geen vestigingen</p>
            <p className="text-sm text-muted-foreground">Voeg je eerste vestiging toe</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {locations.map((loc: any) => (
            <Card key={loc.id} variant="interactive">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loc.address}, {loc.postal_code} {loc.city}</p>
                    {loc.contact_name && <p className="text-xs text-muted-foreground">{loc.contact_name} {loc.contact_phone ? `• ${loc.contact_phone}` : ""}</p>}
                  </div>
                </div>
                <Badge variant={loc.is_active ? "default" : "secondary"}>
                  {loc.is_active ? "Actief" : "Inactief"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

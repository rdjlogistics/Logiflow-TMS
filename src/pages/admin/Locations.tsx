import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/useConfirm";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Building2, Plus, MapPin, Pencil, Trash2, Crown, Loader2,
} from "lucide-react";

interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  branch_code: string | null;
  address: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  is_headquarters: boolean;
  is_active: boolean;
  notes: string | null;
}

const emptyBranch = {
  name: "", branch_code: "", address: "", house_number: "", postal_code: "",
  city: "", country: "NL", phone: "", email: "", contact_person: "",
  is_headquarters: false, is_active: true, notes: "",
};

const Locations = () => {
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyBranch);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["company-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_branches" as any)
        .select("*")
        .order("is_headquarters", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as Branch[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const { data: uc } = await supabase.rpc("get_user_company_cached", { p_user_id: (await supabase.auth.getUser()).data.user?.id });
      const payload = { ...values, tenant_id: uc };
      if (editId) {
        const { error } = await supabase.from("company_branches" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_branches" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editId ? "Vestiging bijgewerkt" : "Vestiging aangemaakt" });
      qc.invalidateQueries({ queryKey: ["company-branches"] });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyBranch);
    },
    onError: (e: any) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_branches" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vestiging verwijderd" });
      qc.invalidateQueries({ queryKey: ["company-branches"] });
    },
  });

  const openEdit = (b: Branch) => {
    setEditId(b.id);
    setForm({
      name: b.name, branch_code: b.branch_code || "", address: b.address || "",
      house_number: b.house_number || "", postal_code: b.postal_code || "",
      city: b.city || "", country: b.country || "NL", phone: b.phone || "",
      email: b.email || "", contact_person: b.contact_person || "",
      is_headquarters: b.is_headquarters, is_active: b.is_active, notes: b.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (b: Branch) => {
    const ok = await confirm({ title: "Vestiging verwijderen?", description: `Weet je zeker dat je "${b.name}" wilt verwijderen?`, destructive: true });
    if (ok) deleteMutation.mutate(b.id);
  };

  return (
    <DashboardLayout title="Vestigingen">
      <FeatureGate feature="multi_vestiging">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Vestigingen
              </CardTitle>
              <Button onClick={() => { setEditId(null); setForm(emptyBranch); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nieuwe Vestiging
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : branches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>Nog geen vestigingen aangemaakt</p>
                  <p className="text-sm">Voeg je eerste vestiging toe om te beginnen</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead className="hidden sm:table-cell">Code</TableHead>
                        <TableHead className="hidden md:table-cell">Locatie</TableHead>
                        <TableHead className="hidden md:table-cell">Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {b.name}
                              {b.is_headquarters && <Crown className="h-4 w-4 text-amber-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{b.branch_code || "-"}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {b.city ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.city}</span> : "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{b.contact_person || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Actief" : "Inactief"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(b)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Vestiging Bewerken" : "Nieuwe Vestiging"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Naam *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Vestigingscode</Label><Input value={form.branch_code} onChange={e => setForm(f => ({ ...f, branch_code: e.target.value }))} placeholder="bijv. AMS01" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Label>Adres</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div><Label>Nr.</Label><Input value={form.house_number} onChange={e => setForm(f => ({ ...f, house_number: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Postcode</Label><Input value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} /></div>
                <div><Label>Stad</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div><Label>Land</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefoon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              </div>
              <div><Label>Contactpersoon</Label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
              <div><Label>Opmerkingen</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_headquarters} onCheckedChange={v => setForm(f => ({ ...f, is_headquarters: v }))} />
                  <Label>Hoofdkantoor</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                  <Label>Actief</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editId ? "Opslaan" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </FeatureGate>
    </DashboardLayout>
  );
};

export default Locations;

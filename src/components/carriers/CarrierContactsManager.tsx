import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Mail, Phone, CheckCircle2, Users, Loader2 } from 'lucide-react';

interface CarrierContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean | null;
  notes: string | null;
}

interface Props {
  carrierId: string;
  tenantId: string;
  contacts: CarrierContact[];
  onContactsChange: () => void;
}

const emptyForm = { name: '', role: '', email: '', phone: '', is_primary: false, notes: '' };

export function CarrierContactsManager({ carrierId, tenantId, contacts, onContactsChange }: Props) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: CarrierContact) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      role: c.role || '',
      email: c.email || '',
      phone: c.phone || '',
      is_primary: c.is_primary || false,
      notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Naam is verplicht', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      carrier_id: carrierId,
      tenant_id: tenantId,
      name: form.name.trim(),
      role: form.role.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from('carrier_contacts').update(payload).eq('id', editingId)
      : await supabase.from('carrier_contacts').insert(payload);

    if (error) {
      toast({ title: 'Fout bij opslaan', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Contact bijgewerkt' : 'Contact toegevoegd' });
      setDialogOpen(false);
      onContactsChange();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('carrier_contacts').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Fout bij verwijderen', variant: 'destructive' });
    } else {
      toast({ title: 'Contact verwijderd' });
      onContactsChange();
    }
    setDeleting(false);
    setDeleteOpen(false);
    setDeleteId(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" /> Contactpersonen ({contacts.length})
        </CardTitle>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" /> Toevoegen
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Geen contactpersonen. Klik op Toevoegen om er een aan te maken.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Functie</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefoon</TableHead>
                <TableHead className="w-20">Primair</TableHead>
                <TableHead className="w-24">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.role || '—'}</TableCell>
                  <TableCell>
                    {c.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {c.email}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {c.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {c.phone}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {c.is_primary && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(c.id); setDeleteOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Contact bewerken' : 'Contact toevoegen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Naam *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Volledige naam" />
            </div>
            <div className="space-y-1.5">
              <Label>Functie</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Bijv. Planner, Chauffeur" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@voorbeeld.nl" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefoon</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+31 6 12345678" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notities</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionele notities" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_primary} onCheckedChange={v => setForm(f => ({ ...f, is_primary: !!v }))} id="is_primary" />
              <Label htmlFor="is_primary" className="cursor-pointer">Primair contactpersoon</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Contact verwijderen"
        description="Weet je zeker dat je dit contactpersoon wilt verwijderen?"
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </Card>
  );
}

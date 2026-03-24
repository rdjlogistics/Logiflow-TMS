import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Building2, User, Phone, Mail, FileText, Star, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePostcodeLookup, formatDutchPostcode } from '@/hooks/usePostcodeLookup';
import type { CustomerLocation, CreateLocationInput } from '@/hooks/useCustomerLocations';

interface AddressBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateLocationInput) => Promise<any>;
  onUpdate?: (id: string, data: Partial<CreateLocationInput>) => Promise<boolean>;
  editingLocation?: CustomerLocation | null;
  customerId: string;
  tenantId: string;
}

export const AddressBookDialog = ({
  open,
  onOpenChange,
  onSave,
  onUpdate,
  editingLocation,
  customerId,
  tenantId,
}: AddressBookDialogProps) => {
  const { lookupPostcode, loading: lookupLoading } = usePostcodeLookup();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: '',
    company_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    postcode: '',
    house_number: '',
    address_line: '',
    city: '',
    country: 'NL',
    access_notes: '',
    default_instructions: '',
    is_favorite: false,
  });

  useEffect(() => {
    if (editingLocation) {
      setForm({
        label: editingLocation.label || '',
        company_name: editingLocation.company_name || '',
        contact_name: editingLocation.contact_name || '',
        contact_phone: editingLocation.contact_phone || '',
        contact_email: editingLocation.contact_email || '',
        postcode: editingLocation.postcode || '',
        house_number: editingLocation.house_number || '',
        address_line: editingLocation.address_line || '',
        city: editingLocation.city || '',
        country: editingLocation.country || 'NL',
        access_notes: editingLocation.access_notes || '',
        default_instructions: editingLocation.default_instructions || '',
        is_favorite: editingLocation.is_favorite || false,
      });
    } else {
      setForm({
        label: '', company_name: '', contact_name: '', contact_phone: '', contact_email: '',
        postcode: '', house_number: '', address_line: '', city: '', country: 'NL',
        access_notes: '', default_instructions: '', is_favorite: false,
      });
    }
  }, [editingLocation, open]);

  const handlePostcodeLookup = async () => {
    if (form.postcode.replace(/\s/g, '').length >= 6) {
      const result = await lookupPostcode(form.postcode, form.house_number || undefined);
      if (result) {
        setForm(prev => ({
          ...prev,
          address_line: result.street,
          city: result.city,
          postcode: formatDutchPostcode(prev.postcode),
        }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.label || !form.postcode || !form.city) return;
    setSaving(true);
    try {
      if (editingLocation && onUpdate) {
        await onUpdate(editingLocation.id, form);
      } else {
        await onSave({
          ...form,
          customer_id: customerId,
          tenant_id: tenantId,
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/30 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <MapPin className="h-5 w-5 text-primary" />
            {editingLocation ? 'Adres Bewerken' : 'Nieuw Adres'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Label & Favorite */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Label *</Label>
              <Input placeholder="Bijv. Hoofdkantoor" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="h-9 text-base" />
            </div>
            <label className="flex items-center gap-2 pb-1 cursor-pointer">
              <Star className={`h-4 w-4 ${form.is_favorite ? 'text-gold fill-gold' : 'text-muted-foreground'}`} />
              <Switch checked={form.is_favorite} onCheckedChange={v => setForm(p => ({ ...p, is_favorite: v }))} />
            </label>
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Building2 className="h-3 w-3" /> Bedrijfsnaam</Label>
            <Input placeholder="Bedrijf B.V." value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className="h-9 text-base" />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><User className="h-3 w-3" /> Contactpersoon</Label>
              <Input placeholder="Jan Jansen" value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} className="h-9 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Phone className="h-3 w-3" /> Telefoon</Label>
              <Input placeholder="+31 6 12345678" value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} className="h-9 text-base" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</Label>
            <Input placeholder="email@bedrijf.nl" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className="h-9 text-base" />
          </div>

          {/* Address */}
          <div className="space-y-3">
            <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Adres *</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 relative">
                <Input placeholder="1234 AB" value={form.postcode} onChange={e => setForm(p => ({ ...p, postcode: e.target.value }))} onBlur={handlePostcodeLookup} className="h-9 pr-8 text-base" />
                {lookupLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <Input placeholder="Nr." value={form.house_number} onChange={e => setForm(p => ({ ...p, house_number: e.target.value }))} onBlur={handlePostcodeLookup} className="h-9 text-base" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Straatnaam" value={form.address_line} onChange={e => setForm(p => ({ ...p, address_line: e.target.value }))} className="h-9 text-base" />
              <Input placeholder="Stad" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="h-9 text-base" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><FileText className="h-3 w-3" /> Toegangsinstructies</Label>
            <Textarea placeholder="Bijv. achterom via de poort, bel bij magazijn..." value={form.access_notes} onChange={e => setForm(p => ({ ...p, access_notes: e.target.value }))} className="min-h-[60px] resize-none" />
          </div>

          <Button onClick={handleSubmit} disabled={saving || !form.label || !form.postcode || !form.city} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {editingLocation ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

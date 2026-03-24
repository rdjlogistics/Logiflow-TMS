import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Search, Building2, Loader2, CheckCircle2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { cn } from "@/lib/utils";
import { validateNLPostcode, validateNLTelefoon } from "@/lib/nl-validators";

interface Address {
  id: string;
  label: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  street: string;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[] | null;
  notes: string | null;
  is_active: boolean;
}

const emptyAddress: Omit<Address, 'id'> = {
  label: '',
  company_name: null,
  contact_name: null,
  phone: null,
  street: '',
  house_number: null,
  postal_code: null,
  city: null,
  country: 'Nederland',
  latitude: null,
  longitude: null,
  tags: null,
  notes: null,
  is_active: true,
};

const AddressBook = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Omit<Address, 'id'>>(emptyAddress);
  const [tagsInput, setTagsInput] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { lookupPostcode, loading: postcodeLoading } = usePostcodeLookup();
  const [autoFilled, setAutoFilled] = useState(false);
  const [lastLookup, setLastLookup] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const validateAddressField = (field: string, value: string) => {
    let error: string | undefined;
    if (field === "phone") error = validateNLTelefoon(value);
    if (field === "postal_code") error = validateNLPostcode(value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateAddressForm = () => {
    const errors: Record<string, string | undefined> = {
      phone: validateNLTelefoon(formData.phone || ""),
      postal_code: validateNLPostcode(formData.postal_code || ""),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  // Dutch postcode auto-complete
  const handlePostcodeLookup = useCallback(async () => {
    const cleaned = (formData.postal_code || '').replace(/\s/g, '').toUpperCase();
    
    if (
      (formData.country === 'Nederland' || formData.country === 'NL') &&
      cleaned.length === 6 && 
      /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned)
    ) {
      const lookupKey = `${cleaned}-${formData.house_number}`;
      
      if (lookupKey !== lastLookup) {
        setLastLookup(lookupKey);
        const result = await lookupPostcode(cleaned, formData.house_number || undefined);
        
        if (result) {
          const updates: Partial<typeof formData> = {};
          if (result.street && !formData.street) {
            updates.street = result.street;
          }
          if (result.city && !formData.city) {
            updates.city = result.city;
          }
          if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
            setAutoFilled(true);
            setTimeout(() => setAutoFilled(false), 3000);
          }
        }
      }
    }
  }, [formData, lastLookup, lookupPostcode]);

  const handlePostcodeBlur = () => {
    const formatted = formatDutchPostcode(formData.postal_code || '');
    if (formatted !== formData.postal_code) {
      setFormData(prev => ({ ...prev, postal_code: formatted }));
    }
    handlePostcodeLookup();
  };

  const handleHouseNumberBlur = () => {
    if (formData.house_number && (formData.postal_code || '').replace(/\s/g, '').length === 6) {
      handlePostcodeLookup();
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('address_book')
      .select('*')
      .order('label', { ascending: true });
    
    if (error) {
      toast({ title: "Fout bij ophalen adressen", variant: "destructive" });
    } else {
      setAddresses(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAddressForm()) {
      toast({ title: "Controleer de gemarkeerde velden", variant: "destructive" });
      return;
    }

    const dataToSave = {
      ...formData,
      tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : null,
    };
    
    if (editingAddress) {
      const { error } = await supabase
        .from('address_book')
        .update(dataToSave)
        .eq('id', editingAddress.id);
      
      if (error) {
        toast({ title: "Fout bij bijwerken adres", variant: "destructive" });
      } else {
        toast({ title: "Adres bijgewerkt" });
        fetchAddresses();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('address_book')
        .insert([dataToSave]);
      
      if (error) {
        toast({ title: "Fout bij aanmaken adres", variant: "destructive" });
      } else {
        toast({ title: "Adres aangemaakt" });
        fetchAddresses();
        setDialogOpen(false);
      }
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFieldErrors({});
    setFormData({
      label: address.label,
      company_name: address.company_name,
      contact_name: address.contact_name,
      phone: address.phone,
      street: address.street,
      house_number: address.house_number,
      postal_code: address.postal_code,
      city: address.city,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      tags: address.tags,
      notes: address.notes,
      is_active: address.is_active,
    });
    setTagsInput(address.tags?.join(', ') || '');
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setAddressToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('address_book').delete().eq('id', addressToDelete);
    if (error) {
      toast({ title: "Fout bij verwijderen adres", variant: "destructive" });
    } else {
      toast({ title: "Adres verwijderd" });
      fetchAddresses();
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
    setAddressToDelete(null);
  };

  const openNewDialog = () => {
    setEditingAddress(null);
    setFormData(emptyAddress);
    setFieldErrors({});
    setTagsInput('');
    setDialogOpen(true);
  };

  const filteredAddresses = addresses.filter(a =>
    a.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.street.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Adresboek" description="Beheer veelgebruikte adressen en locaties">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuw adres
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAddress ? 'Adres bewerken' : 'Nieuw adres'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="label">Label / Naam *</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="bijv. Hoofdkantoor Rotterdam"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Bedrijfsnaam</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name || ''}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contactpersoon</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (fieldErrors.phone) validateAddressField("phone", e.target.value);
                      }}
                      onBlur={(e) => validateAddressField("phone", e.target.value)}
                      className={fieldErrors.phone ? "border-destructive" : ""}
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Land</Label>
                    <Input
                      id="country"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code" className="flex items-center gap-1.5">
                      Postcode
                      {formData.country === 'Nederland' && (
                        <span className="text-[10px] text-primary/70 font-normal">(auto)</span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="postal_code"
                        value={formData.postal_code || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setFormData({ ...formData, postal_code: val });
                          if (fieldErrors.postal_code) validateAddressField("postal_code", val);
                        }}
                        onBlur={(e) => {
                          validateAddressField("postal_code", e.target.value);
                          handlePostcodeBlur();
                        }}
                        placeholder="1234 AB"
                        maxLength={7}
                        className={fieldErrors.postal_code ? "border-destructive" : ""}
                      />
                      {postcodeLoading && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {autoFilled && !postcodeLoading && !fieldErrors.postal_code && (
                        <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                      )}
                    </div>
                    {fieldErrors.postal_code && (
                      <p className="text-xs text-destructive">{fieldErrors.postal_code}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="house_number">Huisnummer</Label>
                    <Input
                      id="house_number"
                      value={formData.house_number || ''}
                      onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                      onBlur={handleHouseNumberBlur}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Straat *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      required
                      className={cn(autoFilled && "border-success/50 bg-success/5")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Plaats</Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={cn(autoFilled && "border-success/50 bg-success/5")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (komma-gescheiden)</Label>
                    <Input
                      id="tags"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="dock, centrum, restricted"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notities</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Leveringsinstructies, openingstijden, etc."
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Actief</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit">
                    {editingAddress ? 'Bijwerken' : 'Aanmaken'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek adressen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Adressen ({filteredAddresses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : filteredAddresses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Geen adressen gevonden' : 'Nog geen adressen. Voeg je eerste adres toe.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Bedrijf</TableHead>
                    <TableHead>Adres</TableHead>
                    <TableHead>Postcode</TableHead>
                    <TableHead>Plaats</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAddresses.map((address) => (
                    <TableRow key={address.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {address.label}
                        </div>
                      </TableCell>
                      <TableCell>{address.company_name || '-'}</TableCell>
                      <TableCell>
                        {address.street} {address.house_number}
                      </TableCell>
                      <TableCell>{address.postal_code || '-'}</TableCell>
                      <TableCell>{address.city || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {address.tags?.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          address.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {address.is_active ? 'Actief' : 'Inactief'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(address)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(address.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Adres verwijderen"
          description="Weet je zeker dat je dit adres wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
          onConfirm={handleDeleteConfirm}
          isLoading={deleting}
        />
      </div>
    </DashboardLayout>
  );
};

export default AddressBook;

import { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Star, Building2, Phone, Trash2, Edit2, Loader2 } from 'lucide-react';
import B2BLayout from '@/components/portal/b2b/B2BLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { useCustomerLocations, type CustomerLocation } from '@/hooks/useCustomerLocations';
import { AddressBookDialog } from '@/components/portal/b2b/AddressBookDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const B2BAddressBook = () => {
  const { customerId, customer } = usePortalAuth();
  const { locations, loading, fetchLocations, createLocation, updateLocation, deleteLocation, toggleFavorite } = useCustomerLocations(customerId || undefined);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CustomerLocation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string>('');

  useEffect(() => {
    if (customerId) {
      fetchLocations();
      // Get tenant_id from customer
      supabase.from('customers').select('tenant_id').eq('id', customerId).single().then(({ data }) => {
        if (data?.tenant_id) setTenantId(data.tenant_id);
      });
    }
  }, [customerId, fetchLocations]);

  const filtered = locations.filter(loc => {
    const q = search.toLowerCase();
    return (
      loc.label.toLowerCase().includes(q) ||
      (loc.company_name || '').toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      loc.postcode.toLowerCase().includes(q) ||
      loc.address_line.toLowerCase().includes(q)
    );
  });

  const favorites = filtered.filter(l => l.is_favorite);
  const others = filtered.filter(l => !l.is_favorite);

  const handleEdit = (loc: CustomerLocation) => {
    setEditingLocation(loc);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteLocation(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <B2BLayout companyName={customer?.companyName || 'Klantenportaal'}>
      <div className="max-w-4xl mx-auto pb-24 sm:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Adresboek
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Beheer je vaste adressen voor sneller boeken
            </p>
          </div>
          <Button onClick={handleAdd} className="touch-manipulation active:scale-[0.97]">
            <Plus className="h-4 w-4 mr-2" />
            Nieuw Adres
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, bedrijf, stad of postcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card/80 backdrop-blur-sm border-border/50"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!loading && locations.length === 0 && (
          <div
            className="text-center py-16 rounded-xl border border-dashed border-border/50 bg-card/40 backdrop-blur-sm"
          >
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold mb-1">Nog geen adressen</h3>
            <p className="text-sm text-muted-foreground mb-4">Voeg je eerste adres toe om sneller te boeken</p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Eerste Adres Toevoegen
            </Button>
          </div>
        )}

        {/* Address Cards */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-6">
            {/* Favorites */}
            {favorites.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gold mb-3 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-gold" />
                  Favorieten ({favorites.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {favorites.map((loc, i) => (
                      <AddressCard
                        key={loc.id}
                        location={loc}
                        index={i}
                        onEdit={() => handleEdit(loc)}
                        onDelete={() => setDeleteId(loc.id)}
                        onToggleFavorite={() => toggleFavorite(loc.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Others */}
            {others.length > 0 && (
              <div>
                {favorites.length > 0 && (
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Overige adressen ({others.length})
                  </h2>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                    {others.map((loc, i) => (
                      <AddressCard
                        key={loc.id}
                        location={loc}
                        index={i}
                        onEdit={() => handleEdit(loc)}
                        onDelete={() => setDeleteId(loc.id)}
                        onToggleFavorite={() => toggleFavorite(loc.id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No search results */}
        {!loading && filtered.length === 0 && locations.length > 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Geen adressen gevonden voor "{search}"
          </div>
        )}

        {/* Dialog */}
        <AddressBookDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={createLocation}
          onUpdate={updateLocation}
          editingLocation={editingLocation}
          customerId={customerId || ''}
          tenantId={tenantId}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-card/95 backdrop-blur-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Adres verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Dit adres wordt permanent verwijderd uit je adresboek.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </B2BLayout>
  );
};

// Address Card Sub-component
const AddressCard = ({
  location,
  index,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  location: CustomerLocation;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) => (
  <div
    layout
    className="group rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 hover:border-border transition-all"
  >
    <div className="flex items-start justify-between mb-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold truncate">{location.label}</h3>
          <button onClick={onToggleFavorite} className="touch-manipulation">
            <Star className={cn("h-3.5 w-3.5 transition-colors", location.is_favorite ? "text-gold fill-gold" : "text-muted-foreground/30 hover:text-gold")} />
          </button>
        </div>
        {location.company_name && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="h-3 w-3" /> {location.company_name}
          </p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <p className="text-xs text-muted-foreground">
      {location.address_line} {location.house_number}
    </p>
    <p className="text-xs text-muted-foreground">
      {location.postcode} {location.city}
    </p>

    {location.contact_name && (
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
        <Phone className="h-3 w-3" /> {location.contact_name} {location.contact_phone && `· ${location.contact_phone}`}
      </p>
    )}
  </div>
);

export default B2BAddressBook;

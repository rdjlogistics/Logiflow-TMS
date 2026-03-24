import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Plus, 
  Star, 
  StarOff, 
  Pencil, 
  Trash2, 
  Search,
  Building2,
  Phone,
  Loader2
} from "lucide-react";
import { useCustomerLocations, CustomerLocation } from "@/hooks/useCustomerLocations";
import { LocationFormDialog } from "./LocationFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LocationsListProps {
  customerId: string;
  tenantId: string;
  onSelect?: (location: CustomerLocation) => void;
  selectable?: boolean;
}

export const LocationsList = ({ 
  customerId, 
  tenantId, 
  onSelect,
  selectable = false 
}: LocationsListProps) => {
  const {
    locations,
    loading,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleFavorite,
  } = useCustomerLocations(customerId);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<CustomerLocation | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const filteredLocations = locations.filter(loc =>
    loc.label.toLowerCase().includes(search.toLowerCase()) ||
    loc.city.toLowerCase().includes(search.toLowerCase()) ||
    loc.address_line.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (location: CustomerLocation) => {
    setEditLocation(location);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteLocation(deleteId);
      setDeleteId(null);
    }
  };

  const handleAddNew = () => {
    setEditLocation(undefined);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek locatie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleAddNew} className="btn-premium">
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe locatie
        </Button>
      </div>

      {/* Empty state */}
      {filteredLocations.length === 0 && (
        <Card className="premium-card border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Geen locaties gevonden</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? "Pas je zoekopdracht aan" : "Voeg je eerste locatie toe voor sneller boeken"}
            </p>
            {!search && (
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Locatie toevoegen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Locations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLocations.map((location) => (
          <Card 
            key={location.id} 
            className={`premium-card transition-all ${selectable ? "cursor-pointer hover:ring-2 hover:ring-primary/50" : ""}`}
            onClick={selectable ? () => onSelect?.(location) : undefined}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{location.label}</CardTitle>
                  {location.is_favorite && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                {!selectable && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(location.id);
                      }}
                    >
                      {location.is_favorite ? (
                        <StarOff className="h-4 w-4" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(location);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(location.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p>{location.address_line} {location.house_number}</p>
                  <p className="text-muted-foreground">{location.postcode} {location.city}</p>
                </div>
              </div>
              
              {location.company_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{location.company_name}</span>
                </div>
              )}
              
              {location.contact_phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{location.contact_phone}</span>
                </div>
              )}

              {location.access_notes && (
                <Badge variant="secondary" className="text-xs">
                  {location.access_notes.slice(0, 30)}...
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form dialog */}
      <LocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        location={editLocation}
        onSave={createLocation}
        onUpdate={updateLocation}
        tenantId={tenantId}
        customerId={customerId}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Locatie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

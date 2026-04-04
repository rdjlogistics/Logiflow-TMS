import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Warehouse,
  Plus,
  MapPin,
  Phone,
  Mail,
  Settings,
  Grid,
  Layers,
  Edit,
  Trash2,
} from "lucide-react";
import { useWarehouses, useCreateWarehouse, useWarehouseZones, useStorageLocations } from "@/hooks/useWMS";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { WMSGlassCard, WMSCardTitle, WMSStatCard } from "@/components/wms";
import { useCompany } from "@/hooks/useCompany";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";

export default function WMSWarehouses() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [newWarehouse, setNewWarehouse] = useState({
    code: "",
    name: "",
    address: "",
    city: "",
    postal_code: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
  });

  const [newZone, setNewZone] = useState({
    code: "",
    name: "",
    zone_type: "storage",
  });

  const [newLocation, setNewLocation] = useState({
    code: "",
    location_type: "shelf",
    zone_id: "",
    is_pickable: true,
  });

  const { data: warehouses, isLoading } = useWarehouses();
  const { data: zones } = useWarehouseZones(selectedWarehouse || undefined);
  const { data: locations } = useStorageLocations(selectedWarehouse || undefined);
  const createWarehouse = useCreateWarehouse();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  const selectedWarehouseData = warehouses?.find((w) => w.id === selectedWarehouse);

  const resetWarehouseForm = () => {
    setNewWarehouse({
      code: "",
      name: "",
      address: "",
      city: "",
      postal_code: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
    });
    setEditingWarehouse(null);
  };

  const handleCreateWarehouse = () => {
    createWarehouse.mutate(newWarehouse, {
      onSuccess: () => {
        setIsDialogOpen(false);
        resetWarehouseForm();
      },
    });
  };

  const handleUpdateWarehouse = async () => {
    if (!editingWarehouse) return;
    
    try {
      const { error } = await supabase
        .from("warehouses")
        .update(newWarehouse)
        .eq("id", editingWarehouse.id);

      if (error) throw error;

      toast({ title: "Magazijn bijgewerkt" });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      setIsDialogOpen(false);
      resetWarehouseForm();
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const handleEditWarehouse = (wh: any) => {
    setEditingWarehouse(wh);
    setNewWarehouse({
      code: wh.code || "",
      name: wh.name || "",
      address: wh.address || "",
      city: wh.city || "",
      postal_code: wh.postal_code || "",
      contact_name: wh.contact_name || "",
      contact_phone: wh.contact_phone || "",
      contact_email: wh.contact_email || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteWarehouseClick = (id: string) => {
    setWarehouseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteWarehouseConfirm = async () => {
    if (!warehouseToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("warehouses")
        .update({ is_active: false })
        .eq("id", warehouseToDelete);

      if (error) throw error;

      toast({ title: "Magazijn verwijderd" });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      if (selectedWarehouse === warehouseToDelete) setSelectedWarehouse(null);
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    }
  };

  const handleCreateZone = async () => {
    if (!selectedWarehouse || !company?.id) return;
    
    try {
      const { error } = await supabase
        .from("warehouse_zones")
        .insert({
          ...newZone,
          warehouse_id: selectedWarehouse,
          tenant_id: company.id,
        });

      if (error) throw error;

      toast({ title: "Zone aangemaakt" });
      queryClient.invalidateQueries({ queryKey: ["warehouse-zones"] });
      setIsZoneDialogOpen(false);
      setNewZone({ code: "", name: "", zone_type: "storage" });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateLocation = async () => {
    if (!selectedWarehouse || !company?.id) return;
    
    try {
      const { error } = await supabase
        .from("storage_locations")
        .insert({
          ...newLocation,
          warehouse_id: selectedWarehouse,
          tenant_id: company.id,
          zone_id: newLocation.zone_id || null,
        });

      if (error) throw error;

      toast({ title: "Locatie aangemaakt" });
      queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      setIsLocationDialogOpen(false);
      setNewLocation({ code: "", location_type: "shelf", zone_id: "", is_pickable: true });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Magazijnen">
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <p className="text-muted-foreground">
            Beheer magazijnen, zones en opslaglocaties
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetWarehouseForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuw Magazijn
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? "Magazijn Bewerken" : "Nieuw Magazijn"}</DialogTitle>
              <DialogDescription>
                {editingWarehouse ? "Wijzig de magazijngegevens" : "Voeg een nieuw magazijn toe aan uw WMS"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    placeholder="WH01"
                    value={newWarehouse.code}
                    onChange={(e) =>
                      setNewWarehouse({ ...newWarehouse, code: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Naam *</Label>
                  <Input
                    id="name"
                    placeholder="Hoofdmagazijn Amsterdam"
                    value={newWarehouse.name}
                    onChange={(e) =>
                      setNewWarehouse({ ...newWarehouse, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  placeholder="Industrieweg 123"
                  value={newWarehouse.address}
                  onChange={(e) =>
                    setNewWarehouse({ ...newWarehouse, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postcode</Label>
                  <Input
                    id="postal_code"
                    placeholder="1234 AB"
                    value={newWarehouse.postal_code}
                    onChange={(e) =>
                      setNewWarehouse({ ...newWarehouse, postal_code: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Plaats</Label>
                  <Input
                    id="city"
                    placeholder="Amsterdam"
                    value={newWarehouse.city}
                    onChange={(e) =>
                      setNewWarehouse({ ...newWarehouse, city: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contactpersoon</Label>
                <Input
                  id="contact_name"
                  placeholder="Jan Janssen"
                  value={newWarehouse.contact_name}
                  onChange={(e) =>
                    setNewWarehouse({ ...newWarehouse, contact_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefoon</Label>
                  <Input
                    id="contact_phone"
                    placeholder="+31 6 12345678"
                    value={newWarehouse.contact_phone}
                    onChange={(e) =>
                      setNewWarehouse({ ...newWarehouse, contact_phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">E-mail</Label>
                  <Input
                    id="contact_email"
                    placeholder="magazijn@bedrijf.nl"
                    value={newWarehouse.contact_email}
                    onChange={(e) =>
                      setNewWarehouse({ ...newWarehouse, contact_email: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false);
                resetWarehouseForm();
              }}>
                Annuleren
              </Button>
              <Button 
                onClick={editingWarehouse ? handleUpdateWarehouse : handleCreateWarehouse} 
                disabled={createWarehouse.isPending || !newWarehouse.code || !newWarehouse.name}
              >
                {createWarehouse.isPending ? "Bezig..." : editingWarehouse ? "Opslaan" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <WMSStatCard
          title="Magazijnen"
          value={warehouses?.length || 0}
          icon={<Warehouse className="h-full w-full" />}
          variant="primary"
        />
        <WMSStatCard
          title="Actief"
          value={warehouses?.filter(w => w.is_active).length || 0}
          icon={<Warehouse className="h-full w-full" />}
          variant="success"
        />
        <WMSStatCard
          title="Zones"
          value={zones?.length || 0}
          icon={<Grid className="h-full w-full" />}
          variant="gold"
        />
        <WMSStatCard
          title="Locaties"
          value={locations?.length || 0}
          icon={<Layers className="h-full w-full" />}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouses List */}
        <div className="lg:col-span-1">
          <WMSGlassCard
            header={
              <WMSCardTitle subtitle={`${warehouses?.length || 0} locaties`}>
                Magazijnen
              </WMSCardTitle>
            }
          >
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : warehouses?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Warehouse className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Geen magazijnen</p>
                <Button variant="link" size="sm" onClick={() => setIsDialogOpen(true)}>
                  Voeg eerste toe
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {warehouses?.map((wh, index) => (
                  <div
                    key={wh.id}
                    onClick={() => setSelectedWarehouse(wh.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedWarehouse === wh.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{wh.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{wh.code}</p>
                      </div>
                      <Badge variant={wh.is_active ? "default" : "secondary"}>
                        {wh.is_active ? "Actief" : "Inactief"}
                      </Badge>
                    </div>
                    {wh.city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {wh.city}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </WMSGlassCard>
        </div>

        {/* Warehouse Details */}
        <div className="lg:col-span-2">
          {!selectedWarehouse ? (
            <WMSGlassCard>
              <div className="py-12 text-center text-muted-foreground">
                <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecteer een magazijn</p>
                <p className="text-sm">Klik op een magazijn om details te zien</p>
              </div>
            </WMSGlassCard>
          ) : (
            <div className="space-y-6">
              {/* Warehouse Info */}
              <WMSGlassCard
                header={
                  <WMSCardTitle subtitle={`Code: ${selectedWarehouseData?.code}`}>
                    {selectedWarehouseData?.name}
                  </WMSCardTitle>
                }
                actions={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditWarehouse(selectedWarehouseData)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Bewerken
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteWarehouseClick(selectedWarehouse)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedWarehouseData?.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm">{selectedWarehouseData.address}</p>
                        <p className="text-sm">
                          {selectedWarehouseData.postal_code} {selectedWarehouseData.city}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedWarehouseData?.contact_name && (
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm">{selectedWarehouseData.contact_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedWarehouseData.contact_phone}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedWarehouseData?.contact_email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{selectedWarehouseData.contact_email}</p>
                    </div>
                  )}
                </div>
              </WMSGlassCard>

              {/* Zones */}
              <WMSGlassCard
                header={
                  <WMSCardTitle subtitle={`${zones?.length || 0} zones`}>
                    Zones
                  </WMSCardTitle>
                }
                actions={
                  <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Zone
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nieuwe Zone</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Code</Label>
                            <Input
                              placeholder="A1"
                              value={newZone.code}
                              onChange={(e) => setNewZone({ ...newZone, code: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newZone.zone_type} onValueChange={(v) => setNewZone({ ...newZone, zone_type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="storage">Opslag</SelectItem>
                                <SelectItem value="picking">Picking</SelectItem>
                                <SelectItem value="staging">Staging</SelectItem>
                                <SelectItem value="receiving">Ontvangst</SelectItem>
                                <SelectItem value="shipping">Verzending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Naam</Label>
                          <Input
                            placeholder="Opslag Zone A"
                            value={newZone.name}
                            onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsZoneDialogOpen(false)}>Annuleren</Button>
                        <Button onClick={handleCreateZone} disabled={!newZone.code || !newZone.name}>Aanmaken</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                }
              >
                {zones?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Grid className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nog geen zones</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {zones?.map((zone, i) => (
                      <div
                        key={zone.id}
                        className="p-3 rounded-lg border bg-muted/30"
                      >
                        <p className="font-medium text-sm">{zone.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {zone.zone_type}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {zone.code}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </WMSGlassCard>

              {/* Storage Locations */}
              <WMSGlassCard
                header={
                  <WMSCardTitle subtitle={`${locations?.length || 0} locaties`}>
                    Opslaglocaties
                  </WMSCardTitle>
                }
                actions={
                  <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Locatie
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nieuwe Locatie</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Code *</Label>
                            <Input
                              placeholder="A1-01-01"
                              value={newLocation.code}
                              onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newLocation.location_type} onValueChange={(v) => setNewLocation({ ...newLocation, location_type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="shelf">Schap</SelectItem>
                                <SelectItem value="bin">Bin</SelectItem>
                                <SelectItem value="pallet">Palletplaats</SelectItem>
                                <SelectItem value="floor">Vloer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Zone (optioneel)</Label>
                          <Select value={newLocation.zone_id} onValueChange={(v) => setNewLocation({ ...newLocation, zone_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecteer zone" /></SelectTrigger>
                            <SelectContent>
                              {zones?.map(z => (
                                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)}>Annuleren</Button>
                        <Button onClick={handleCreateLocation} disabled={!newLocation.code}>Aanmaken</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                }
              >
                {locations?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nog geen locaties</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2 max-h-[300px] overflow-y-auto">
                    {locations?.map((loc, i) => (
                      <div
                        key={loc.id}
                        className={`p-2 rounded border text-center ${
                          loc.is_pickable
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-muted/50"
                        }`}
                      >
                        <p className="font-mono text-xs font-medium">{loc.code}</p>
                        <p className="text-[10px] text-muted-foreground">{loc.location_type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </WMSGlassCard>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Magazijn verwijderen"
        description="Weet je zeker dat je dit magazijn wilt deactiveren? Deze actie kan niet ongedaan worden gemaakt."
        onConfirm={handleDeleteWarehouseConfirm}
        isLoading={deleting}
      />
    </DashboardLayout>
  );
}

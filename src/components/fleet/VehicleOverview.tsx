import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { usePermissions } from '@/hooks/usePermissions';
import { validateKenteken } from '@/lib/nl-validators';
import { FleetBulkActions } from './FleetBulkActions';
import { FleetBulkMileageDialog } from './FleetBulkMileageDialog';
import { VehicleDetailSheet } from './VehicleDetailSheet';
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Truck, Search, Filter, MoreVertical, CheckCircle, AlertTriangle,
  XCircle, Pencil, Calendar, Loader2, Plus, Trash2, Download,
  Gauge, FileCheck, Wrench, Shield, ChevronRight, Car,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useFleetManagement, useUpdateVehicle, Vehicle } from '@/hooks/useFleetManagement';
import { differenceInDays, parseISO } from 'date-fns';

interface VehicleFormData {
  license_plate: string;
  brand: string;
  model: string;
  vehicle_type: string;
  capacity_kg: number | null;
  is_active: boolean;
  notes: string;
  apk_expiry_date: string;
  mileage_km: string;
  year_of_manufacture: string;
  insurance_expiry_date: string;
  next_service_date: string;
}

const emptyFormData: VehicleFormData = {
  license_plate: '',
  brand: '',
  model: '',
  vehicle_type: '',
  capacity_kg: null,
  is_active: true,
  notes: '',
  apk_expiry_date: '',
  mileage_km: '',
  year_of_manufacture: '',
  insurance_expiry_date: '',
  next_service_date: '',
};

interface VehicleOverviewProps {
  triggerAddVehicle?: boolean;
  onAddVehicleHandled?: () => void;
}

const VehicleOverview = ({ triggerAddVehicle, onAddVehicleHandled }: VehicleOverviewProps) => {
  const { toast } = useToast();
  const { company } = useCompany();
  const { canDelete } = usePermissions();
  const { canAddVehicle } = usePlanLimits();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; vehicleId: string | null; licensePlate: string }>({ open: false, vehicleId: null, licensePlate: '' });
  const [bulkConfirm, setBulkConfirm] = useState<{ open: boolean; action: 'activate' | 'deactivate' | null }>({ open: false, action: null });
  const [mileageDialogOpen, setMileageDialogOpen] = useState(false);

  // CRUD state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [licensePlateError, setLicensePlateError] = useState<string | undefined>();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { vehicles, vehiclesLoading, refetchVehicles } = useFleetManagement();
  const updateVehicle = useUpdateVehicle();

  // Handle parent trigger for adding vehicle
  useState(() => {
    if (triggerAddVehicle) {
      openNewDialog();
      onAddVehicleHandled?.();
    }
  });

  const openNewDialog = () => {
    setEditingVehicle(null);
    setFormData(emptyFormData);
    setLicensePlateError(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setLicensePlateError(undefined);
    setFormData({
      license_plate: vehicle.license_plate,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      vehicle_type: vehicle.vehicle_type || '',
      capacity_kg: vehicle.capacity_kg,
      is_active: vehicle.is_active,
      notes: vehicle.notes || '',
      apk_expiry_date: vehicle.apk_expiry_date || '',
      mileage_km: vehicle.mileage_km?.toString() || '',
      year_of_manufacture: vehicle.year_of_manufacture?.toString() || '',
      insurance_expiry_date: vehicle.insurance_expiry_date || '',
      next_service_date: vehicle.next_service_date || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.license_plate.trim()) {
      toast({ title: 'Kenteken is verplicht', variant: 'destructive' });
      return;
    }
    if (!editingVehicle && !canAddVehicle()) {
      toast({ title: 'Limiet bereikt', description: 'Upgrade om meer voertuigen toe te voegen.', variant: 'destructive' });
      return;
    }
    const kError = validateKenteken(formData.license_plate);
    if (kError) {
      setLicensePlateError(kError);
      return;
    }
    setSaving(true);
    try {
      const vehicleData = {
        license_plate: formData.license_plate,
        brand: formData.brand || null,
        model: formData.model || null,
        vehicle_type: formData.vehicle_type || null,
        capacity_kg: formData.capacity_kg,
        is_active: formData.is_active,
        notes: formData.notes || null,
        apk_expiry_date: formData.apk_expiry_date || null,
        mileage_km: formData.mileage_km ? parseInt(formData.mileage_km) : null,
        year_of_manufacture: formData.year_of_manufacture ? parseInt(formData.year_of_manufacture) : null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        next_service_date: formData.next_service_date || null,
        company_id: company?.id,
      };
      if (editingVehicle) {
        const { error } = await supabase.from('vehicles').update(vehicleData).eq('id', editingVehicle.id);
        if (error) throw error;
        toast({ title: 'Voertuig bijgewerkt' });
      } else {
        const { error } = await supabase.from('vehicles').insert(vehicleData);
        if (error) throw error;
        toast({ title: 'Voertuig toegevoegd' });
      }
      setDialogOpen(false);
      setEditingVehicle(null);
      setFormData(emptyFormData);
      refetchVehicles();
    } catch (error: any) {
      const description = error.code === '23505' ? 'Dit kenteken bestaat al' : error?.message || 'Onbekende fout';
      toast({ title: 'Fout bij opslaan', description, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setVehicleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleToDelete);
      if (error) throw error;
      toast({ title: 'Voertuig verwijderd' });
      refetchVehicles();
    } catch {
      toast({ title: 'Fout bij verwijderen', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
  };

  const openVehicleDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDetailSheetOpen(true);
  };

  const handleStatusFilter = (status: string, checked: boolean) => {
    if (checked) setStatusFilters([...statusFilters, status]);
    else setStatusFilters(statusFilters.filter(s => s !== status));
  };

  const handleOutOfService = (vehicleId: string) => {
    updateVehicle.mutate({ id: vehicleId, is_active: false }, {
      onSuccess: () => {
        setConfirmDialog({ open: false, vehicleId: null, licensePlate: '' });
        refetchVehicles();
      },
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Actief
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
        <XCircle className="h-3 w-3 mr-1" />
        Inactief
      </Badge>
    );
  };

  const getApkWarning = (expiryDate: string | null) => {
    if (!expiryDate) return <span className="text-muted-foreground">–</span>;
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return <Badge variant="destructive">Verlopen!</Badge>;
    if (days < 30) return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" />{days}d</Badge>;
    if (days < 60) return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">{days}d</Badge>;
    return <span className="text-muted-foreground">{new Date(expiryDate).toLocaleDateString('nl-NL')}</span>;
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch =
      v.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.model || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilters.length === 0) return matchesSearch;
    const status = v.is_active ? 'active' : 'out_of_service';
    return matchesSearch && statusFilters.includes(status);
  });

  const allSelected = filteredVehicles.length > 0 && filteredVehicles.every(v => selectedIds.has(v.id));
  const someSelected = filteredVehicles.some(v => selectedIds.has(v.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredVehicles.map(v => v.id)));
  }, [allSelected, filteredVehicles]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ is_active: action === 'activate' })
        .in('id', ids);
      if (error) throw error;
      toast({ title: `${ids.length} voertuig(en) ${action === 'activate' ? 'geactiveerd' : 'gedeactiveerd'}` });
      setSelectedIds(new Set());
      setBulkConfirm({ open: false, action: null });
      refetchVehicles();
    } catch {
      toast({ title: 'Fout bij bulk-actie', variant: 'destructive' });
    }
  };

  const handleExportCSV = () => {
    const selected = selectedIds.size > 0 ? vehicles.filter(v => selectedIds.has(v.id)) : filteredVehicles;
    if (selected.length === 0) {
      toast({ title: 'Geen voertuigen om te exporteren', variant: 'destructive' });
      return;
    }
    const headers = ['Kenteken', 'Merk', 'Model', 'Type', 'Bouwjaar', 'Km-stand', 'Laadvermogen (kg)', 'APK vervalt', 'Verzekering vervalt', 'Volgend onderhoud', 'Status'];
    const rows = selected.map(v => [
      v.license_plate,
      v.brand || '',
      v.model || '',
      v.vehicle_type || '',
      v.year_of_manufacture?.toString() || '',
      v.mileage_km?.toString() || '',
      v.capacity_kg?.toString() || '',
      v.apk_expiry_date || '',
      v.insurance_expiry_date || '',
      v.next_service_date || '',
      v.is_active ? 'Actief' : 'Inactief',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voertuigen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${selected.length} voertuig(en) geëxporteerd` });
  };

  if (vehiclesLoading) {
    return (
      <Card className="border-border/30 bg-card/70 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/30 bg-card/70 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Voertuigen ({filteredVehicles.length})
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek voertuig..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleExportCSV} title="CSV exporteren">
                <Download className="h-4 w-4" />
              </Button>
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className={cn(statusFilters.length > 0 && 'border-primary bg-primary/10')}>
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Filter op status</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id="filter-active" checked={statusFilters.includes('active')} onCheckedChange={(checked) => handleStatusFilter('active', !!checked)} />
                        <Label htmlFor="filter-active" className="text-sm flex items-center gap-2"><CheckCircle className="h-3 w-3 text-green-500" />Actief</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="filter-out" checked={statusFilters.includes('out_of_service')} onCheckedChange={(checked) => handleStatusFilter('out_of_service', !!checked)} />
                        <Label htmlFor="filter-out" className="text-sm flex items-center gap-2"><XCircle className="h-3 w-3 text-red-500" />Inactief</Label>
                      </div>
                    </div>
                    {statusFilters.length > 0 && (
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => setStatusFilters([])}>Filters wissen</Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button size="sm" onClick={openNewDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nieuw voertuig</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVehicles.length === 0 ? (
             <EmptyState
               icon={Truck}
               title="Nog geen voertuigen"
               description="Voeg je eerste voertuig toe om je vloot te beheren."
               action={{ label: "Voertuig toevoegen", onClick: openNewDialog, icon: Plus }}
             />
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border border-border/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 backdrop-blur-sm">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecteer alles"
                          className={cn(!allSelected && someSelected && 'data-[state=unchecked]:bg-primary/20')}
                        />
                      </TableHead>
                      <TableHead>Kenteken</TableHead>
                      <TableHead>Voertuig</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">KM stand</TableHead>
                      <TableHead>APK</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.map((vehicle, index) => {
                      const isSelected = selectedIds.has(vehicle.id);
                      return (
                        <motion.tr
                          key={vehicle.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02, type: 'spring', stiffness: 150, damping: 20 }}
                          className={cn(
                            'group transition-all duration-150 cursor-pointer',
                            isSelected ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/30'
                          )}
                          onClick={() => openVehicleDetail(vehicle)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(vehicle.id)} aria-label={`Selecteer ${vehicle.license_plate}`} />
                          </TableCell>
                          <TableCell>
                            <span className="font-mono font-semibold text-sm px-2 py-0.5 rounded-md bg-muted/50">{vehicle.license_plate}</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '–'}</span>
                              {vehicle.year_of_manufacture && <span className="text-xs text-muted-foreground ml-2">({vehicle.year_of_manufacture})</span>}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(vehicle.is_active)}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {vehicle.mileage_km ? `${vehicle.mileage_km.toLocaleString('nl-NL')} km` : '–'}
                          </TableCell>
                          <TableCell>{getApkWarning(vehicle.apk_expiry_date)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleEdit(vehicle)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Bewerken
                                </DropdownMenuItem>
                                {vehicle.is_active && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={() => setConfirmDialog({ open: true, vehicleId: vehicle.id, licensePlate: vehicle.license_plate })}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Uit dienst nemen
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={() => handleDeleteClick(vehicle.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Verwijderen
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredVehicles.map((vehicle, i) => (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border/30 rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => openVehicleDetail(vehicle)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-mono font-semibold">{vehicle.license_plate}</p>
                          <p className="text-xs text-muted-foreground">{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '–'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getApkWarning(vehicle.apk_expiry_date)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Type</span>
                        <p className="font-medium">{vehicle.vehicle_type || '–'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Status</span>
                        <div className="mt-0.5">{getStatusBadge(vehicle.is_active)}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Voertuig bewerken' : 'Nieuw voertuig'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basisgegevens</TabsTrigger>
                <TabsTrigger value="fleet">Fleet Management</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license_plate">Kenteken *</Label>
                    <Input
                      id="license_plate"
                      value={formData.license_plate}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData({ ...formData, license_plate: val });
                        if (licensePlateError) setLicensePlateError(validateKenteken(val));
                      }}
                      onBlur={(e) => setLicensePlateError(validateKenteken(e.target.value.toUpperCase()))}
                      placeholder="XX-XXX-XX"
                      required
                      className={licensePlateError ? 'font-mono border-destructive' : 'font-mono'}
                    />
                    {licensePlateError && <p className="text-xs text-destructive">{licensePlateError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Type voertuig</Label>
                    <Input id="vehicle_type" value={formData.vehicle_type} onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })} placeholder="Vrachtwagen, Bestelbus..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Merk</Label>
                    <Input id="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Mercedes, Volvo..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="Sprinter, FH..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_of_manufacture">Bouwjaar</Label>
                    <Input id="year_of_manufacture" type="number" value={formData.year_of_manufacture} onChange={(e) => setFormData({ ...formData, year_of_manufacture: e.target.value })} placeholder="2020" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity_kg">Laadvermogen (kg)</Label>
                    <Input id="capacity_kg" type="number" value={formData.capacity_kg || ''} onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="is_active">Status</Label>
                    <div className="flex items-center gap-3 h-10">
                      <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                      <span className="text-sm">{formData.is_active ? 'Actief' : 'Inactief'}</span>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notities</Label>
                    <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="fleet" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mileage_km" className="flex items-center gap-2"><Gauge className="h-4 w-4" />Kilometerstand</Label>
                    <Input id="mileage_km" type="number" value={formData.mileage_km} onChange={(e) => setFormData({ ...formData, mileage_km: e.target.value })} placeholder="150000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apk_expiry_date" className="flex items-center gap-2"><FileCheck className="h-4 w-4" />APK vervaldatum</Label>
                    <Input id="apk_expiry_date" type="date" value={formData.apk_expiry_date} onChange={(e) => setFormData({ ...formData, apk_expiry_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next_service_date" className="flex items-center gap-2"><Wrench className="h-4 w-4" />Volgende onderhoud</Label>
                    <Input id="next_service_date" type="date" value={formData.next_service_date} onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance_expiry_date" className="flex items-center gap-2"><Shield className="h-4 w-4" />Verzekering verloopt</Label>
                    <Input id="insurance_expiry_date" type="date" value={formData.insurance_expiry_date} onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opslaan...</> : 'Opslaan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Detail Sheet */}
      <VehicleDetailSheet
        vehicle={selectedVehicle}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Voertuig verwijderen"
        description="Weet je zeker dat je dit voertuig wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
      />

      {/* Fleet Bulk Actions */}
      <FleetBulkActions
        selectedCount={selectedIds.size}
        onActivate={() => setBulkConfirm({ open: true, action: 'activate' })}
        onDeactivate={() => setBulkConfirm({ open: true, action: 'deactivate' })}
        onExportCsv={handleExportCSV}
        onScheduleMaintenance={() => {}}
        onUpdateMileage={() => setMileageDialogOpen(true)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Bulk Mileage Dialog */}
      <FleetBulkMileageDialog
        open={mileageDialogOpen}
        onOpenChange={setMileageDialogOpen}
        selectedIds={Array.from(selectedIds)}
        onComplete={() => {
          setSelectedIds(new Set());
          refetchVehicles();
        }}
      />

      {/* Out of service confirm */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, vehicleId: null, licensePlate: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voertuig uit dienst nemen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je {confirmDialog.licensePlate} uit dienst wilt nemen? Het voertuig zal niet meer beschikbaar zijn voor planning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDialog.vehicleId && handleOutOfService(confirmDialog.vehicleId)}
            >
              {updateVehicle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Uit dienst nemen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk confirm */}
      <AlertDialog open={bulkConfirm.open} onOpenChange={(open) => !open && setBulkConfirm({ open: false, action: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk actie bevestigen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je {selectedIds.size} voertuig(en) wilt {bulkConfirm.action === 'activate' ? 'activeren' : 'deactiveren'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkConfirm.action && handleBulkAction(bulkConfirm.action)}>
              Bevestigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VehicleOverview;

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Truck, Search, Star, UserPlus, X, Upload, Download, Play, Pause, CheckSquare, RotateCcw, AlertTriangle, MoreHorizontal, Power, Users, Phone, Mail, Shield, UserCheck, Briefcase } from "lucide-react";
import { DriverBulkActions } from "@/components/drivers/DriverBulkActions";
import CarrierImportDialog from "@/components/carriers/CarrierImportDialog";
import { CreateDriverPortalDialog } from "@/components/drivers/CreateDriverPortalDialog";
import { writeExcelMultiSheet, writeCsvFile } from "@/lib/excelUtils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ===== CARRIER TYPES =====
interface CarrierContact {
  id?: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  notes: string;
}

interface Carrier {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  vat_number: string | null;
  iban: string | null;
  bic: string | null;
  notes: string | null;
  is_active: boolean;
  rating: number | null;
  vehicle_types: string[];
  permits: string[];
  vat_liable_eu: boolean;
  vat_liable_non_eu: boolean;
  payment_terms_days: number;
  payment_method: string | null;
  credit_limit: number | null;
  kvk_number: string | null;
  created_at: string | null;
  deleted_at: string | null;
  // Tarief velden
  tarief_per_km: number | null;
  tarief_per_uur: number | null;
  tarief_vast: number | null;
  beschikbaar: boolean;
}

type CarrierFormData = Omit<Carrier, 'id' | 'deleted_at'>;

// ===== DRIVER TYPES =====
type Driver = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  driver_category: string | null;
  is_zzp: boolean | null;
  license_number: string | null;
  user_id: string | null;
  created_at: string;
  tenant_id: string | null;
};

// ===== CONSTANTS =====
const VEHICLE_TYPES = ['Trekker', 'Oplegger', 'Bakwagen', 'Bestelbus', 'Kipper', 'Koelwagen', 'Dieplader', 'Tankwagen', 'Curtainsider', 'Containerchassis'];
const PERMITS = ['NIWO', 'ADR', 'GDP', 'TAPA', 'AEO', 'ISO 9001', 'ISO 14001', 'SQAS', 'EUR1', 'TIR'];
const PAYMENT_METHODS = ['Overmaking', 'Automatische incasso', 'Creditcard', 'PayPal', 'Factoring'];

const emptyCarrier: CarrierFormData = {
  company_name: '',
  contact_name: null,
  email: null,
  phone: null,
  address: null,
  postal_code: null,
  city: null,
  country: 'Nederland',
  vat_number: null,
  iban: null,
  bic: null,
  notes: null,
  is_active: true,
  rating: null,
  vehicle_types: [],
  permits: [],
  vat_liable_eu: true,
  vat_liable_non_eu: false,
  payment_terms_days: 30,
  payment_method: null,
  credit_limit: null,
  kvk_number: null,
  created_at: null,
  tarief_per_km: null,
  tarief_per_uur: null,
  tarief_vast: null,
  beschikbaar: true,
};

const emptyContact: CarrierContact = {
  name: '',
  role: '',
  email: '',
  phone: '',
  is_primary: false,
  notes: '',
};

// ===== DRIVERS TAB COMPONENT =====
const DriversTab = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [portalDriver, setPortalDriver] = useState<Driver | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLicense, setFormLicense] = useState("");
  const [formCategory, setFormCategory] = useState("light");
  const [formZzp, setFormZzp] = useState(false);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name, email, phone, status, driver_category, is_zzp, license_number, user_id, created_at, tenant_id")
        .order("name");
      if (error) throw error;
      return data as Driver[];
    },
  });

  const filtered = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.email?.toLowerCase().includes(search.toLowerCase()) ||
        d.phone?.includes(search);
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [drivers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: drivers.length,
    active: drivers.filter(d => d.status === "active").length,
    inactive: drivers.filter(d => d.status === "inactive").length,
    portal: drivers.filter(d => d.user_id).length,
  }), [drivers]);

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormPhone("");
    setFormLicense(""); setFormCategory("light"); setFormZzp(false);
  };

  const openEdit = (d: Driver) => {
    setFormName(d.name);
    setFormEmail(d.email || "");
    setFormPhone(d.phone || "");
    setFormLicense(d.license_number || "");
    setFormCategory(d.driver_category || "light");
    setFormZzp(d.is_zzp || false);
    setEditDriver(d);
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const tenantId = userData?.user?.id
        ? (await supabase.rpc("get_user_company_cached", { p_user_id: userData.user.id })).data
        : null;
      const { error } = await supabase.from("drivers").insert({
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        license_number: formLicense || null,
        driver_category: formCategory,
        is_zzp: formZzp,
        status: "active",
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast({ title: "Chauffeur toegevoegd" });
      setAddOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editDriver) return;
      const { error } = await supabase.from("drivers").update({
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        license_number: formLicense || null,
        driver_category: formCategory,
        is_zzp: formZzp,
      }).eq("id", editDriver.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast({ title: "Chauffeur bijgewerkt" });
      setEditDriver(null);
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (d: Driver) => {
      const newStatus = d.status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("drivers").update({ status: newStatus }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
      toast({ title: "Status bijgewerkt" });
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(d => d.id)));
    }
  };

  const bulkSetStatus = async (status: string) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("drivers").update({ status }).in("id", ids);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    toast({ title: `${ids.length} chauffeur${ids.length !== 1 ? 's' : ''} ${status === 'active' ? 'geactiveerd' : 'gedeactiveerd'}` });
    setSelectedIds(new Set());
  };

  const bulkExportCsv = () => {
    const selected = filtered.filter(d => selectedIds.has(d.id));
    const headers = ['Naam', 'E-mail', 'Telefoon', 'Categorie', 'Status', 'Portaal'];
    const rows = selected.map(d => [
      d.name,
      d.email || '',
      d.phone || '',
      d.driver_category === 'heavy' ? 'Zwaar' : 'Licht',
      d.status === 'active' ? 'Actief' : 'Inactief',
      d.user_id ? 'Ja' : 'Nee',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chauffeurs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: `${selected.length} chauffeur${selected.length !== 1 ? 's' : ''} geëxporteerd` });
  };

  const bulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("drivers").update({ deleted_at: new Date().toISOString() } as any).in("id", ids);
    setBulkDeleting(false);
    if (error) { toast({ title: "Fout", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    toast({ title: `${ids.length} chauffeur${ids.length !== 1 ? 's' : ''} verwijderd` });
    setSelectedIds(new Set());
    setDeleteConfirmOpen(false);
  };


  const kpiCards = [
    { label: "Totaal", value: stats.total, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Actief", value: stats.active, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Inactief", value: stats.inactive, icon: Briefcase, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Portaal", value: stats.portal, icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  const formDialog = (isEdit: boolean) => (
    <Dialog open={isEdit ? !!editDriver : addOpen} onOpenChange={(o) => { if (!o) { isEdit ? setEditDriver(null) : setAddOpen(false); resetForm(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chauffeur bewerken" : "Chauffeur toevoegen"}</DialogTitle>
          <DialogDescription>{isEdit ? "Pas de gegevens aan." : "Voeg handmatig een chauffeur toe."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Volledige naam" className="min-h-[44px] text-base" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@voorbeeld.nl" type="email" className="min-h-[44px] text-base" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefoon</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+31 6 ..." className="min-h-[44px] text-base" />
            </div>
            <div className="space-y-2">
              <Label>Rijbewijsnummer</Label>
              <Input value={formLicense} onChange={(e) => setFormLicense(e.target.value)} className="min-h-[44px] text-base" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categorie</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Licht (≤ 3.5t)</SelectItem>
                  <SelectItem value="heavy">{"Zwaar (> 3.5t)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { isEdit ? setEditDriver(null) : setAddOpen(false); resetForm(); }} className="min-h-[44px]">Annuleren</Button>
          <Button
            onClick={() => isEdit ? editMutation.mutate() : addMutation.mutate()}
            disabled={!formName || (isEdit ? editMutation.isPending : addMutation.isPending)}
            className="min-h-[44px]"
          >
            {isEdit ? "Opslaan" : "Toevoegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards — Elite Glass */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl p-4 space-y-1.5 hover:shadow-lg hover:shadow-primary/5 transition-shadow duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</span>
              <div className={`p-2 rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight tabular-nums">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Header + Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={driverFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDriverFilter('all')}
            className="min-h-[44px]"
          >
            Alle
          </Button>
          <Button
            variant={driverFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDriverFilter('active')}
            className="min-h-[44px]"
          >
            Actief
          </Button>
          <Button
            variant={driverFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDriverFilter('inactive')}
            className="min-h-[44px]"
          >
            Inactief
          </Button>
        </div>
        <Button onClick={() => { resetForm(); setAddOpen(true); }} className="min-h-[44px] gap-2">
          <Plus className="h-4 w-4" /> Chauffeur toevoegen
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, e-mail of telefoon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 min-h-[44px]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="active">Actief</SelectItem>
            <SelectItem value="inactive">Inactief</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Chauffeurs ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState message="Chauffeurs laden..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search || statusFilter !== 'all' ? 'Geen chauffeurs gevonden' : 'Nog geen chauffeurs'}
              description={search || statusFilter !== 'all' ? 'Pas je filters aan.' : 'Voeg je eerste chauffeur toe.'}
              action={!search && statusFilter === 'all' ? { label: 'Chauffeur toevoegen', onClick: openNewDialog, icon: Plus } : undefined}
            />
          ) : isMobile ? (
            <div className="space-y-3">
              {filtered.map((d) => (
                <div key={d.id} className="rounded-xl border border-border/50 bg-card/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={selectedIds.has(d.id)}
                        onCheckedChange={() => toggleSelect(d.id)}
                        className="flex-shrink-0"
                      />
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{d.name}</p>
                        <Badge variant={d.status === "active" ? "default" : "secondary"} className="text-[10px] mt-0.5">
                          {d.status === "active" ? "Actief" : "Inactief"}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4 mr-2" /> Bewerken
                        </DropdownMenuItem>
                        {!d.user_id && (
                          <DropdownMenuItem onClick={() => setPortalDriver(d)}>
                            <UserPlus className="h-4 w-4 mr-2" /> Portaalaccount
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(d)}>
                          <Power className="h-4 w-4 mr-2" />
                          {d.status === "active" ? "Deactiveren" : "Activeren"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {d.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 flex-shrink-0" />{d.email}</span>}
                    {d.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 flex-shrink-0" />{d.phone}</span>}
                    <Badge variant="outline" className="text-[10px] w-fit">{d.driver_category === "heavy" ? "Zwaar" : "Licht"}</Badge>
                    
                  </div>
                  {d.user_id && <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Portaal ✓</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Status</TableHead>
                    
                    <TableHead>Portaal</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id} className={cn("hover:bg-muted/40 transition-colors", selectedIds.has(d.id) && "bg-primary/5")}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(d.id)}
                          onCheckedChange={() => toggleSelect(d.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm">
                          {d.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{d.email}</span>}
                          {d.phone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{d.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{d.driver_category === "heavy" ? "Zwaar" : "Licht"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status === "active" ? "Actief" : "Inactief"}</Badge>
                      </TableCell>
                      
                      <TableCell>
                        {d.user_id ? (
                          <Badge variant="outline" className="text-xs text-primary border-primary/30">Account ✓</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4 mr-2" /> Bewerken
                            </DropdownMenuItem>
                            {!d.user_id && (
                              <DropdownMenuItem onClick={() => setPortalDriver(d)}>
                                <UserPlus className="h-4 w-4 mr-2" /> Portaalaccount aanmaken
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => toggleStatusMutation.mutate(d)}>
                              <Power className="h-4 w-4 mr-2" />
                              {d.status === "active" ? "Deactiveren" : "Activeren"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {formDialog(false)}
      {formDialog(true)}

      {portalDriver && (
        <CreateDriverPortalDialog
          open={!!portalDriver}
          onOpenChange={(o) => !o && setPortalDriver(null)}
          driverId={portalDriver.id}
          driverName={portalDriver.name}
          driverEmail={portalDriver.email || undefined}
          onSuccess={() => {
            setPortalDriver(null);
            queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
          }}
        />
      )}

      {/* Bulk Actions Bar */}
      <DriverBulkActions
        selectedCount={selectedIds.size}
        onActivate={() => bulkSetStatus('active')}
        onDeactivate={() => bulkSetStatus('inactive')}
        onExportCsv={bulkExportCsv}
        onDelete={() => setDeleteConfirmOpen(true)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Bulk Delete Confirm */}
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Chauffeurs verwijderen"
        description={`Weet je zeker dat je ${selectedIds.size} chauffeur${selectedIds.size !== 1 ? 's' : ''} wilt verwijderen?`}
        onConfirm={bulkDelete}
        isLoading={bulkDeleting}
      />
    </div>
  );
};

// ===== MAIN CARRIERS PAGE =====
const Carriers = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [formData, setFormData] = useState<CarrierFormData>(emptyCarrier);
  const [contacts, setContacts] = useState<CarrierContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [portalCarrierIds, setPortalCarrierIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashedCarriers, setTrashedCarriers] = useState<Carrier[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [trashLoading, setTrashLoading] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [permanentDeleteTargetIds, setPermanentDeleteTargetIds] = useState<string[]>([]);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "charters");
  const { toast } = useToast();
  const { company } = useCompany();

  useEffect(() => {
    if (company?.id) {
      fetchCarriers();
      fetchTrashCount();
    }
  }, [company?.id]);

  const fetchCarriers = async () => {
    if (!company?.id) return;
    setLoading(true);
    
    const [carriersRes, portalRes] = await Promise.all([
      supabase
        .from('carriers')
        .select('*')
        .eq('tenant_id', company.id)
        .is('deleted_at', null)
        .order('company_name', { ascending: true }),
      supabase
        .from('carrier_contacts')
        .select('carrier_id')
        .eq('tenant_id', company.id)
        .eq('portal_access', true)
        .not('user_id', 'is', null),
    ]);

    if (carriersRes.error) {
      toast({ title: "Fout bij ophalen charters", variant: "destructive" });
    } else {
      const portalCarrierIds = new Set((portalRes.data || []).map(c => c.carrier_id));
      setCarriers((carriersRes.data as unknown as Carrier[]) || []);
      setPortalCarrierIds(portalCarrierIds);
    }
    setSelectedIds(new Set());
    setLoading(false);
  };

  const fetchContacts = useCallback(async (carrierId: string) => {
    const { data } = await supabase
      .from('carrier_contacts')
      .select('*')
      .eq('carrier_id', carrierId)
      .order('is_primary', { ascending: false });
    setContacts((data as unknown as CarrierContact[]) || []);
  }, []);

  const saveContacts = async (carrierId: string) => {
    if (!company?.id) return;
    await supabase.from('carrier_contacts').delete().eq('carrier_id', carrierId);
    const contactsToInsert = contacts
      .filter(c => c.name.trim())
      .map(({ id, ...c }) => ({
        ...c,
        carrier_id: carrierId,
        tenant_id: company.id,
      }));
    if (contactsToInsert.length > 0) {
      await supabase.from('carrier_contacts').insert(contactsToInsert);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dbData = { ...formData };
    
    if (editingCarrier) {
      const { error } = await supabase
        .from('carriers')
        .update(dbData as any)
        .eq('id', editingCarrier.id);
      if (error) {
        console.error("Error updating carrier:", error);
        toast({ title: "Fout bij bijwerken charter", description: error.message || "Onbekende fout", variant: "destructive" });
        return;
      }
      await saveContacts(editingCarrier.id);
      toast({ title: "Charter bijgewerkt" });
    } else {
      const { data, error } = await supabase
        .from('carriers')
        .insert([{ ...dbData, tenant_id: company?.id } as any])
        .select('id')
        .single();
      if (error) {
        console.error("Error creating carrier:", error);
        toast({ title: "Fout bij aanmaken charter", description: error.message || "Onbekende fout", variant: "destructive" });
        return;
      }
      if (data) await saveContacts(data.id);
      toast({ title: "Charter aangemaakt" });
    }
    fetchCarriers();
    setDialogOpen(false);
  };

  const handleEdit = async (carrier: Carrier) => {
    setEditingCarrier(carrier);
    setFormData({
      company_name: carrier.company_name,
      contact_name: carrier.contact_name,
      email: carrier.email,
      phone: carrier.phone,
      address: carrier.address,
      postal_code: carrier.postal_code,
      city: carrier.city,
      country: carrier.country,
      vat_number: carrier.vat_number,
      iban: carrier.iban,
      bic: carrier.bic,
      notes: carrier.notes,
      is_active: carrier.is_active,
      rating: carrier.rating,
      vehicle_types: carrier.vehicle_types || [],
      permits: carrier.permits || [],
      vat_liable_eu: carrier.vat_liable_eu ?? true,
      vat_liable_non_eu: carrier.vat_liable_non_eu ?? false,
      payment_terms_days: carrier.payment_terms_days ?? 30,
      payment_method: carrier.payment_method,
      credit_limit: carrier.credit_limit,
      kvk_number: carrier.kvk_number,
      created_at: carrier.created_at,
      tarief_per_km: (carrier as any).tarief_per_km ?? null,
      tarief_per_uur: (carrier as any).tarief_per_uur ?? null,
      tarief_vast: (carrier as any).tarief_vast ?? null,
      beschikbaar: (carrier as any).beschikbaar !== false,
    });
    await fetchContacts(carrier.id);
    setDialogOpen(true);
  };

  const handleDeleteRequest = (ids: string[]) => {
    setDeleteTargetIds(ids);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    const { error } = await supabase
      .from('carriers')
      .update({ deleted_at: new Date().toISOString() } as any)
      .in('id', deleteTargetIds);
    if (error) {
      console.error("Error deleting carrier:", error);
      toast({ title: "Fout bij verwijderen charter(s)", description: error.message || "Onbekende fout", variant: "destructive" });
    } else {
      toast({ title: `${deleteTargetIds.length} charter(s) naar prullenbak verplaatst` });
      fetchCarriers();
      fetchTrashCount();
    }
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setDeleteTargetIds([]);
  };

  const fetchTrashCount = async () => {
    if (!company?.id) return;
    const { count } = await supabase
      .from('carriers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', company.id)
      .not('deleted_at', 'is', null);
    setTrashCount(count || 0);
  };

  const fetchTrashedCarriers = async () => {
    if (!company?.id) return;
    setTrashLoading(true);
    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('tenant_id', company.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (!error) {
      setTrashedCarriers((data as unknown as Carrier[]) || []);
    }
    setTrashLoading(false);
  };

  const handleRestore = async (ids: string[]) => {
    const { error } = await supabase
      .from('carriers')
      .update({ deleted_at: null } as any)
      .in('id', ids);
    if (error) {
      console.error("Error restoring carrier:", error);
      toast({ title: "Fout bij herstellen", description: error.message || "Onbekende fout", variant: "destructive" });
    } else {
      toast({ title: `${ids.length} charter(s) hersteld` });
      fetchCarriers();
      fetchTrashedCarriers();
      fetchTrashCount();
    }
  };

  const handlePermanentDeleteRequest = (ids: string[]) => {
    setPermanentDeleteTargetIds(ids);
    setPermanentDeleteDialogOpen(true);
  };

  const handlePermanentDeleteConfirm = async () => {
    setPermanentDeleteLoading(true);
    const { error } = await supabase.from('carriers').delete().in('id', permanentDeleteTargetIds);
    if (error) {
      toast({ title: "Fout bij definitief verwijderen", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${permanentDeleteTargetIds.length} charter(s) definitief verwijderd` });
      fetchTrashedCarriers();
      fetchTrashCount();
    }
    setPermanentDeleteLoading(false);
    setPermanentDeleteDialogOpen(false);
    setPermanentDeleteTargetIds([]);
  };

  const openTrash = () => {
    fetchTrashedCarriers();
    setTrashOpen(true);
  };

  const handleToggleActive = async (id: string, newActive: boolean) => {
    const { error } = await supabase.from('carriers').update({ is_active: newActive }).eq('id', id);
    if (error) {
      console.error("Error toggling carrier status:", error);
      toast({ title: "Fout bij wijzigen status", description: error.message || "Onbekende fout", variant: "destructive" });
    } else {
      toast({ title: newActive ? "Charter geactiveerd" : "Charter gedeactiveerd" });
      setCarriers(prev => prev.map(c => c.id === id ? { ...c, is_active: newActive } : c));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action === 'delete') {
      handleDeleteRequest(ids);
      return;
    }

    const newActive = action === 'activate';
    const { error } = await supabase.from('carriers').update({ is_active: newActive }).in('id', ids);
    if (error) {
      toast({ title: "Fout bij bulk-actie", variant: "destructive" });
    } else {
      toast({ title: `${ids.length} charter(s) ${newActive ? 'geactiveerd' : 'gedeactiveerd'}` });
      fetchCarriers();
    }
  };

  const openNewDialog = () => {
    setEditingCarrier(null);
    setFormData(emptyCarrier);
    setContacts([]);
    setDialogOpen(true);
  };

  const toggleArrayItem = (field: 'vehicle_types' | 'permits', item: string) => {
    const current = formData[field] || [];
    const updated = current.includes(item)
      ? current.filter(v => v !== item)
      : [...current, item];
    setFormData({ ...formData, [field]: updated });
  };

  const addContact = () => setContacts([...contacts, { ...emptyContact }]);
  const removeContact = (idx: number) => setContacts(contacts.filter((_, i) => i !== idx));
  const updateContact = (idx: number, field: keyof CarrierContact, value: any) => {
    const updated = [...contacts];
    (updated[idx] as any)[field] = value;
    if (field === 'is_primary' && value === true) {
      updated.forEach((c, i) => { if (i !== idx) c.is_primary = false; });
    }
    setContacts(updated);
  };

  const filteredCarriers = carriers.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active);
    return matchesSearch && matchesStatus;
  });

  const allSelected = filteredCarriers.length > 0 && filteredCarriers.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCarriers.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async (format: 'excel' | 'csv') => {
    if (!company?.id) return;
    const exportCarriers = someSelected
      ? carriers.filter(c => selectedIds.has(c.id))
      : carriers;

    if (exportCarriers.length === 0) {
      toast({ title: "Geen charters om te exporteren", variant: "destructive" });
      return;
    }

    const carrierIds = exportCarriers.map(c => c.id);
    const { data: contactsData } = await supabase
      .from('carrier_contacts')
      .select('*')
      .in('carrier_id', carrierIds)
      .eq('tenant_id', company.id);

    const carrierNameMap = new Map(exportCarriers.map(c => [c.id, c.company_name]));

    if (format === 'csv') {
      const flatData = exportCarriers.map(c => ({
        Bedrijfsnaam: c.company_name,
        Contact: c.contact_name || '',
        Email: c.email || '',
        Telefoon: c.phone || '',
        Adres: c.address || '',
        Postcode: c.postal_code || '',
        Plaats: c.city || '',
        Land: c.country || '',
        'BTW-nr': c.vat_number || '',
        'KVK-nr': c.kvk_number || '',
        IBAN: c.iban || '',
        BIC: c.bic || '',
        Voertuigtypes: (c.vehicle_types || []).join(', '),
        Vergunningen: (c.permits || []).join(', '),
        'BTW EU': c.vat_liable_eu ? 'Ja' : 'Nee',
        'BTW non-EU': c.vat_liable_non_eu ? 'Ja' : 'Nee',
        Betaaltermijn: c.payment_terms_days ?? '',
        Betaalmethode: c.payment_method || '',
        Actief: c.is_active ? 'Ja' : 'Nee',
        Notities: c.notes || '',
        Beoordeling: c.rating ?? '',
        Kredietlimiet: c.credit_limit ?? '',
        Aangemaakt: c.created_at ? new Date(c.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      }));
      writeCsvFile(flatData, 'Charters-export.csv');
      toast({ title: `${exportCarriers.length} charter(s) geëxporteerd als CSV` });
      return;
    }

    const carrierHeaders = ['Bedrijfsnaam', 'Contact', 'Email', 'Telefoon', 'Adres', 'Postcode', 'Plaats', 'Land', 'BTW-nr', 'KVK-nr', 'IBAN', 'BIC', 'Voertuigtypes', 'Vergunningen', 'BTW EU', 'BTW non-EU', 'Betaaltermijn', 'Betaalmethode', 'Actief', 'Notities', 'Beoordeling', 'Kredietlimiet', 'Aangemaakt'];
    const carrierRows = exportCarriers.map(c => [
      c.company_name, c.contact_name || '', c.email || '', c.phone || '',
      c.address || '', c.postal_code || '', c.city || '', c.country || '',
      c.vat_number || '', c.kvk_number || '', c.iban || '', c.bic || '',
      (c.vehicle_types || []).join(', '), (c.permits || []).join(', '),
      c.vat_liable_eu ? 'Ja' : 'Nee', c.vat_liable_non_eu ? 'Ja' : 'Nee',
      c.payment_terms_days ?? '', c.payment_method || '',
      c.is_active ? 'Ja' : 'Nee',
      c.notes || '', c.rating ?? '', c.credit_limit ?? '',
      c.created_at ? new Date(c.created_at).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    ]);

    const contactHeaders = ['Bedrijfsnaam', 'Naam', 'Rol', 'Email', 'Telefoon', 'Primair'];
    const contactRows = (contactsData || []).map((ct: any) => [
      carrierNameMap.get(ct.carrier_id) || '', ct.name, ct.role || '',
      ct.email || '', ct.phone || '', ct.is_primary ? 'Ja' : 'Nee',
    ]);

    await writeExcelMultiSheet([
      { name: 'Charters', headers: carrierHeaders, rows: carrierRows },
      { name: 'Contacten', headers: contactHeaders, rows: contactRows },
    ], 'Charters-export.xlsx');

    toast({ title: `${exportCarriers.length} charter(s) geëxporteerd als Excel` });
  };

  return (
    <DashboardLayout title="Charters & Eigen Chauffeurs" description="Beheer je charters en eigen chauffeurs">
      <div className="space-y-6">
        {/* Top-level Tabs — Elite Glass */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="inline-flex rounded-2xl bg-card/50 backdrop-blur-xl border border-border/30 p-1.5 shadow-sm">
            <TabsList className="bg-transparent p-0 h-auto gap-1">
              <TabsTrigger 
                value="charters" 
                className="gap-2 rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
              >
                <Truck className="h-4 w-4" /> Charters
              </TabsTrigger>
              <TabsTrigger 
                value="chauffeurs" 
                className="gap-2 rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
              >
                <Users className="h-4 w-4" /> Eigen Chauffeurs
              </TabsTrigger>
            </TabsList>
          </div>

          {/* CHARTERS TAB */}
          <TabsContent value="charters" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2 rounded-xl min-h-[44px]">
                  <Upload className="h-4 w-4" /> Importeren
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-xl min-h-[44px]">
                      <Download className="h-4 w-4" /> Exporteren
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>CSV (.csv)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={openTrash} className="gap-2 rounded-xl relative min-h-[44px]">
                  <Trash2 className="h-4 w-4" /> Prullenbak
                  {trashCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {trashCount}
                    </Badge>
                  )}
                </Button>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewDialog} className="gap-2 w-full sm:w-auto">
                    <Plus className="h-4 w-4" /> Nieuw charter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCarrier ? 'Charter bewerken' : 'Nieuw charter'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs defaultValue="algemeen">
                      <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="algemeen">Algemeen</TabsTrigger>
                        <TabsTrigger value="voertuigen">Voertuigen</TabsTrigger>
                        <TabsTrigger value="financieel">Financieel</TabsTrigger>
                        <TabsTrigger value="contacten">Contacten</TabsTrigger>
                      </TabsList>

                      <TabsContent value="algemeen" className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="company_name">Bedrijfsnaam *</Label>
                            <Input id="company_name" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact_name">Contactpersoon</Label>
                            <Input id="contact_name" value={formData.contact_name || ''} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefoon</Label>
                            <Input id="phone" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="address">Adres</Label>
                            <Input id="address" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="postal_code">Postcode</Label>
                            <Input id="postal_code" value={formData.postal_code || ''} onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city">Plaats</Label>
                            <Input id="city" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country">Land</Label>
                            <Input id="country" value={formData.country || ''} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="vat_number">BTW-nummer</Label>
                            <Input id="vat_number" value={formData.vat_number || ''} onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="iban">IBAN</Label>
                            <Input id="iban" value={formData.iban || ''} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="notes">Notities</Label>
                            <Textarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                            <Label htmlFor="is_active">Actief</Label>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="voertuigen" className="space-y-6 mt-4">
                        <div>
                          <Label className="text-base font-semibold">Voertuigtypes</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {VEHICLE_TYPES.map(vt => (
                              <label key={vt} className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors">
                                <Checkbox checked={(formData.vehicle_types || []).includes(vt)} onCheckedChange={() => toggleArrayItem('vehicle_types', vt)} />
                                <span className="text-sm">{vt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-base font-semibold">Vergunningen & Certificeringen</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {PERMITS.map(p => (
                              <label key={p} className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors">
                                <Checkbox checked={(formData.permits || []).includes(p)} onCheckedChange={() => toggleArrayItem('permits', p)} />
                                <span className="text-sm">{p}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="financieel" className="space-y-4 mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <Label htmlFor="vat_eu" className="cursor-pointer">BTW-plichtig binnen EU</Label>
                            <Switch id="vat_eu" checked={formData.vat_liable_eu} onCheckedChange={(checked) => setFormData({ ...formData, vat_liable_eu: checked })} />
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <Label htmlFor="vat_non_eu" className="cursor-pointer">BTW-plichtig buiten EU</Label>
                            <Switch id="vat_non_eu" checked={formData.vat_liable_non_eu} onCheckedChange={(checked) => setFormData({ ...formData, vat_liable_non_eu: checked })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment_terms">Betalingstermijn (dagen)</Label>
                            <Input id="payment_terms" type="number" min={0} value={formData.payment_terms_days} onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment_method">Betaalwijze</Label>
                            <Select value={formData.payment_method || ''} onValueChange={(v) => setFormData({ ...formData, payment_method: v || null })}>
                              <SelectTrigger><SelectValue placeholder="Selecteer betaalwijze" /></SelectTrigger>
                              <SelectContent>
                                {PAYMENT_METHODS.map(pm => (<SelectItem key={pm} value={pm}>{pm}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="credit_limit">Kredietlimiet (€)</Label>
                            <Input id="credit_limit" type="number" min={0} step="0.01" value={formData.credit_limit ?? ''} onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value ? parseFloat(e.target.value) : null })} />
                          </div>
                        </div>

                        {/* Tarieven sectie */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-sm font-semibold mb-3">Tarieven</p>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label htmlFor="tarief_per_km">Tarief per km (€/km)</Label>
                              <Input
                                id="tarief_per_km"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="bijv. 1.85"
                                value={(formData as any).tarief_per_km ?? ''}
                                onChange={(e) => setFormData({ ...formData, tarief_per_km: e.target.value ? parseFloat(e.target.value) : null } as any)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="tarief_per_uur">Tarief per uur (€/uur)</Label>
                              <Input
                                id="tarief_per_uur"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="bijv. 65.00"
                                value={(formData as any).tarief_per_uur ?? ''}
                                onChange={(e) => setFormData({ ...formData, tarief_per_uur: e.target.value ? parseFloat(e.target.value) : null } as any)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="tarief_vast">Vast tarief (€)</Label>
                              <Input
                                id="tarief_vast"
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="bijv. 250.00"
                                value={(formData as any).tarief_vast ?? ''}
                                onChange={(e) => setFormData({ ...formData, tarief_vast: e.target.value ? parseFloat(e.target.value) : null } as any)}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border mt-3">
                            <Label htmlFor="beschikbaar" className="cursor-pointer">Beschikbaar voor opdrachten</Label>
                            <Switch
                              id="beschikbaar"
                              checked={(formData as any).beschikbaar !== false}
                              onCheckedChange={(checked) => setFormData({ ...formData, beschikbaar: checked } as any)}
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="contacten" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold">Contactpersonen</Label>
                          <Button type="button" variant="outline" size="sm" onClick={addContact} className="gap-1">
                            <UserPlus className="h-4 w-4" /> Toevoegen
                          </Button>
                        </div>
                        {contacts.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">Nog geen contactpersonen.</p>
                        ) : (
                          <div className="space-y-3">
                            {contacts.map((contact, idx) => (
                              <div key={idx} className="border border-border rounded-lg p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Checkbox checked={contact.is_primary} onCheckedChange={(v) => updateContact(idx, 'is_primary', !!v)} />
                                    <span className="text-xs text-muted-foreground">Primair</span>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeContact(idx)}><X className="h-4 w-4" /></Button>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <Input placeholder="Naam *" value={contact.name} onChange={(e) => updateContact(idx, 'name', e.target.value)} />
                                  <Input placeholder="Functie" value={contact.role} onChange={(e) => updateContact(idx, 'role', e.target.value)} />
                                  <Input placeholder="E-mail" type="email" value={contact.email} onChange={(e) => updateContact(idx, 'email', e.target.value)} />
                                  <Input placeholder="Telefoon" value={contact.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
                      <Button type="submit">{editingCarrier ? 'Bijwerken' : 'Aanmaken'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* Search + Status Filter */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
            >
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Zoek charters..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-base rounded-xl min-h-[44px]" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[200px] rounded-xl min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle charters</SelectItem>
                  <SelectItem value="active">Actieve charters</SelectItem>
                  <SelectItem value="inactive">Inactieve charters</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Bulk Actions — Floating Glass Bar */}
            <AnimatePresence>
              {someSelected && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-card/70 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{selectedIds.size} geselecteerd</span>
                  </div>
                  <div className="flex gap-2 sm:ml-auto flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')} className="gap-1.5 rounded-xl min-h-[40px]"><Play className="h-3.5 w-3.5" /> Activeren</Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')} className="gap-1.5 rounded-xl min-h-[40px]"><Pause className="h-3.5 w-3.5" /> Deactiveren</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')} className="gap-1.5 rounded-xl min-h-[40px]"><Trash2 className="h-3.5 w-3.5" /> Verwijderen</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
            <Card className="border-border/30 bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Charters ({filteredCarriers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Laden...</div>
                ) : filteredCarriers.length === 0 ? (
                  (searchTerm || statusFilter !== 'all') ? (
                    <div className="text-center py-8 text-muted-foreground">Geen charters gevonden</div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div className="space-y-3">
                          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                            Geen charters gevonden. Voeg een charter toe voor uitbesteding en inkoopfacturen.
                          </p>
                          <Button onClick={openNewDialog} size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Voeg charter toe
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-border/30">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></TableHead>
                            <TableHead>Bedrijfsnaam</TableHead>
                            <TableHead>Plaats</TableHead>
                            <TableHead>Voertuigtypes</TableHead>
                            <TableHead>Vergunningen</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Acties</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCarriers.map((carrier) => (
                            <TableRow key={carrier.id} className={`cursor-pointer transition-all duration-200 hover:bg-muted/40 hover:-translate-y-[1px] hover:shadow-sm ${!carrier.is_active ? 'opacity-60' : ''}`} onClick={() => navigate(`/carriers/${carrier.id}`)}>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox checked={selectedIds.has(carrier.id)} onCheckedChange={() => toggleSelect(carrier.id)} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${carrier.is_active ? 'bg-green-500' : 'bg-destructive'}`} />
                                  {portalCarrierIds.has(carrier.id) && (
                                    <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-blue-500 ring-2 ring-background" title="Heeft portaal toegang" />
                                  )}
                                  <div>
                                    <span className="font-medium">{carrier.company_name}</span>
                                    {carrier.contact_name && <span className="block text-xs text-muted-foreground">{carrier.contact_name}</span>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{carrier.city || '-'}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {(carrier.vehicle_types || []).slice(0, 3).map(vt => (<Badge key={vt} variant="secondary" className="text-xs">{vt}</Badge>))}
                                  {(carrier.vehicle_types || []).length > 3 && (<Badge variant="outline" className="text-xs">+{carrier.vehicle_types.length - 3}</Badge>)}
                                  {!(carrier.vehicle_types || []).length && <span className="text-muted-foreground text-xs">-</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {(carrier.permits || []).slice(0, 3).map(p => (<Badge key={p} variant="outline" className="text-xs">{p}</Badge>))}
                                  {(carrier.permits || []).length > 3 && (<Badge variant="outline" className="text-xs">+{carrier.permits.length - 3}</Badge>)}
                                  {!(carrier.permits || []).length && <span className="text-muted-foreground text-xs">-</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                {carrier.rating ? (
                                  <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{carrier.rating.toFixed(1)}</span>
                                ) : '-'}
                              </TableCell>
                              <TableCell><Badge variant={carrier.is_active ? "default" : "destructive"}>{carrier.is_active ? 'Actief' : 'Inactief'}</Badge></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" title={carrier.is_active ? 'Deactiveren' : 'Activeren'} onClick={() => handleToggleActive(carrier.id, !carrier.is_active)}>
                                    {carrier.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(carrier)}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest([carrier.id])}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-3">
                      {filteredCarriers.map((carrier, i) => (
                        <motion.div
                          key={carrier.id}
                          initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className={`bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform duration-150 ${!carrier.is_active ? 'opacity-60' : ''}`}
                          onClick={() => navigate(`/carriers/${carrier.id}`)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${carrier.is_active ? 'bg-green-500' : 'bg-destructive'}`} />
                                {portalCarrierIds.has(carrier.id) && (
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-blue-500" title="Heeft portaal toegang" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{carrier.company_name}</p>
                                {carrier.contact_name && (
                                  <p className="text-xs text-muted-foreground truncate">{carrier.contact_name}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant={carrier.is_active ? "default" : "destructive"} className="text-xs flex-shrink-0 ml-2">
                              {carrier.is_active ? 'Actief' : 'Inactief'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Email</span>
                              <p className="font-medium truncate">{carrier.email || '-'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Rating</span>
                              <p className="font-medium">
                                {carrier.rating ? (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                    {carrier.rating.toFixed(1)}
                                  </span>
                                ) : '-'}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          {/* EIGEN CHAUFFEURS TAB */}
          <TabsContent value="chauffeurs" className="mt-6">
            <DriversTab />
          </TabsContent>
        </Tabs>

        {/* Shared dialogs */}
        {company?.id && (
          <CarrierImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            tenantId={company.id}
            onImportComplete={fetchCarriers}
          />
        )}

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Charter(s) verwijderen"
          description={`Weet je zeker dat je ${deleteTargetIds.length} charter(s) naar de prullenbak wilt verplaatsen?`}
          onConfirm={handleDeleteConfirm}
          isLoading={deleteLoading}
          confirmText="Naar prullenbak"
        />

        <DeleteConfirmDialog
          open={permanentDeleteDialogOpen}
          onOpenChange={setPermanentDeleteDialogOpen}
          title="Definitief verwijderen"
          description={`Weet je zeker dat je ${permanentDeleteTargetIds.length} charter(s) definitief wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
          onConfirm={handlePermanentDeleteConfirm}
          isLoading={permanentDeleteLoading}
          confirmText="Definitief verwijderen"
        />

        {/* Prullenbak Dialog */}
        <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> Prullenbak ({trashedCarriers.length})</DialogTitle>
            </DialogHeader>
            {trashLoading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : trashedCarriers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">De prullenbak is leeg.</div>
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => handleRestore(trashedCarriers.map(c => c.id))} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Alles herstellen</Button>
                  <Button variant="destructive" size="sm" onClick={() => handlePermanentDeleteRequest(trashedCarriers.map(c => c.id))} className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Alles definitief verwijderen</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bedrijfsnaam</TableHead>
                      <TableHead>Plaats</TableHead>
                      <TableHead>Verwijderd op</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trashedCarriers.map((carrier) => (
                      <TableRow key={carrier.id}>
                        <TableCell className="font-medium">{carrier.company_name}</TableCell>
                        <TableCell>{carrier.city || '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {carrier.deleted_at ? new Date(carrier.deleted_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleRestore([carrier.id])} className="gap-1"><RotateCcw className="h-3.5 w-3.5" /> Herstellen</Button>
                            <Button variant="destructive" size="sm" onClick={() => handlePermanentDeleteRequest([carrier.id])} className="gap-1"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Carriers;

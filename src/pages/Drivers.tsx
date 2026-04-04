import { useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { SwipeableCard, swipeActions } from "@/components/ui/swipeable-card";
import { validateNLTelefoon } from "@/lib/nl-validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { DriverSmsButton } from "@/components/drivers/DriverSmsButton";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  User,
  Phone,
  Mail,
  Star,
  Truck,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Upload,
  X,
  Eye,
  Clock,
  MapPin,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  availability: string | null;
  driver_category: string | null;
  license_number: string | null;
  license_expiry: string | null;
  is_zzp: boolean | null;
  rating: number | null;
  on_time_percentage: number | null;
  total_trips: number | null;
  current_city: string | null;
  notes: string | null;
  tenant_id: string | null;
  adr_expiry: string | null;
  cpc_expiry: string | null;
}

const emptyDriver: Omit<Driver, "id"> = {
  name: "",
  email: null,
  phone: null,
  status: "active",
  availability: "beschikbaar",
  driver_category: "heavy",
  license_number: null,
  license_expiry: null,
  is_zzp: false,
  rating: null,
  on_time_percentage: null,
  total_trips: null,
  current_city: null,
  notes: null,
  tenant_id: null,
  adr_expiry: null,
  cpc_expiry: null,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Actief", color: "bg-green-500/20 text-green-600 border-green-500/30" },
  inactive: { label: "Inactief", color: "bg-gray-500/20 text-gray-500 border-gray-500/30" },
  on_leave: { label: "Verlof", color: "bg-amber-500/20 text-amber-600 border-amber-500/30" },
};

// Beschikbaarheid (realtime availability) separate from employment status
const availabilityConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  beschikbaar: { label: "Beschikbaar", color: "bg-green-500/20 text-green-600 border-green-500/30", icon: CheckCircle2 },
  onderweg: { label: "Onderweg", color: "bg-orange-500/20 text-orange-600 border-orange-500/30", icon: Truck },
  vrij: { label: "Vrij", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: Clock },
};

interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  expiry_date: string | null;
  created_at: string;
}

const Drivers = () => {
  const { company } = useCompany();
  const { canDelete, canManageDrivers } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<Omit<Driver, "id">>(emptyDriver);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [activeTab, setActiveTab] = useState<"info" | "documenten">("info");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const validateDriverField = (field: string, value: string) => {
    let error: string | undefined;
    if (field === "phone") error = validateNLTelefoon(value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateDriverForm = () => {
    const errors: Record<string, string | undefined> = {
      phone: validateNLTelefoon(formData.phone || ""),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["drivers", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("tenant_id", company.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as unknown as Driver[];
    },
    enabled: !!company?.id,
  });

  const { data: driverDocuments = [], refetch: refetchDocs } = useQuery({
    queryKey: ["driver-documents", editingDriver?.id],
    queryFn: async () => {
      if (!editingDriver?.id) return [];
      const { data, error } = await (supabase as any)
        .from("driver_documents")
        .select("*")
        .eq("driver_id", editingDriver.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DriverDocument[];
    },
    enabled: !!editingDriver?.id && activeTab === "documenten",
  });

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingDriver) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Bestand te groot", description: "Max 10MB", variant: "destructive" });
      return;
    }
    setUploadingDoc(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `driver-docs/${editingDriver.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("order-documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("order-documents").getPublicUrl(path);
      const { error: dbErr } = await (supabase as any).from("driver_documents").insert({
        driver_id: editingDriver.id,
        document_type: "overig",
        file_name: file.name,
        file_url: urlData.publicUrl,
        expiry_date: null,
      });
      if (dbErr) throw dbErr;
      toast({ title: "Document geüpload" });
      refetchDocs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      toast({ title: "Upload mislukt", description: msg, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (deletingDocId) return;
    setDeletingDocId(docId);
    try {
      const { error } = await supabase.from("driver_documents").delete().eq("id", docId);
      if (error) {
        toast({ title: "Verwijderen mislukt", variant: "destructive" });
      } else {
        toast({ title: "Document verwijderd" });
        refetchDocs();
      }
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleAvailabilityChange = async (driverId: string, availability: string) => {
    const { error } = await supabase
      .from("drivers")
      .update({ availability } as any)
      .eq("id", driverId);
    if (error) {
      toast({ title: "Beschikbaarheid bijwerken mislukt", variant: "destructive" });
    } else {
      toast({ title: "Beschikbaarheid bijgewerkt" });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    }
  };

  const { canAddDriver } = usePlanLimits();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Naam is verplicht", variant: "destructive" });
      return;
    }
    if (!editingDriver && !canAddDriver()) {
      toast({ title: "Limiet bereikt", description: "Je hebt het maximale aantal chauffeurs voor je pakket bereikt. Upgrade om meer toe te voegen.", variant: "destructive" });
      return;
    }
    if (!validateDriverForm()) {
      toast({ title: "Controleer de gemarkeerde velden", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        status: formData.status,
        availability: formData.availability || "beschikbaar",
        driver_category: formData.driver_category || null,
        license_number: formData.license_number || null,
        license_expiry: formData.license_expiry || null,
        is_zzp: formData.is_zzp ?? false,
        current_city: formData.current_city || null,
        notes: formData.notes || null,
        adr_expiry: formData.adr_expiry || null,
        cpc_expiry: formData.cpc_expiry || null,
        tenant_id: company?.id,
      } as any;

      if (editingDriver) {
        const { error } = await supabase
          .from("drivers")
          .update(payload)
          .eq("id", editingDriver.id);
        if (error) throw error;
        toast({ title: "Chauffeur bijgewerkt" });
      } else {
        const { error } = await supabase.from("drivers").insert(payload);
        if (error) throw error;
        toast({ title: "Chauffeur toegevoegd" });
      }

      setDialogOpen(false);
      setEditingDriver(null);
      setFormData(emptyDriver);
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      toast({ title: "Fout bij opslaan", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setActiveTab("info");
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      status: driver.status,
      availability: (driver as any).availability || "beschikbaar",
      driver_category: driver.driver_category,
      license_number: driver.license_number,
      license_expiry: driver.license_expiry,
      is_zzp: driver.is_zzp,
      rating: driver.rating,
      on_time_percentage: driver.on_time_percentage,
      total_trips: driver.total_trips,
      current_city: driver.current_city,
      notes: driver.notes,
      tenant_id: driver.tenant_id,
      adr_expiry: driver.adr_expiry,
      cpc_expiry: driver.cpc_expiry,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDriverToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!driverToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ status: "inactive" })
        .eq("id", driverToDelete);
      if (error) throw error;
      toast({ title: "Chauffeur gedeactiveerd" });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    } catch (error) {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDriverToDelete(null);
    }
  };

  const openNewDialog = () => {
    setEditingDriver(null);
    setFormData(emptyDriver);
    setFieldErrors({});
    setActiveTab("info");
    setDialogOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ["Naam", "Email", "Telefoon", "Status", "Categorie", "Rijbewijsnummer", "Rijbewijs vervalt", "ZZP", "Stad", "Rating", "Stiptheid %", "Totaal ritten"];
    const rows = filteredDrivers.map((d) => [
      d.name,
      d.email || "",
      d.phone || "",
      statusConfig[d.status]?.label || d.status,
      d.driver_category || "",
      d.license_number || "",
      d.license_expiry || "",
      d.is_zzp ? "Ja" : "Nee",
      d.current_city || "",
      d.rating?.toString() || "",
      d.on_time_percentage?.toString() || "",
      d.total_trips?.toString() || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chauffeurs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV gedownload", description: `${filteredDrivers.length} chauffeurs geëxporteerd` });
  };

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm) ||
      d.current_city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: drivers.length,
    active: drivers.filter((d) => d.status === "active").length,
    zzp: drivers.filter((d) => d.is_zzp).length,
    beschikbaar: drivers.filter((d) => (d as any).availability === "beschikbaar" || !(d as any).availability).length,
    onderweg: drivers.filter((d) => (d as any).availability === "onderweg").length,
    vrij: drivers.filter((d) => (d as any).availability === "vrij").length,
  };

  return (
    <DashboardLayout title="Chauffeurs">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Totaal</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Actief</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.zzp}</p>
                <p className="text-xs text-muted-foreground">ZZP</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op naam, email, stad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Alle statussen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="active">Actief</SelectItem>
                <SelectItem value="inactive">Inactief</SelectItem>
                <SelectItem value="on_leave">Verlof</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            {canManageDrivers && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewDialog} className="gap-2 w-full sm:w-auto">
                    <Plus className="h-4 w-4" />
                    Nieuwe chauffeur
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDriver ? "Chauffeur bewerken" : "Nieuwe chauffeur"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="name">Naam *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Volledige naam"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email || ""}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                          placeholder="chauffeur@email.nl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefoon</Label>
                        <Input
                          id="phone"
                          value={formData.phone || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value || null });
                            if (fieldErrors.phone) validateDriverField("phone", e.target.value);
                          }}
                          onBlur={(e) => validateDriverField("phone", e.target.value)}
                          placeholder="+31 6 12345678"
                          className={fieldErrors.phone ? "border-destructive" : ""}
                        />
                        {fieldErrors.phone && (
                          <p className="text-xs text-destructive">{fieldErrors.phone}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) => setFormData({ ...formData, status: v })}
                        >
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Actief</SelectItem>
                            <SelectItem value="inactive">Inactief</SelectItem>
                            <SelectItem value="on_leave">Verlof</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="driver_category">Categorie</Label>
                        <Select
                          value={formData.driver_category || "heavy"}
                          onValueChange={(v) => setFormData({ ...formData, driver_category: v })}
                        >
                          <SelectTrigger id="driver_category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Licht (bestelbus)</SelectItem>
                            <SelectItem value="heavy">Zwaar (vrachtwagen)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="license_number">Rijbewijsnummer</Label>
                        <Input
                          id="license_number"
                          value={formData.license_number || ""}
                          onChange={(e) => setFormData({ ...formData, license_number: e.target.value || null })}
                          placeholder="NL-12345678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="license_expiry">Rijbewijs vervaldatum</Label>
                        <Input
                          id="license_expiry"
                          type="date"
                          value={formData.license_expiry || ""}
                          onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adr_expiry">ADR vervaldatum</Label>
                        <Input
                          id="adr_expiry"
                          type="date"
                          value={formData.adr_expiry || ""}
                          onChange={(e) => setFormData({ ...formData, adr_expiry: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpc_expiry">CPC vervaldatum</Label>
                        <Input
                          id="cpc_expiry"
                          type="date"
                          value={formData.cpc_expiry || ""}
                          onChange={(e) => setFormData({ ...formData, cpc_expiry: e.target.value || null })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="current_city">Standplaats</Label>
                        <Input
                          id="current_city"
                          value={formData.current_city || ""}
                          onChange={(e) => setFormData({ ...formData, current_city: e.target.value || null })}
                          placeholder="Amsterdam"
                        />
                      </div>
                      <div className="space-y-2 flex items-center gap-3 pt-6">
                        <Switch
                          id="is_zzp"
                          checked={formData.is_zzp ?? false}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_zzp: checked })}
                        />
                        <Label htmlFor="is_zzp">ZZP / Freelancer</Label>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="notes">Notities</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes || ""}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                          rows={2}
                          placeholder="Interne opmerkingen..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Annuleren
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Opslaan...
                          </>
                        ) : (
                          "Opslaan"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Chauffeurs ({filteredDrivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState message="Chauffeurs laden..." />
            ) : filteredDrivers.length === 0 ? (
              <EmptyState
                icon={User}
                title={searchTerm || statusFilter !== "all"
                  ? "Geen chauffeurs gevonden"
                  : "Nog geen chauffeurs"}
                description={searchTerm || statusFilter !== "all"
                  ? "Pas je filters aan of probeer een andere zoekterm."
                  : "Voeg je eerste chauffeur toe om te beginnen."}
                action={canManageDrivers && !searchTerm && statusFilter === "all"
                  ? { label: "Eerste chauffeur toevoegen", onClick: openNewDialog, icon: Plus }
                  : undefined}
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Naam</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Beschikbaarheid</TableHead>
                        <TableHead>Categorie</TableHead>
                        <TableHead>Standplaats</TableHead>
                        <TableHead>Ritten</TableHead>
                        <TableHead>Stiptheid</TableHead>
                        <TableHead className="w-[100px]">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDrivers.map((driver) => {
                        const sc = statusConfig[driver.status] || {
                          label: driver.status,
                          color: "bg-gray-500/20 text-gray-500 border-gray-500/30",
                        };
                        const av = availabilityConfig[(driver as any).availability] || availabilityConfig.beschikbaar;
                        return (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                                  {driver.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{driver.name}</p>
                                  {driver.is_zzp && (
                                    <span className="text-xs text-muted-foreground">ZZP</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {driver.phone && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {driver.phone}
                                  </div>
                                )}
                                {driver.email && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {driver.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border text-xs ${sc.color}`}>
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`border text-xs ${av.color}`}>
                                {av.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {driver.driver_category === "light" ? "Licht" : driver.driver_category === "heavy" ? "Zwaar" : "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {driver.current_city || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {driver.total_trips ?? "-"}
                            </TableCell>
                            <TableCell>
                              {driver.on_time_percentage != null ? (
                                <div className="flex items-center gap-1">
                                  <div
                                    className={`h-2 rounded-full ${
                                      driver.on_time_percentage >= 90
                                        ? "bg-green-500"
                                        : driver.on_time_percentage >= 75
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(driver.on_time_percentage, 100)}%`, maxWidth: "60px" }}
                                  />
                                  <span className="text-xs">{driver.on_time_percentage}%</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {canManageDrivers && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(driver)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(driver.id)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  <PullToRefresh onRefresh={async () => { queryClient.invalidateQueries({ queryKey: ["drivers"] }); >
                    <div className="space-y-3 p-1">
                      {filteredDrivers.map((driver, i) => {
                        const sc = statusConfig[driver.status] || {
                          label: driver.status,
                          color: "bg-gray-500/20 text-gray-500 border-gray-500/30",
                        };
                        const av = availabilityConfig[(driver as any).availability] || availabilityConfig.beschikbaar;
                        return (
                          <SwipeableCard
                            key={driver.id}
                            leftActions={canManageDrivers ? [swipeActions.more(() => handleEdit(driver))] : []}
                            rightActions={canDelete ? [swipeActions.delete(() => handleDeleteClick(driver.id))] : []}
                          >
                            <div
                              className="bg-card border border-border rounded-xl p-4"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                                    {driver.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{driver.name}</p>
                                    {driver.is_zzp && (
                                      <span className="text-xs text-muted-foreground">ZZP</span>
                                    )}
                                  </div>
                                </div>
                                <Badge className={`border text-xs ${sc.color}`}>
                                  {sc.label}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div>
                                  <span className="text-muted-foreground text-xs">Telefoon</span>
                                  <p className="font-medium">
                                    {driver.phone ? (
                                      <a href={`tel:${driver.phone}`}>{driver.phone}</a>
                                    ) : "-"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Beschikbaarheid</span>
                                  <p className="font-medium mt-0.5">
                                    <Badge className={`border text-xs ${av.color}`}>
                                      {av.label}
                                    </Badge>
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Voertuig</span>
                                  <p className="font-medium">
                                    {driver.driver_category === "light" ? "Bestelbus" : driver.driver_category === "heavy" ? "Vrachtwagen" : "-"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Standplaats</span>
                                  <p className="font-medium">{driver.current_city || "-"}</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-border/40">
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {driver.total_trips != null && (
                                    <span>{driver.total_trips} ritten</span>
                                  )}
                                  {driver.on_time_percentage != null && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 text-amber-500" />
                                      <span>{driver.on_time_percentage}%</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {driver.phone && (
                                    <DriverSmsButton
                                      driverName={driver.name}
                                      driverPhone={driver.phone}
                                      driverId={driver.id}
                                      variant="icon"
                                    />
                                  )}
                                  {canManageDrivers && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="min-h-[44px] rounded-xl gap-1.5"
                                      onClick={() => handleEdit(driver)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Bewerken
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="min-h-[44px] min-w-[44px] rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteClick(driver.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SwipeableCard>
                        );
                      })}
                    </div>
                  </PullToRefresh>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Chauffeur deactiveren"
        description="Weet je zeker dat je deze chauffeur wilt deactiveren? De chauffeur wordt op inactief gezet."
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
      />
    </DashboardLayout>
  );
};

export default Drivers;

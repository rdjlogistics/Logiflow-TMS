import { useState, useEffect, useCallback } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useUserRole } from "@/hooks/useUserRole";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { SwipeableCard, swipeActions } from "@/components/ui/swipeable-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  validateBTWNummer,
  validateNLPostcode,
  validateNLTelefoon,
} from "@/lib/nl-validators";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Loader2, CheckCircle2, History, RotateCcw, CheckSquare, AlertTriangle, UserPlus, Download } from "lucide-react";
import { CreateCustomerPortalDialog } from "@/components/customers/CreateCustomerPortalDialog";
import { CustomerAuditLogTab } from "@/components/customers/CustomerAuditLogTab";
import { usePostcodeLookup, formatDutchPostcode } from "@/hooks/usePostcodeLookup";
import { cn } from "@/lib/utils";

interface Customer {
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
  notes: string | null;
  deleted_at?: string | null;
  user_id?: string | null;
}

const emptyCustomer: Omit<Customer, "id"> = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  postal_code: "",
  city: "",
  country: "Nederland",
  vat_number: "",
  notes: "",
};

const Customers = () => {
  const { company } = useCompany();
  const { isAdmin } = useUserRole();
  const { data: tenantSettings } = useTenantSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteOrderCount, setDeleteOrderCount] = useState(0);
  const [auditCustomerId, setAuditCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Omit<Customer, "id">>(emptyCustomer);
  const { toast } = useToast();
  const { lookupPostcode, loading: postcodeLoading } = usePostcodeLookup();
  const [autoFilled, setAutoFilled] = useState(false);
  const [lastLookup, setLastLookup] = useState<string>("");
  const [hideTestData, setHideTestData] = useState(false);
  const [attachDocsOverride, setAttachDocsOverride] = useState<boolean | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<string>('to_planning');
  const [deliveryConfEnabled, setDeliveryConfEnabled] = useState<boolean>(true);
  const [deliveryConfPerStop, setDeliveryConfPerStop] = useState<boolean>(false);
  const [deliveryConfRecipients, setDeliveryConfRecipients] = useState<string>("");

  // NL field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const validateField = (field: string, value: string) => {
    let error: string | undefined;
    if (field === "phone") error = validateNLTelefoon(value);
    if (field === "postal_code") error = validateNLPostcode(value);
    if (field === "vat_number") error = validateBTWNummer(value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateCustomerForm = () => {
    const errors: Record<string, string | undefined> = {
      phone: validateNLTelefoon(formData.phone || ""),
      postal_code: validateNLPostcode(formData.postal_code || ""),
      vat_number: validateBTWNummer(formData.vat_number || ""),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  };

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Trash
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashedCustomers, setTrashedCustomers] = useState<Customer[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [trashLoading, setTrashLoading] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [permanentDeleteTargetIds, setPermanentDeleteTargetIds] = useState<string[]>([]);
  const [permanentDeleteLoading, setPermanentDeleteLoading] = useState(false);
  const [portalCustomer, setPortalCustomer] = useState<Customer | null>(null);
  // Dutch postcode auto-complete
  const handlePostcodeLookup = useCallback(async () => {
    const cleaned = (formData.postal_code || '').replace(/\s/g, '').toUpperCase();
    
    if (
      (formData.country === 'Nederland' || formData.country === 'NL') &&
      cleaned.length === 6 && 
      /^[1-9][0-9]{3}[A-Z]{2}$/.test(cleaned)
    ) {
      const lookupKey = cleaned;
      
      if (lookupKey !== lastLookup) {
        setLastLookup(lookupKey);
        const result = await lookupPostcode(cleaned);
        
        if (result) {
          const updates: Partial<typeof formData> = {};
          if (result.street && !formData.address) {
            updates.address = result.street;
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

  useEffect(() => {
    fetchCustomers();
    fetchTrashCount();
  }, []);

  const fetchCustomers = async () => {
    try {
      // customers_secure view doesn't expose deleted_at, so we filter active only via is_active
      const { data, error } = await supabase
        .from("customers_secure")
        .select("id, company_name, contact_name, email, phone, address, postal_code, city, country, vat_number, notes, is_active, user_id")
        .eq("is_active", true)
        .order("company_name");

      if (error) throw error;
      setCustomers((data || []) as unknown as Customer[]);
    } catch {
      toast({ title: "Fout bij ophalen klanten", variant: "destructive" });
    } finally {
      setLoading(false);
    }
    setSelectedIds(new Set());
  };

  const fetchTrashCount = async () => {
    if (!company?.id) return;
    const { count } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", company.id)
      .not("deleted_at", "is", null);
    setTrashCount(count || 0);
  };

  const fetchTrashedCustomers = async () => {
    if (!company?.id) return;
    setTrashLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("id, company_name, contact_name, email, phone, city, deleted_at")
      .eq("tenant_id", company.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (!error) {
      setTrashedCustomers((data as unknown as Customer[]) || []);
    }
    setTrashLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      toast({ title: "Bedrijfsnaam is verplicht", variant: "destructive" });
      return;
    }

    if (!validateCustomerForm()) {
      toast({ title: "Controleer de gemarkeerde velden", variant: "destructive" });
      return;
    }

    // Duplicate detection (only for new customers)
    if (!editingCustomer) {
      const { data: nameMatches } = await supabase
        .from("customers")
        .select("id, company_name")
        .ilike("company_name", formData.company_name.trim())
        .is("deleted_at", null)
        .limit(1);

      if (nameMatches && nameMatches.length > 0) {
        if (!window.confirm(`Er bestaat al een klant met de naam "${nameMatches[0].company_name}". Wil je doorgaan?`)) {
          return;
        }
      }

      if (formData.email?.trim()) {
        const { data: emailMatches } = await supabase
          .from("customers")
          .select("id, company_name, email")
          .eq("email", formData.email.trim())
          .is("deleted_at", null)
          .limit(1);

        if (emailMatches && emailMatches.length > 0) {
          if (!window.confirm(`Het e-mailadres "${formData.email}" is al in gebruik bij "${emailMatches[0].company_name}". Wil je doorgaan?`)) {
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      let customerId = editingCustomer?.id;
      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", editingCustomer.id);
        if (error) throw error;
        toast({ title: "Klant bijgewerkt" });
      } else {
        const { data: inserted, error } = await supabase
          .from("customers")
          .insert({ ...formData, tenant_id: company?.id })
          .select("id")
          .single();
        if (error) throw error;
        customerId = inserted?.id;
        toast({ title: "Klant aangemaakt" });
      }

      // Save customer-specific settings
      if (customerId) {
        const recipientsList = deliveryConfRecipients
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0);

        const { error: settingsError } = await supabase
          .from("customer_settings")
          .update({
            attach_documents_to_invoice: attachDocsOverride,
            checkout_mode: checkoutMode,
            delivery_confirmation_enabled: deliveryConfEnabled,
            delivery_confirmation_per_stop: deliveryConfPerStop,
            delivery_confirmation_recipients: recipientsList,
          } as any)
          .eq("customer_id", customerId);

        if (settingsError) {
          console.error('Customer settings save failed:', settingsError);
          toast({
            title: "Klantinstellingen opslaan mislukt",
            description: settingsError.message,
            variant: "destructive",
          });
        }
      }

      fetchCustomers();
      setDialogOpen(false);
    } catch (err: any) {
      toast({
        title: "Fout bij opslaan",
        description: err?.message || "Onbekende fout opgetreden",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (customer: Customer) => {
    setEditingCustomer(customer);
    setFieldErrors({});
    setFormData({
      company_name: customer.company_name,
      contact_name: customer.contact_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      postal_code: customer.postal_code,
      city: customer.city,
      country: customer.country,
      vat_number: customer.vat_number,
      notes: customer.notes,
    });
    const { data: cs } = await supabase
      .from("customer_settings")
      .select("attach_documents_to_invoice, checkout_mode, delivery_confirmation_enabled, delivery_confirmation_per_stop, delivery_confirmation_recipients")
      .eq("customer_id", customer.id)
      .maybeSingle();
    setAttachDocsOverride(cs?.attach_documents_to_invoice ?? null);
    setCheckoutMode((cs as any)?.checkout_mode ?? 'to_planning');
    setDeliveryConfEnabled((cs as any)?.delivery_confirmation_enabled ?? true);
    setDeliveryConfPerStop((cs as any)?.delivery_confirmation_per_stop ?? false);
    setDeliveryConfRecipients(((cs as any)?.delivery_confirmation_recipients || []).join(', '));
    setDialogOpen(true);
  };

  

  const handleDeleteRequest = async (customer: Customer) => {
    // Check linked orders
    const { count } = await supabase
      .from("trips")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .is("deleted_at", null);
    setDeleteOrderCount(count || 0);
    setDeleteTarget(customer);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: deleteOrderCount > 0 ? "Klant gearchiveerd (data blijft behouden)" : "Klant naar prullenbak verplaatst" });
      setDeleteTarget(null);
      setDeleteOrderCount(0);
      fetchCustomers();
      fetchTrashCount();
    } catch (err: any) {
      toast({ title: "Fout bij verwijderen", description: err?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // Bulk delete to trash
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
        .in("id", ids);
      if (error) throw error;
      toast({ title: `${ids.length} klant(en) naar prullenbak verplaatst` });
      fetchCustomers();
      fetchTrashCount();
    } catch (err: any) {
      toast({ title: "Fout bij verwijderen", description: err?.message, variant: "destructive" });
    } finally {
      setBulkDeleteLoading(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const handleRestore = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from("customers")
        .update({ deleted_at: null, is_active: true } as any)
        .in("id", ids);
      if (error) throw error;
      toast({ title: `${ids.length} klant(en) hersteld` });
      fetchCustomers();
      fetchTrashedCustomers();
      fetchTrashCount();
    } catch {
      toast({ title: "Fout bij herstellen", variant: "destructive" });
    }
  };

  const handlePermanentDeleteRequest = (ids: string[]) => {
    setPermanentDeleteTargetIds(ids);
    setPermanentDeleteDialogOpen(true);
  };

  const handlePermanentDeleteConfirm = async () => {
    setPermanentDeleteLoading(true);
    try {
      const { error } = await supabase.from("customers").delete().in("id", permanentDeleteTargetIds);
      if (error) throw error;
      toast({ title: `${permanentDeleteTargetIds.length} klant(en) definitief verwijderd` });
      fetchTrashedCustomers();
      fetchTrashCount();
    } catch (err: any) {
      toast({ title: "Fout bij definitief verwijderen", description: err?.message, variant: "destructive" });
    } finally {
      setPermanentDeleteLoading(false);
      setPermanentDeleteDialogOpen(false);
      setPermanentDeleteTargetIds([]);
    }
  };

  const openTrash = () => {
    fetchTrashedCustomers();
    setTrashOpen(true);
  };

  const isTestCustomer = (c: Customer) =>
    c.company_name?.toLowerCase().includes("test") ||
    (c.email && c.email.toLowerCase().endsWith("@ghevd8.nl"));

  const isIncomplete = (c: Customer) =>
    !c.email && !c.contact_name && !c.address;

  const filteredCustomers = customers
    .filter((c) =>
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((c) => !hideTestData || !isTestCustomer(c));

  const allSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
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

  const handleExportCSV = () => {
    const exportList = someSelected
      ? filteredCustomers.filter((c) => selectedIds.has(c.id))
      : filteredCustomers;
    if (exportList.length === 0) {
      toast({ title: "Geen klanten om te exporteren", variant: "destructive" });
      return;
    }
    const headers = ["Bedrijfsnaam", "Contactpersoon", "Email", "Telefoon", "Adres", "Postcode", "Stad", "Land", "BTW-nummer"];
    const rows = exportList.map((c) => [
      c.company_name,
      c.contact_name || "",
      c.email || "",
      c.phone || "",
      c.address || "",
      c.postal_code || "",
      c.city || "",
      c.country || "",
      c.vat_number || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klanten-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV gedownload", description: `${exportList.length} klant(en) geëxporteerd` });
  };

  const openNewDialog = () => {
    setEditingCustomer(null);
    setFormData(emptyCustomer);
    setFieldErrors({});
    setAttachDocsOverride(null);
    setCheckoutMode('to_planning');
    setDeliveryConfEnabled(true);
    setDeliveryConfPerStop(false);
    setDeliveryConfRecipients("");
    setDialogOpen(true);
  };

  return (
    <DashboardLayout title="Klanten">
      <div className="space-y-4 md:space-y-6 pb-24 md:pb-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Zoek klanten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-2xl backdrop-blur-xl bg-card/40 border-border/20 shadow-lg focus-visible:border-primary/40"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer whitespace-nowrap backdrop-blur-sm bg-card/30 border border-border/20 rounded-xl px-3 py-2">
              <Checkbox checked={hideTestData} onCheckedChange={(v) => setHideTestData(!!v)} />
              <span className="hidden sm:inline">Verberg test-data</span>
              <span className="sm:hidden">Test</span>
            </label>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2 shrink-0">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" onClick={openTrash} className="gap-2 relative shrink-0">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Prullenbak</span>
              {trashCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {trashCount}
                </Badge>
              )}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNewDialog} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuwe klant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? "Klant bewerken" : "Nieuwe klant"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Bedrijfsnaam *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_name">Contactpersoon</Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name || ""}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ""}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefoon</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (fieldErrors.phone) validateField("phone", e.target.value);
                        }}
                        onBlur={(e) => validateField("phone", e.target.value)}
                        className={fieldErrors.phone ? "border-destructive" : ""}
                      />
                      {fieldErrors.phone && (
                        <p className="text-xs text-destructive flex items-center gap-1">{fieldErrors.phone}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Adres (straat)</Label>
                      <Input
                        id="address"
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className={cn(autoFilled && "border-success/50 bg-success/5")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postcode</Label>
                      <div className="relative">
                        <Input
                          id="postal_code"
                          value={formData.postal_code || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, postal_code: e.target.value });
                            if (fieldErrors.postal_code) validateField("postal_code", e.target.value);
                          }}
                          onBlur={(e) => {
                            validateField("postal_code", e.target.value);
                            handlePostcodeBlur();
                          }}
                          placeholder="1234 AB"
                          className={cn(
                            autoFilled && !fieldErrors.postal_code && "border-success/50 bg-success/5",
                            fieldErrors.postal_code && "border-destructive"
                          )}
                        />
                        {postcodeLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {autoFilled && !postcodeLoading && !fieldErrors.postal_code && (
                          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                        )}
                      </div>
                      {fieldErrors.postal_code && (
                        <p className="text-xs text-destructive">{fieldErrors.postal_code}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Stad</Label>
                      <Input
                        id="city"
                        value={formData.city || ""}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className={cn(autoFilled && "border-success/50 bg-success/5")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Land</Label>
                      <Input
                        id="country"
                        value={formData.country || ""}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vat_number">BTW-nummer</Label>
                      <Input
                        id="vat_number"
                        value={formData.vat_number || ""}
                        onChange={(e) => {
                          setFormData({ ...formData, vat_number: e.target.value });
                          if (fieldErrors.vat_number) validateField("vat_number", e.target.value);
                        }}
                        onBlur={(e) => validateField("vat_number", e.target.value)}
                        placeholder="NL123456789B01"
                        className={fieldErrors.vat_number ? "border-destructive" : ""}
                      />
                      {fieldErrors.vat_number && (
                        <p className="text-xs text-destructive">{fieldErrors.vat_number}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes">Notities</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes || ""}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Document attachment setting */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <Label className="text-base font-semibold">Facturatie-instellingen</Label>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="attach_docs" className="cursor-pointer">Documenten meesturen met factuur</Label>
                        <p className="text-xs text-muted-foreground">
                          {attachDocsOverride === null
                            ? `Volgt standaard: ${tenantSettings?.attach_documents_to_invoice ? 'Aan' : 'Uit'}`
                            : attachDocsOverride ? 'Aan (klant-specifiek)' : 'Uit (klant-specifiek)'}
                        </p>
                      </div>
                      <Switch
                        id="attach_docs"
                        checked={attachDocsOverride ?? tenantSettings?.attach_documents_to_invoice ?? false}
                        onCheckedChange={(checked) => setAttachDocsOverride(checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="checkout_mode" className="cursor-pointer">Checkout modus</Label>
                        <p className="text-xs text-muted-foreground">
                          {checkoutMode === 'to_planning' ? 'Status gaat naar planning na checkout' : 'Directe aflevering na checkout'}
                        </p>
                      </div>
                      <Switch
                        id="checkout_mode"
                        checked={checkoutMode === 'direct_complete'}
                        onCheckedChange={(checked) => setCheckoutMode(checked ? 'direct_complete' : 'to_planning')}
                      />
                    </div>
                  </div>

                  {/* Delivery confirmation settings */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <Label className="text-base font-semibold">Afleverbevestiging</Label>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="delivery_conf" className="cursor-pointer">Afleverbevestiging inschakelen</Label>
                        <p className="text-xs text-muted-foreground">Stuur automatisch een bevestiging na aflevering</p>
                      </div>
                      <Switch
                        id="delivery_conf"
                        checked={deliveryConfEnabled}
                        onCheckedChange={setDeliveryConfEnabled}
                      />
                    </div>
                    {deliveryConfEnabled && (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="delivery_per_stop" className="cursor-pointer">Per stop bevestigen</Label>
                            <p className="text-xs text-muted-foreground">Stuur een bevestiging per individuele stop i.p.v. per rit</p>
                          </div>
                          <Switch
                            id="delivery_per_stop"
                            checked={deliveryConfPerStop}
                            onCheckedChange={setDeliveryConfPerStop}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="delivery_recipients">Extra ontvangers</Label>
                          <Input
                            placeholder="email1@example.com, email2@example.com"
                            value={deliveryConfRecipients}
                            onChange={(e) => setDeliveryConfRecipients(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Komma-gescheiden lijst van extra e-mailadressen</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 backdrop-blur-xl bg-card/60 rounded-2xl border border-border/20 shadow-xl"
          >
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedIds.size} geselecteerd</span>
            <div className="flex gap-2 ml-auto">
              {isAdmin && (
                <Button size="sm" variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Naar prullenbak</span>
                </Button>
              )}
            </div>
          </motion.div>
        )}

        <div className="rounded-2xl backdrop-blur-xl bg-card/50 border border-border/20 overflow-hidden shadow-lg">
          <div className="px-5 py-4 border-b border-border/20">
            <h2 className="text-xl font-bold tracking-tight">Klanten ({filteredCustomers.length})</h2>
          </div>
          <div className="md:p-6">
            {loading ? (
              <LoadingState message="Klanten laden..." />
            ) : filteredCustomers.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title={searchTerm ? "Geen klanten gevonden" : "Nog geen klanten"}
                description={searchTerm ? "Pas je zoekterm aan." : "Voeg je eerste klant toe om te beginnen."}
                action={!searchTerm ? { label: "Klant toevoegen", onClick: openNewDialog, icon: Plus } : undefined}
              />
            ) : (
              <>
                {/* Mobile card view with pull-to-refresh and swipe gestures */}
                <div className="md:hidden">
                  <PullToRefresh onRefresh={async () => { await fetchCustomers(); }}>
                    <div className="space-y-3 p-3">
                      {filteredCustomers.map((customer, i) => (
                        <SwipeableCard
                          key={customer.id}
                          leftActions={[swipeActions.more(() => handleEdit(customer))]}
                          rightActions={isAdmin ? [swipeActions.delete(() => handleDeleteRequest(customer))] : []}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                          <Card className="border-border/40 bg-gradient-to-br from-card to-muted/20 shadow-sm">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Checkbox
                                    checked={selectedIds.has(customer.id)}
                                    onCheckedChange={() => toggleSelect(customer.id)}
                                    className="flex-shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-semibold truncate">{customer.company_name}</p>
                                      {isTestCustomer(customer) && <Badge variant="destructive" size="sm">Test</Badge>}
                                      {isIncomplete(customer) && <Badge variant="warning" size="sm">Incompleet</Badge>}
                                    </div>
                                    {customer.contact_name && (
                                      <p className="text-sm text-muted-foreground truncate">{customer.contact_name}</p>
                                    )}
                                  </div>
                                </div>
                                {customer.user_id ? (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 flex-shrink-0">
                                    Portal ✓
                                  </Badge>
                                ) : null}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">Email</span>
                                  <p className="font-medium truncate">{customer.email || "—"}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Stad</span>
                                  <p className="font-medium">{customer.city || "—"}</p>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1 border-t border-border/30">
                                {!customer.user_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="min-h-[44px] gap-1.5 text-xs"
                                    onClick={() => setPortalCustomer(customer)}
                                  >
                                    <UserPlus className="h-3.5 w-3.5 text-primary" />
                                    Portal
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-[44px] gap-1.5 text-xs"
                                  onClick={() => setAuditCustomerId(customer.id)}
                                >
                                  <History className="h-3.5 w-3.5" />
                                  Historie
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-[44px] gap-1.5 text-xs"
                                  onClick={() => handleEdit(customer)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Bewerken
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="min-h-[44px] min-w-[44px] ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteRequest(customer)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                          </motion.div>
                        </SwipeableCard>
                      ))}
                    </div>
                  </PullToRefresh>
                </div>

                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                        </TableHead>
                        <TableHead>Bedrijf</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefoon</TableHead>
                        <TableHead>Stad</TableHead>
                        <TableHead>Portal</TableHead>
                        <TableHead className="w-[100px]">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(customer.id)}
                              onCheckedChange={() => toggleSelect(customer.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {customer.company_name}
                              {isTestCustomer(customer) && <Badge variant="destructive" size="sm">Test</Badge>}
                              {isIncomplete(customer) && <Badge variant="warning" size="sm">Incompleet</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{customer.contact_name || "—"}</TableCell>
                          <TableCell>{customer.email || "—"}</TableCell>
                          <TableCell>{customer.phone || "—"}</TableCell>
                          <TableCell>{customer.city || "—"}</TableCell>
                          <TableCell>
                            {customer.user_id ? (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                Actief
                              </Badge>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setPortalCustomer(customer)}>
                                <UserPlus className="h-3.5 w-3.5" />
                                Aanmaken
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setAuditCustomerId(customer.id)} title="Historie">
                                <History className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(customer)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Single delete confirm */}
        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Klant verwijderen"
          description={
            deleteOrderCount > 0
              ? `"${deleteTarget?.company_name}" heeft ${deleteOrderCount} order(s). De klant wordt gearchiveerd (data blijft behouden).`
              : `Weet je zeker dat je "${deleteTarget?.company_name}" wilt verwijderen? De klant wordt naar de prullenbak verplaatst en kan later hersteld worden.`
          }
          onConfirm={handleDelete}
          isLoading={deleting}
        />

        {/* Bulk delete confirm */}
        <DeleteConfirmDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title="Klanten verwijderen"
          description={`Weet je zeker dat je ${selectedIds.size} klant(en) naar de prullenbak wilt verplaatsen? Ze kunnen later hersteld worden.`}
          onConfirm={handleBulkDelete}
          isLoading={bulkDeleteLoading}
        />

        {/* Permanent delete confirm */}
        <DeleteConfirmDialog
          open={permanentDeleteDialogOpen}
          onOpenChange={setPermanentDeleteDialogOpen}
          title="Definitief verwijderen"
          description={`Weet je zeker dat je ${permanentDeleteTargetIds.length} klant(en) DEFINITIEF wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
          onConfirm={handlePermanentDeleteConfirm}
          isLoading={permanentDeleteLoading}
        />

        {/* Trash Dialog */}
        <Dialog open={trashOpen} onOpenChange={setTrashOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Prullenbak ({trashedCustomers.length})
              </DialogTitle>
            </DialogHeader>
            {trashLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : trashedCustomers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">De prullenbak is leeg</p>
            ) : (
              <div className="space-y-2">
                {trashedCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">{customer.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.city || "Geen stad"} • Verwijderd op{" "}
                        {customer.deleted_at
                          ? new Date(customer.deleted_at).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })
                          : "-"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRestore([customer.id])} className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" /> Herstellen
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="destructive" onClick={() => handlePermanentDeleteRequest([customer.id])} className="gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Definitief
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Audit Log Dialog */}
        <Dialog open={!!auditCustomerId} onOpenChange={(open) => !open && setAuditCustomerId(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Klant Historie</DialogTitle>
            </DialogHeader>
            {auditCustomerId && <CustomerAuditLogTab customerId={auditCustomerId} />}
          </DialogContent>
        </Dialog>

        {/* Customer Portal Dialog */}
        {portalCustomer && (
          <CreateCustomerPortalDialog
            open={!!portalCustomer}
            onOpenChange={(o) => !o && setPortalCustomer(null)}
            customerId={portalCustomer.id}
            customerName={portalCustomer.company_name}
            customerEmail={portalCustomer.email}
            onSuccess={fetchCustomers}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Customers;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  Sparkles,
  CheckCircle2,
  Mail,
  MoreHorizontal,
  ChevronDown,
  Bell,
  Paperclip,
  Receipt,
  Clock,
  AlertTriangle,
  Euro,
  CreditCard,
  Circle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoiceAgingBadge } from "@/components/invoices/InvoiceAgingBadge";
import { PaymentRegistrationModal } from "@/components/invoices/PaymentRegistrationModal";
import { SendReminderDialog } from "@/components/invoices/SendReminderDialog";
import { ExactOnlineSyncButton } from "@/components/invoices/ExactOnlineSyncButton";
import { InvoiceBulkActionsBar } from "@/components/invoices/InvoiceBulkActionsBar";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceLine = Database["public"]["Tables"]["invoice_lines"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

interface InvoiceWithCustomer extends Invoice {
  customers: Customer | null;
}

// Framer Motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { 
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
  }
};

const mobileCardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }
};

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCustomer | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<InvoiceWithCustomer | null>(null);
  
  const [selectedInvoices, setSelectedInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [invoiceForReminder, setInvoiceForReminder] = useState<InvoiceWithCustomer | null>(null);
  
  const [customerDocSettings, setCustomerDocSettings] = useState<Record<string, boolean | null>>({});
  const [tenantAttachDocs, setTenantAttachDocs] = useState<boolean>(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [demoInvoices, setDemoInvoices] = useState<InvoiceWithCustomer[]>([]);
  const [selectedDemoIds, setSelectedDemoIds] = useState<Set<string>>(new Set());
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  const { toast } = useToast();

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, customers(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvoices(data as InvoiceWithCustomer[]);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({ title: "Fout bij ophalen facturen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceLines = async (invoiceId: string) => {
    const { data } = await supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("created_at");
    setInvoiceLines(data || []);
  };

  useEffect(() => { fetchInvoices(); }, []);

  // Realtime: auto-refresh when invoices table changes
  useEffect(() => {
    const channel = supabase
      .channel(`admin-invoices-realtime-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch tenant settings + customer doc override settings when invoices load
  useEffect(() => {
    const fetchDocSettings = async () => {
      const { data: tenantData } = await supabase
        .from("tenant_settings")
        .select("attach_documents_to_invoice")
        .limit(1)
        .maybeSingle();
      if (tenantData) setTenantAttachDocs(tenantData.attach_documents_to_invoice ?? false);

      const customerIds = [...new Set(invoices.map(i => i.customer_id).filter(Boolean))] as string[];
      if (customerIds.length === 0) return;

      const { data: csData } = await supabase
        .from("customer_settings")
        .select("customer_id, attach_documents_to_invoice")
        .in("customer_id", customerIds);

      const map: Record<string, boolean | null> = {};
      csData?.forEach(cs => { map[cs.customer_id] = cs.attach_documents_to_invoice; });
      setCustomerDocSettings(map);
    };
    if (invoices.length > 0) fetchDocSettings();
  }, [invoices]);

  const getDocOverride = (customerId: string | null) => {
    if (!customerId) return null;
    const customerVal = customerDocSettings[customerId];
    if (customerVal === null || customerVal === undefined) return null;
    if (customerVal === tenantAttachDocs) return null;
    return customerVal;
  };

  const handleView = (invoice: InvoiceWithCustomer) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleDeleteClick = (id: string) => { setInvoiceToDelete(id); setDeleteDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    try {
      // Server-side guard: alleen concept-facturen mogen verwijderd worden
      const { data: inv } = await supabase
        .from("invoices")
        .select("status")
        .eq("id", invoiceToDelete)
        .single();

      if (inv?.status !== "concept") {
        toast({ title: "Alleen concept-facturen kunnen verwijderd worden", variant: "destructive" });
        setDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        return;
      }

      await supabase.from("invoice_lines").delete().eq("invoice_id", invoiceToDelete);
      // Double guard: .eq("status", "concept") voorkomt race conditions
      await supabase.from("invoices").delete().eq("id", invoiceToDelete).eq("status", "concept");
      toast({ title: "Factuur verwijderd" });
      fetchInvoices();
    } catch (error) {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  // Demo invoices cleanup
  const handleOpenCleanup = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

    const candidates = invoices.filter(inv => {
      const isDemo = (inv.status === "concept" || inv.status === "vervallen") && !inv.sent_at;
      const isOld = inv.invoice_date && inv.invoice_date < cutoff;
      return isDemo && isOld;
    });

    if (candidates.length === 0) {
      toast({ title: "Geen demo facturen gevonden", description: "Er zijn geen oude concept/vervallen facturen zonder verzenddatum." });
      return;
    }

    setDemoInvoices(candidates);
    setSelectedDemoIds(new Set(candidates.map(i => i.id)));
    setCleanupDialogOpen(true);
  };

  const handleCleanupConfirm = async () => {
    if (selectedDemoIds.size === 0) return;
    setIsCleaningUp(true);
    try {
      const ids = Array.from(selectedDemoIds);
      const conceptIds = demoInvoices.filter(i => selectedDemoIds.has(i.id) && i.status === "concept").map(i => i.id);
      const vervallenIds = demoInvoices.filter(i => selectedDemoIds.has(i.id) && i.status === "vervallen").map(i => i.id);

      if (conceptIds.length > 0) {
        await supabase.from("invoice_lines").delete().in("invoice_id", conceptIds);
        await supabase.from("invoices").delete().in("id", conceptIds).eq("status", "concept");
      }

      if (vervallenIds.length > 0) {
        await supabase.from("invoices").update({ status: "geannuleerd" }).in("id", vervallenIds);
      }

      toast({ title: `${ids.length} facturen opgeruimd`, description: `${conceptIds.length} verwijderd, ${vervallenIds.length} gearchiveerd` });
      fetchInvoices();
    } catch (error) {
      toast({ title: "Fout bij opruimen", variant: "destructive" });
    } finally {
      setIsCleaningUp(false);
      setCleanupDialogOpen(false);
      setDemoInvoices([]);
      setSelectedDemoIds(new Set());
    }
  };

  const handleDownloadPdf = async (invoice: InvoiceWithCustomer) => {
    try {
      toast({ title: "PDF wordt gegenereerd..." });
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", { body: { invoiceId: invoice.id } });
      if (error) throw error;
      if (!data?.pdf) throw new Error("Geen PDF data ontvangen");

      const binaryString = atob(data.pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Factuur-${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF gedownload" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "PDF genereren mislukt", description: "Probeer het opnieuw of neem contact op met support.", variant: "destructive" });
    }
  };

  const handlePaymentClick = (invoice: InvoiceWithCustomer) => { setInvoiceForPayment(invoice); setPaymentModalOpen(true); };
  const handleSendEmail = (invoice: InvoiceWithCustomer) => { navigate(`/invoices/${invoice.id}/send`); };
  const handleReminderClick = (invoice: InvoiceWithCustomer) => { 
    setInvoiceForReminder(invoice); 
    setReminderDialogOpen(true); 
  };

  const isOverdue = (invoice: InvoiceWithCustomer) => {
    if (invoice.status === "betaald") return false;
    const dueDate = new Date(invoice.due_date);
    return dueDate < new Date();
  };

  const toggleSelectInvoice = (invoice: InvoiceWithCustomer) => {
    setSelectedInvoices(prev => {
      const isSelected = prev.some(inv => inv.id === invoice.id);
      if (isSelected) return prev.filter(inv => inv.id !== invoice.id);
      return [...prev, invoice];
    });
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices([...filteredInvoices]);
    }
  };

  const isSelected = (invoiceId: string) => selectedInvoices.some(inv => inv.id === invoiceId);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || inv.customers?.company_name?.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "vervallen") return matchesSearch && isOverdue(inv);
    if (statusFilter === "openstaand") return matchesSearch && (inv.status === "concept" || inv.status === "verzonden");
    return matchesSearch && inv.status === statusFilter;
  });

  const overdueCount = invoices.filter(isOverdue).length;

  const stats = {
    total: invoices.length,
    openstaand: invoices.filter(i => i.status === "concept" || i.status === "verzonden").length,
    betaald: invoices.filter(i => i.status === "betaald").length,
    vervallen: overdueCount,
    totalAmount: invoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
  };

  const kpiCards = [
    { id: "total", label: "Totaal", value: stats.total, icon: Receipt, color: "primary", ringClass: "ring-primary", hoverRing: "hover:ring-primary", iconBg: "bg-primary/10", iconColor: "text-primary", filter: "all" },
    { id: "openstaand", label: "Openstaand", value: stats.openstaand, icon: Clock, color: "amber", ringClass: "ring-amber-500", hoverRing: "hover:ring-amber-500", iconBg: "bg-amber-500/10", iconColor: "text-amber-500", filter: "openstaand" },
    { id: "vervallen", label: "Verlopen", value: stats.vervallen, icon: AlertTriangle, color: "red", ringClass: "ring-destructive", hoverRing: "hover:ring-destructive", iconBg: "bg-destructive/10", iconColor: "text-destructive", filter: "vervallen", pulse: stats.vervallen > 0 },
    { id: "betaald", label: "Betaald", value: stats.betaald, icon: CheckCircle2, color: "emerald", ringClass: "ring-emerald-500", hoverRing: "hover:ring-emerald-500", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", filter: "betaald" },
    { id: "waarde", label: "Totale waarde", value: `€${stats.totalAmount.toLocaleString("nl-NL", { minimumFractionDigits: 0 })}`, icon: Euro, color: "primary", ringClass: "ring-primary", hoverRing: "hover:ring-primary", iconBg: "bg-primary/10", iconColor: "text-primary", filter: null },
  ];

  return (
    <DashboardLayout title="Facturen">
      <div className="space-y-4 sm:space-y-6">
        {/* KPI Cards - Premium Animated */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
        >
          {kpiCards.map((kpi) => (
            <motion.div key={kpi.id} variants={itemVariants} className="h-full">
              <Card 
                className={cn(
                  "relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-2xl shadow-lg transition-all duration-300 group h-full",
                  kpi.filter !== null && "cursor-pointer",
                  kpi.filter !== null && `${kpi.hoverRing} hover:ring-2`,
                  statusFilter === kpi.filter && `ring-2 ${kpi.ringClass}`,
                  kpi.pulse && "ring-2 ring-destructive/30 ring-offset-1 ring-offset-background"
                )}
                onClick={() => kpi.filter !== null && setStatusFilter(kpi.filter)}
              >
                {/* Mesh gradient overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                {/* Shimmer sweep */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'linear', repeatDelay: 2 }}
                />
                <CardContent className="relative p-3 sm:p-5 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{kpi.label}</span>
                    <div className={cn(
                      "p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform duration-300",
                      kpi.iconBg
                    )}>
                      <kpi.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", kpi.iconColor)} />
                    </div>
                  </div>
                  <div className={cn(
                    "text-xl sm:text-2xl font-bold tracking-tight tabular-nums",
                    kpi.id === "vervallen" && stats.vervallen > 0 && "text-destructive",
                    kpi.id === "betaald" && "text-emerald-600 dark:text-emerald-400",
                    kpi.id === "waarde" && "text-primary"
                  )}>
                    {kpi.value}
                  </div>
                  <div className="min-h-[20px] sm:min-h-[24px] mt-auto" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters & Actions */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex flex-1 gap-3 flex-col sm:flex-row">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Zoek..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 text-base" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" />Alle</span>
                </SelectItem>
                <SelectItem value="concept">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-400" />Concept</span>
                </SelectItem>
                <SelectItem value="verzonden">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />Verzonden</span>
                </SelectItem>
                <SelectItem value="vervallen">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-destructive" />Vervallen</span>
                </SelectItem>
                <SelectItem value="betaald">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Betaald</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="btn-premium w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Nieuwe factuur<ChevronDown className="ml-2 h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/invoices/new")}><Sparkles className="mr-2 h-4 w-4 text-primary" /><div><p className="font-medium">Batch Facturatie</p><p className="text-xs text-muted-foreground">Automatisch uit orders</p></div></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/invoices/new?tab=manual")}><FileText className="mr-2 h-4 w-4" /><div><p className="font-medium">Losse Factuur</p><p className="text-xs text-muted-foreground">Handmatig aanmaken</p></div></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        {/* Desktop Table */}
        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="hidden md:block">
          <Card className="relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-lg">
            <CardContent className="relative p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={filteredInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecteer alles"
                      />
                    </TableHead>
                    <TableHead>Factuurnummer</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-16">Exact</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12"><div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12"><FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" /><p className="text-muted-foreground">Geen facturen gevonden</p></TableCell></TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow 
                        key={invoice.id} 
                        className={cn(
                          "transition-colors duration-200 hover:bg-primary/[0.03] cursor-pointer",
                          isSelected(invoice.id) && "bg-primary/5"
                        )}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected(invoice.id)}
                            onCheckedChange={() => toggleSelectInvoice(invoice)}
                            aria-label={`Selecteer ${invoice.invoice_number}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5">
                            {invoice.customers?.company_name || "-"}
                            {(() => {
                              const override = getDocOverride(invoice.customer_id);
                              if (override === null) return null;
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {override ? (
                                        <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                                      ) : (
                                        <span className="relative shrink-0 inline-flex">
                                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="absolute inset-0 flex items-center justify-center">
                                            <span className="w-[1px] h-5 bg-destructive rotate-45 block" />
                                          </span>
                                        </span>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent side="top" variant="default" size="sm">
                                      {override
                                        ? "Documenten worden bijgevoegd (klant-override)"
                                        : "Documenten niet bijgevoegd (klant-override)"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })()}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString("nl-NL")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <InvoiceStatusBadge status={invoice.status} sentAt={invoice.sent_at} isManual={invoice.is_manual ?? false} isOverdue={isOverdue(invoice)} />
                            <InvoiceAgingBadge dueDate={invoice.due_date} status={invoice.status} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  {(invoice as any).exact_online_id ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" variant="default" size="sm">
                                {(invoice as any).exact_online_id ? "Gesynchroniseerd met Exact Online" : "Nog niet gesynchroniseerd"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          €{Number(invoice.total_amount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(invoice)}><Eye className="mr-2 h-4 w-4" />Bekijken</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadPdf(invoice)}><Download className="mr-2 h-4 w-4" />Download PDF</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendEmail(invoice)}><Mail className="mr-2 h-4 w-4" />E-mailen</DropdownMenuItem>
                              {invoice.status !== "betaald" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleReminderClick(invoice)}>
                                    <Bell className="mr-2 h-4 w-4 text-amber-500" />
                                    Herinnering sturen
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePaymentClick(invoice)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                                    Betaling registreren
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                                    <CreditCard className="mr-2 h-4 w-4 text-blue-500" />
                                    iDEAL betaallink
                                  </DropdownMenuItem>
                                </>
                              )}
                              {invoice.status === "concept" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteClick(invoice.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Verwijderen
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mobile Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="md:hidden space-y-3"
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="font-medium text-muted-foreground">Geen facturen gevonden</p>
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((invoice, index) => {
              const overdue = isOverdue(invoice);
              return (
                <motion.div
                  key={invoice.id}
                  variants={mobileCardVariants}
                  whileTap={{ scale: 0.98 }}
                  className="touch-manipulation"
                >
                  <Card 
                    className={cn(
                      "relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-md transition-all duration-200 cursor-pointer",
                      isSelected(invoice.id) && "ring-2 ring-primary/50",
                      overdue && "border-destructive/30"
                    )}
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    {/* Payment status indicator */}
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
                      invoice.status === "betaald" ? "bg-emerald-500" :
                      overdue ? "bg-destructive" :
                      "bg-amber-500"
                    )} />
                    
                    <CardContent className="p-0 pl-2">
                      {/* Header */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/30">
                        <Checkbox 
                          checked={isSelected(invoice.id)}
                          onCheckedChange={() => toggleSelectInvoice(invoice)}
                          aria-label={`Selecteer ${invoice.invoice_number}`}
                        />
                        <span className="font-semibold text-sm flex-1">{invoice.invoice_number}</span>
                        <div className="flex items-center gap-1.5">
                          <InvoiceStatusBadge status={invoice.status} sentAt={invoice.sent_at} isManual={invoice.is_manual ?? false} isOverdue={overdue} />
                          <InvoiceAgingBadge dueDate={invoice.due_date} status={invoice.status} />
                        </div>
                      </div>

                      {/* Body */}
                      <div className="px-3 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground truncate max-w-[60%]">
                            {invoice.customers?.company_name || "-"}
                          </span>
                          <span className="font-bold text-base tabular-nums text-emerald-600 dark:text-emerald-400">
                            €{Number(invoice.total_amount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(invoice.invoice_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between px-2 py-1 border-t border-border/30 bg-muted/20">
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs gap-1.5 rounded-lg" onClick={() => handleView(invoice)}>
                            <Eye className="h-3.5 w-3.5" />Bekijk
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs gap-1.5 rounded-lg" onClick={() => handleSendEmail(invoice)}>
                            <Mail className="h-3.5 w-3.5" />Mail
                          </Button>
                          <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs gap-1.5 rounded-lg" onClick={() => handleDownloadPdf(invoice)}>
                            <Download className="h-3.5 w-3.5" />PDF
                          </Button>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.status !== "betaald" && (
                              <>
                                <DropdownMenuItem onClick={() => handleReminderClick(invoice)}>
                                  <Bell className="mr-2 h-4 w-4 text-amber-500" />Herinnering
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePaymentClick(invoice)}>
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />Betaling
                                </DropdownMenuItem>
                              </>
                            )}
                            {invoice.status === "concept" && (
                              <DropdownMenuItem onClick={() => handleDeleteClick(invoice.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Verwijderen
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* View Sheet (Premium slide-in) */}
        <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
          <SheetContent side="right" variant="premium" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border/30">
              <SheetTitle className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                Factuur {selectedInvoice?.invoice_number}
              </SheetTitle>
              <SheetDescription>
                {selectedInvoice?.customers?.company_name}
              </SheetDescription>
            </SheetHeader>
            {selectedInvoice && (
              <div className="space-y-5 mt-5">
                {/* Invoice Info */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Klant</p>
                    <p className="font-medium text-sm">{selectedInvoice.customers?.company_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                    <div className="flex items-center gap-1.5">
                      <InvoiceStatusBadge status={selectedInvoice.status} sentAt={selectedInvoice.sent_at} isManual={selectedInvoice.is_manual ?? false} isOverdue={isOverdue(selectedInvoice)} />
                      <InvoiceAgingBadge dueDate={selectedInvoice.due_date} status={selectedInvoice.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Factuurdatum</p>
                    <p className="font-medium text-sm">{new Date(selectedInvoice.invoice_date).toLocaleDateString("nl-NL")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Vervaldatum</p>
                    <p className="font-medium text-sm">{new Date(selectedInvoice.due_date).toLocaleDateString("nl-NL")}</p>
                  </div>
                </div>

                {/* Invoice Lines */}
                <div className="rounded-xl border border-border/30 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Omschrijving</TableHead>
                        <TableHead className="text-right">Aantal</TableHead>
                        <TableHead className="text-right">Prijs</TableHead>
                        <TableHead className="text-right">Totaal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="text-sm">{line.description}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{line.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">€{Number(line.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums text-sm">€{Number(line.total_price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Total */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Totaal</span>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      €{Number(selectedInvoice.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsViewSheetOpen(false)}>Sluiten</Button>
                  <Button className="btn-premium flex-1" onClick={() => handleDownloadPdf(selectedInvoice)}>
                    <Download className="mr-2 h-4 w-4" />PDF
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Payment Modal */}
        {invoiceForPayment && (
          <PaymentRegistrationModal 
            invoice={{ 
              id: invoiceForPayment.id, 
              invoice_number: invoiceForPayment.invoice_number, 
              total_amount: Number(invoiceForPayment.total_amount), 
              customer_id: invoiceForPayment.customer_id || "" 
            }} 
            open={paymentModalOpen} 
            onOpenChange={setPaymentModalOpen} 
            onSuccess={fetchInvoices} 
          />
        )}

        {/* Reminder Dialog */}
        <SendReminderDialog
          invoice={invoiceForReminder ? {
            id: invoiceForReminder.id,
            invoice_number: invoiceForReminder.invoice_number,
            total_amount: Number(invoiceForReminder.total_amount),
            due_date: invoiceForReminder.due_date,
            status: invoiceForReminder.status,
            reminder_count: invoiceForReminder.reminder_count ?? undefined,
            customers: invoiceForReminder.customers ? {
              company_name: invoiceForReminder.customers.company_name ?? undefined,
              email: invoiceForReminder.customers.email ?? undefined,
              phone: invoiceForReminder.customers.phone ?? undefined,
            } : undefined,
          } : null}
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          onSuccess={() => {
            fetchInvoices();
            setInvoiceForReminder(null);
          }}
        />

        {/* Bulk Actions Bar */}
        <InvoiceBulkActionsBar
          selectedInvoices={selectedInvoices.map(inv => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            status: inv.status,
            total_amount: Number(inv.total_amount),
            customers: inv.customers ? {
              company_name: inv.customers.company_name ?? undefined,
              email: inv.customers.email ?? undefined,
              phone: inv.customers.phone ?? undefined,
            } : undefined,
          }))}
          onClearSelection={() => setSelectedInvoices([])}
          onRefresh={fetchInvoices}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Factuur verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze factuur wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Invoices;

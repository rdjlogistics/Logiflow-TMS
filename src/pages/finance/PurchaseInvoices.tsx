import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
  TableSkeleton,
} from "@/components/ui/table";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Eye,
  FileText,
  CreditCard,
  Truck,
  Ban,
  Mail,
  MailCheck,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { PurchaseInvoiceStatusDropdown } from "@/components/purchase-invoices/PurchaseInvoiceStatusDropdown";
import { PurchaseInvoiceBulkActions } from "@/components/purchase-invoices/PurchaseInvoiceBulkActions";
import { PaymentRegistrationModal } from "@/components/purchase-invoices/PaymentRegistrationModal";
import { InvoiceAgingBadge } from "@/components/invoices/InvoiceAgingBadge";
import { usePurchaseInvoicePdf } from "@/hooks/use-purchase-invoice-pdf";
import { isInvoiceOverdue, getPaymentStatusColor, getPaymentStatusClasses, getDueDateCellClasses } from "@/lib/purchase-invoice-helpers";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

type PurchaseInvoiceStatus = "concept" | "definitief" | "verzonden" | "ontvangen" | "goedgekeurd" | "betaald" | "betwist";

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  carrier_id: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: PurchaseInvoiceStatus;
  sent_at: string | null;
  external_invoice_number: string | null;
  external_invoice_amount: number | null;
  amount_difference: number | null;
  is_self_billing: boolean;
  paid_at: string | null;
  carriers: {
    id: string;
    company_name: string;
    email?: string;
    phone?: string;
    iban?: string | null;
    bic?: string | null;
  } | null;
}

const PurchaseInvoices = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const { isGenerating, downloadPdf } = usePurchaseInvoicePdf();

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ["purchase-invoices", statusFilter, carrierFilter],
    queryFn: async () => {
      let query = supabase
        .from("purchase_invoices")
        .select(`
          id, invoice_number, invoice_date, due_date, carrier_id,
          subtotal, vat_amount, total_amount, status, sent_at,
          external_invoice_number, external_invoice_amount, amount_difference,
          is_self_billing, paid_at,
          carriers(id, company_name, email, phone, iban, bic)
        `)
        .order("invoice_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (carrierFilter !== "all") {
        query = query.eq("carrier_id", carrierFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PurchaseInvoice[];
    },
  });

  const { data: carriers } = useQuery({
    queryKey: ["carriers-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carriers")
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const overdueInvoices = invoices?.filter(isInvoiceOverdue) || [];
  
  const kpis = {
    total: invoices?.length || 0,
    openstaand: invoices?.filter((i) => ["concept", "definitief", "verzonden", "ontvangen"].includes(i.status)).reduce((sum, i) => sum + Number(i.total_amount), 0) || 0,
    betaald: invoices?.filter((i) => i.status === "betaald").reduce((sum, i) => sum + Number(i.total_amount), 0) || 0,
    betwist: invoices?.filter((i) => i.status === "betwist").length || 0,
    verschil: invoices?.filter((i) => i.amount_difference && Math.abs(Number(i.amount_difference)) > 0).length || 0,
    verlopen: overdueInvoices.length,
    verlopenBedrag: overdueInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
  };

  const filteredInvoices = invoices?.filter((invoice) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.carriers?.company_name?.toLowerCase().includes(searchLower) ||
      invoice.external_invoice_number?.toLowerCase().includes(searchLower);
    
    if (statusFilter === "verlopen") return matchesSearch && isInvoiceOverdue(invoice);
    if (statusFilter === "openstaand") return matchesSearch && ["concept", "definitief", "verzonden", "ontvangen"].includes(invoice.status);
    if (statusFilter === "verschil") return matchesSearch && invoice.amount_difference && Math.abs(Number(invoice.amount_difference)) > 0;
    
    return matchesSearch;
  });

  const selectedInvoices = filteredInvoices?.filter((i) => selectedIds.has(i.id)) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices?.map((i) => i.id) || []));
    }
  };

  const kpiCards = [
    { id: "total", label: "Totaal", value: kpis.total, icon: Receipt, iconBg: "bg-primary/10", iconColor: "text-primary", ringClass: "ring-primary", hoverRing: "hover:ring-primary", filter: "all" },
    { id: "openstaand", label: "Openstaand", value: formatCurrency(kpis.openstaand), icon: Clock, iconBg: "bg-amber-500/10", iconColor: "text-amber-500", ringClass: "ring-amber-500", hoverRing: "hover:ring-amber-500", filter: "openstaand" },
    { id: "betaald", label: "Betaald", value: formatCurrency(kpis.betaald), icon: CheckCircle2, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", ringClass: "ring-emerald-500", hoverRing: "hover:ring-emerald-500", filter: "betaald" },
    { id: "verlopen", label: "Verlopen", value: kpis.verlopen, icon: CalendarClock, iconBg: "bg-destructive/10", iconColor: "text-destructive", ringClass: "ring-destructive", hoverRing: "hover:ring-destructive", filter: "verlopen", pulse: kpis.verlopen > 0 },
    { id: "betwist", label: "Betwist", value: kpis.betwist, icon: Ban, iconBg: "bg-destructive/10", iconColor: "text-destructive", ringClass: "ring-destructive", hoverRing: "hover:ring-destructive", filter: "betwist" },
    { id: "verschil", label: "Verschil", value: kpis.verschil, icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500", ringClass: "ring-orange-500", hoverRing: "hover:ring-orange-500", filter: "verschil" },
  ];

  return (
    <DashboardLayout title="Inkoopfacturen">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inkoopfacturen</h1>
            <p className="text-sm text-muted-foreground">Beheer inkoopfacturen van charters</p>
          </div>
          <Button asChild className="gap-2 w-full sm:w-auto">
            <Link to="/purchase-invoices/new">
              <Plus className="h-4 w-4" />
              <span className="sm:inline">Nieuwe Inkoopfactuur</span>
            </Link>
          </Button>
        </div>

        {/* KPI Cards - Premium Animated */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          {kpiCards.map((kpi) => (
            <div key={kpi.id} variants={itemVariants} className="h-full">
              <Card 
                className={cn(
                  "relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-lg cursor-pointer transition-all duration-300 group h-full",
                  `${kpi.hoverRing} hover:ring-2`,
                  statusFilter === kpi.filter && `ring-2 ${kpi.ringClass}`,
                  kpi.pulse && "ring-2 ring-destructive/30 ring-offset-1 ring-offset-background"
                )}
                onClick={() => setStatusFilter(statusFilter === kpi.filter && kpi.filter !== "all" ? "all" : kpi.filter)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03]" />
                <CardContent className="relative p-3 sm:p-4 h-full flex flex-col">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn(
                      "p-1.5 sm:p-2 rounded-xl group-hover:scale-110 transition-transform duration-300",
                      kpi.iconBg
                    )}>
                      <kpi.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", kpi.iconColor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpi.label}</p>
                      <p className={cn(
                        "text-base sm:text-xl font-bold truncate tabular-nums",
                        kpi.id === "verlopen" && kpis.verlopen > 0 && "text-destructive",
                        kpi.id === "betaald" && "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {kpi.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div variants={itemVariants} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-card/90 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Zoek op factuurnummer, charter..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 text-base" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">
                      <span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" />Alle statussen</span>
                    </SelectItem>
                    <div className="h-px bg-border my-1" />
                    <SelectItem value="concept"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-slate-400" />Concept</span></SelectItem>
                    <SelectItem value="definitief"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Definitief</span></SelectItem>
                    <SelectItem value="verzonden"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-indigo-500" />Verzonden</span></SelectItem>
                    <SelectItem value="ontvangen"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Ontvangen</span></SelectItem>
                    <SelectItem value="goedgekeurd"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-cyan-500" />Goedgekeurd</span></SelectItem>
                    <SelectItem value="betaald"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Betaald</span></SelectItem>
                    <SelectItem value="betwist"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-destructive" />Betwist</span></SelectItem>
                    <div className="h-px bg-border my-1" />
                    <SelectItem value="openstaand"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Openstaand</span></SelectItem>
                    <SelectItem value="verschil"><span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-orange-500" />Verschil</span></SelectItem>
                    <SelectItem value="verlopen" className="text-destructive font-medium">
                      <span className="flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />Verlopen</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                   <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Charter" /></SelectTrigger>
                   <SelectContent className="bg-background">
                     <SelectItem value="all">Alle charters</SelectItem>
                     {carriers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table - Desktop */}
        <div variants={itemVariants} initial="hidden" animate="visible" className="hidden md:block">
          <Card className="border-border/40 bg-card/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"><Checkbox checked={selectedIds.size === filteredInvoices?.length && (filteredInvoices?.length ?? 0) > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead>Factuurnummer</TableHead>
                    <TableHead>Charter</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Verloopdatum</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gemaild</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <TableSkeleton rows={5} columns={9} /> : !filteredInvoices?.length ? (
                    <TableEmpty icon={<Receipt className="h-8 w-8 text-muted-foreground" />} title="Geen inkoopfacturen" description="Maak een nieuwe batch aan" colSpan={9} />
                  ) : filteredInvoices.map((invoice) => {
                    const paymentColor = getPaymentStatusColor(invoice);
                    
                    return (
                      <TableRow 
                        key={invoice.id} 
                        className="group cursor-pointer transition-colors duration-200 hover:bg-primary/[0.03]"
                        onClick={() => navigate(`/purchase-invoices/${invoice.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(invoice.id)} onCheckedChange={() => toggleSelect(invoice.id)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", getPaymentStatusClasses(paymentColor))} />
                            <span className="font-medium">{invoice.invoice_number}</span>
                            {invoice.is_self_billing && <Badge variant="outline" className="text-xs">Self-billing</Badge>}
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />{invoice.carriers?.company_name || 'Onbekend charter'}</div></TableCell>
                        <TableCell>{format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}</TableCell>
                        <TableCell>
                          {invoice.due_date ? (
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium",
                                getDueDateCellClasses(paymentColor)
                              )}>
                                <CalendarClock className="h-3 w-3" />
                                {format(new Date(invoice.due_date), "d MMM yyyy", { locale: nl })}
                              </span>
                              <InvoiceAgingBadge dueDate={invoice.due_date} status={invoice.status} />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(Number(invoice.total_amount))}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <PurchaseInvoiceStatusDropdown invoiceId={invoice.id} currentStatus={invoice.status} />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link to={`/purchase-invoices/${invoice.id}/send`} className="inline-flex">
                                {invoice.sent_at ? (
                                  <MailCheck className="h-4 w-4 text-emerald-500 hover:text-emerald-600 transition-colors" />
                                ) : (
                                  <Mail className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                )}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {invoice.sent_at 
                                ? `Verstuurd op ${format(new Date(invoice.sent_at), "d MMMM yyyy", { locale: nl })}`
                                : "Nog niet verstuurd - klik om te versturen"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-background">
                              <DropdownMenuItem asChild><Link to={`/purchase-invoices/${invoice.id}`} className="flex items-center gap-2"><Eye className="h-4 w-4" />Bekijken</Link></DropdownMenuItem>
                              <DropdownMenuItem asChild><Link to={`/purchase-invoices/${invoice.id}/send`} className="flex items-center gap-2"><Mail className="h-4 w-4" />Verstuur e-mail</Link></DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadPdf(invoice.id, invoice.invoice_number)} disabled={isGenerating} className="flex items-center gap-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Download PDF</DropdownMenuItem>
                              {invoice.status !== "betaald" && <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setPaymentModalOpen(true); }} className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Betaling</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div
          className="md:hidden space-y-3"
        >
          {isLoading ? (
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
          ) : !filteredInvoices?.length ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-muted-foreground">Geen inkoopfacturen</p>
                <p className="text-sm text-muted-foreground/70">Maak een nieuwe batch aan</p>
              </CardContent>
            </Card>
          ) : filteredInvoices.map((invoice) => {
            const paymentColor = getPaymentStatusColor(invoice);
            const overdue = isInvoiceOverdue(invoice);
            
            return (
              <div
                key={invoice.id}
                className="touch-manipulation"
              >
                <Card 
                  className={cn(
                    "relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-md cursor-pointer transition-all duration-200",
                    selectedIds.has(invoice.id) && "ring-2 ring-primary/50",
                    overdue && "border-destructive/30"
                  )}
                  onClick={() => navigate(`/purchase-invoices/${invoice.id}`)}
                >
                  {/* Payment status indicator */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl",
                    getPaymentStatusClasses(paymentColor)
                  )} />

                  <CardContent className="p-0 pl-2">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/30 bg-muted/20">
                      <Checkbox 
                        checked={selectedIds.has(invoice.id)} 
                        onCheckedChange={() => toggleSelect(invoice.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", getPaymentStatusClasses(paymentColor))} />
                        <span className="font-semibold truncate text-sm">{invoice.invoice_number}</span>
                        {invoice.is_self_billing && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">SB</Badge>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <PurchaseInvoiceStatusDropdown invoiceId={invoice.id} currentStatus={invoice.status} />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" />
                          <span className="truncate">{invoice.carriers?.company_name || 'Onbekend charter'}</span>
                        </div>
                        <span className="font-bold text-base tabular-nums">{formatCurrency(Number(invoice.total_amount))}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(invoice.invoice_date), "d MMM yyyy", { locale: nl })}</span>
                        <div className="flex items-center gap-1.5">
                          {invoice.due_date && (
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                              getDueDateCellClasses(paymentColor)
                            )}>
                              <CalendarClock className="h-3 w-3" />
                              {format(new Date(invoice.due_date), "d MMM", { locale: nl })}
                            </span>
                          )}
                          <InvoiceAgingBadge dueDate={invoice.due_date} status={invoice.status} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions footer */}
                    <div className="flex items-center justify-between p-2 border-t border-border/30 bg-muted/20" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                          <Link to={`/purchase-invoices/${invoice.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Bekijk
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                          <Link to={`/purchase-invoices/${invoice.id}/send`}>
                            <Mail className="h-3.5 w-3.5 mr-1" />Mail
                          </Link>
                        </Button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background">
                          <DropdownMenuItem onClick={() => downloadPdf(invoice.id, invoice.invoice_number)} disabled={isGenerating} className="flex items-center gap-2">
                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            Download PDF
                          </DropdownMenuItem>
                          {invoice.status !== "betaald" && (
                            <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setPaymentModalOpen(true); }} className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />Betaling
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <PurchaseInvoiceBulkActions selectedInvoices={selectedInvoices as any} onClearSelection={() => setSelectedIds(new Set())} />

      {/* Modals */}
      {selectedInvoice && (
        <PaymentRegistrationModal open={paymentModalOpen} onOpenChange={setPaymentModalOpen} invoiceId={selectedInvoice.id} totalAmount={Number(selectedInvoice.total_amount)} onSuccess={() => { refetch(); setSelectedInvoice(null); }} />
      )}
    </DashboardLayout>
  );
};

export default PurchaseInvoices;

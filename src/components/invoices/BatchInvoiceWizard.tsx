import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Euro,
  Package,
  Mail,
  SkipForward,
  CheckCheck,
  XCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { sendInvoiceEmail } from "@/lib/email";
import { cn } from "@/lib/utils";
import { berekenBTW } from "@/lib/btw-calculator";
import { useCompany } from "@/hooks/useCompany";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subMonths,
  subQuarters,
  format,
} from "date-fns";
import { nl } from "date-fns/locale";

interface BatchInvoiceWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

interface EligibleTrip {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_country: string | null;
  customer_vat_number: string | null;
  pickup_city: string;
  delivery_city: string;
  sales_total: number;
  trip_date: string;
}

interface CreatedInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  email?: string;
}

interface CustomerGroup {
  customer_id: string;
  customer_name: string;
  customer_country: string | null;
  customer_vat_number: string | null;
  trips: EligibleTrip[];
  total_amount: number;
}

type EmailStatus = "pending" | "sending" | "sent" | "failed";

type PeriodPreset = "today" | "this_week" | "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "custom";

const periodPresets: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Vandaag" },
  { value: "this_week", label: "Deze week" },
  { value: "this_month", label: "Deze maand" },
  { value: "last_month", label: "Vorige maand" },
  { value: "this_quarter", label: "Dit kwartaal" },
  { value: "last_quarter", label: "Vorig kwartaal" },
  { value: "this_year", label: "Dit jaar" },
  { value: "custom", label: "Aangepast" },
];

const getPresetDates = (preset: PeriodPreset): { from: Date; to: Date } => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case "this_quarter":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "last_quarter": {
      const lastQuarter = subQuarters(now, 1);
      return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
    }
    case "this_year":
      return { from: startOfYear(now), to: endOfYear(now) };
    default:
      return { from: startOfMonth(now), to: now };
  }
};

const steps = [
  { id: 1, title: "Filters", icon: Calendar },
  { id: 2, title: "Preview", icon: Package },
  { id: 3, title: "Bevestigen", icon: Check },
  { id: 4, title: "Verzenden", icon: Mail },
];

export function BatchInvoiceWizard({ onComplete, onCancel }: BatchInvoiceWizardProps) {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [currentStep, setCurrentStep] = useState(1);
  const [successData, setSuccessData] = useState<{ invoices_created: number; total_amount: number } | null>(null);
  const [createdInvoices, setCreatedInvoices] = useState<CreatedInvoice[]>([]);
  const [selectedForEmail, setSelectedForEmail] = useState<Set<string>>(new Set());
  const [emailStatuses, setEmailStatuses] = useState<Record<string, EmailStatus>>({});
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("last_month");
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const initialDates = getPresetDates("last_month");
  const [filters, setFilters] = useState({
    period_from: format(initialDates.from, "yyyy-MM-dd"),
    period_to: format(initialDates.to, "yyyy-MM-dd"),
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    customer_id: "",
    is_proforma: false,
    footnote: "",
  });
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  
  
  const queryClient = useQueryClient();

  // Handle period preset change
  const handlePresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    if (preset !== "custom") {
      const dates = getPresetDates(preset);
      setFilters((prev) => ({
        ...prev,
        period_from: format(dates.from, "yyyy-MM-dd"),
        period_to: format(dates.to, "yyyy-MM-dd"),
      }));
    }
  };

  // Handle manual date change
  const handleDateChange = (field: "period_from" | "period_to", value: string) => {
    setPeriodPreset("custom");
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch eligible trips
  const { data: eligibleTrips, isLoading: tripsLoading } = useQuery({
    queryKey: ["eligible-trips", filters.period_from, filters.period_to, filters.customer_id, includeUnverified, company?.id],
    queryFn: async () => {
      const statuses: ("gecontroleerd" | "afgerond" | "afgeleverd")[] = includeUnverified 
        ? ["gecontroleerd", "afgerond", "afgeleverd"] 
        : ["gecontroleerd", "afgerond"];

      let query = supabase
        .from("trips")
        .select(`
          id,
          order_number,
          customer_id,
          pickup_city,
          delivery_city,
          sales_total,
          trip_date,
          status,
          customers!inner(company_name, country, vat_number)
        `)
        .eq("company_id", company!.id)
        .in("status", statuses)
        .is("invoice_id", null)
        .gte("trip_date", filters.period_from)
        .lte("trip_date", filters.period_to)
        .not("sales_total", "is", null)
        .gt("sales_total", 0)
        .order("customer_id")
        .order("trip_date");

      if (filters.customer_id) {
        query = query.eq("customer_id", filters.customer_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((trip) => {
        const customerData = (trip.customers as { company_name: string; country: string | null; vat_number: string | null });
        return {
          id: trip.id,
          order_number: trip.order_number || "",
          customer_id: trip.customer_id,
          customer_name: customerData?.company_name || "Onbekend",
          customer_country: customerData?.country || null,
          customer_vat_number: customerData?.vat_number || null,
          pickup_city: trip.pickup_city || "",
          delivery_city: trip.delivery_city || "",
        sales_total: Number(trip.sales_total) || 0,
          trip_date: trip.trip_date || "",
        };
      }) as EligibleTrip[];
    },
    enabled: currentStep >= 2 && !!company?.id,
  });

  // Fetch customers for filter
  const { data: customers } = useQuery({
    queryKey: ["customers-for-invoicing", company?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, company_name")
        .eq("tenant_id", company!.id)
        .eq("is_active", true)
        .order("company_name");
      return data || [];
    },
    enabled: !!company?.id,
  });

  // Group trips by customer
  const customerGroups: CustomerGroup[] = eligibleTrips
    ? Object.values(
        eligibleTrips.reduce((acc, trip) => {
          if (!acc[trip.customer_id]) {
            acc[trip.customer_id] = {
              customer_id: trip.customer_id,
              customer_name: trip.customer_name,
              customer_country: trip.customer_country,
              customer_vat_number: trip.customer_vat_number,
              trips: [],
              total_amount: 0,
            };
          }
          acc[trip.customer_id].trips.push(trip);
          acc[trip.customer_id].total_amount += trip.sales_total;
          return acc;
        }, {} as Record<string, CustomerGroup>)
      )
    : [];

  // Auto-select all customers when entering step 2
  const initializeSelection = () => {
    if (customerGroups.length > 0 && selectedCustomers.size === 0) {
      setSelectedCustomers(new Set(customerGroups.map((g) => g.customer_id)));
    }
  };

  // Auto-initialize selection when step 2 data becomes available
  useEffect(() => {
    if (currentStep === 2 && customerGroups.length > 0 && selectedCustomers.size === 0) {
      setSelectedCustomers(new Set(customerGroups.map((g) => g.customer_id)));
    }
  }, [currentStep, customerGroups.length]);

  // Calculate totals for selected customers
  const selectedGroups = customerGroups.filter((g) => selectedCustomers.has(g.customer_id));
  // Calculate totals with dynamic BTW per customer group
  const totalOrders = selectedGroups.reduce((sum, g) => sum + g.trips.length, 0);
  const totalAmount = selectedGroups.reduce((sum, g) => sum + g.total_amount, 0);
  const totalVat = selectedGroups.reduce((sum, g) => {
    const btw = berekenBTW({
      afzenderLand: 'NL',
      ontvangerLand: g.customer_country,
      ontvangerBTWnummer: g.customer_vat_number,
    });
    return sum + g.total_amount * (btw.tarief / 100);
  }, 0);
  const totalWithVat = totalAmount + totalVat;

  // Batch invoice mutation
  const batchInvoiceMutation = useMutation({
    mutationFn: async () => {
    const { data, error } = await supabase.functions.invoke("create-batch-invoices", {
        body: {
          customer_id: filters.customer_id || undefined,
          selected_customer_ids: selectedGroups.map(g => g.customer_id),
          period_from: filters.period_from,
          period_to: filters.period_to,
          invoice_date: filters.invoice_date,
          is_proforma: filters.is_proforma,
          footnote: filters.footnote || undefined,
          include_unverified: includeUnverified,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setSuccessData(data);
      const count = data?.invoices_created || 0;
      toast.success(`${count} factu${count === 1 ? 'ur' : 'ren'} succesvol aangemaakt`);

      // Fetch customer emails for created invoices
      const invoiceIds = (data?.invoices || []).map((inv: CreatedInvoice) => inv.id);
      if (invoiceIds.length > 0) {
        const { data: invoicesWithEmail } = await supabase
          .from("invoices")
          .select("id, customers(email)")
          .in("id", invoiceIds);

        const emailMap: Record<string, string> = {};
        (invoicesWithEmail || []).forEach((inv: any) => {
          if (inv.customers?.email) emailMap[inv.id] = inv.customers.email;
        });

        const enriched: CreatedInvoice[] = (data.invoices || []).map((inv: CreatedInvoice) => ({
          ...inv,
          email: emailMap[inv.id] || undefined,
        }));
        setCreatedInvoices(enriched);

        // Pre-select invoices that have an email
        const withEmail = new Set(enriched.filter(i => i.email).map(i => i.id));
        setSelectedForEmail(withEmail);
        setEmailStatuses({});
      }

      setCurrentStep(4);
    },
    onError: (error) => {
      console.error("Batch invoice error:", error);
      toast.error("Fout bij aanmaken facturen", { description: error.message });
    },
  });

  const handleNext = () => {
    if (currentStep === 2) {
      initializeSelection();
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = () => {
    setShowConfirm(true);
  };

  const toggleEmailInvoice = (invoiceId: string) => {
    const next = new Set(selectedForEmail);
    if (next.has(invoiceId)) next.delete(invoiceId);
    else next.add(invoiceId);
    setSelectedForEmail(next);
  };

  const toggleAllEmails = () => {
    const withEmail = createdInvoices.filter(i => i.email);
    if (selectedForEmail.size === withEmail.length) {
      setSelectedForEmail(new Set());
    } else {
      setSelectedForEmail(new Set(withEmail.map(i => i.id)));
    }
  };

  const handleSendEmails = async () => {
    const toSend = createdInvoices.filter(i => selectedForEmail.has(i.id) && i.email);
    if (toSend.length === 0) return;

    setIsSendingEmails(true);
    const statuses: Record<string, EmailStatus> = {};
    toSend.forEach(i => { statuses[i.id] = "pending"; });
    setEmailStatuses({ ...statuses });

    let sent = 0;
    let failed = 0;
    for (const inv of toSend) {
      statuses[inv.id] = "sending";
      setEmailStatuses({ ...statuses });

      try {
        const result = await sendInvoiceEmail({
          invoiceId: inv.id,
          recipientEmails: [inv.email!],
          includePdf: true,
        });

        if (result.success) {
          statuses[inv.id] = "sent";
          sent++;
        } else {
          statuses[inv.id] = "failed";
          failed++;
        }
      } catch {
        statuses[inv.id] = "failed";
        failed++;
      }
      setEmailStatuses({ ...statuses });
    }

    setIsSendingEmails(false);
    if (sent > 0) toast.success(`${sent} factu${sent === 1 ? 'ur' : 'ren'} per e-mail verzonden`);
    if (failed > 0) toast.error(`${failed} factu${failed === 1 ? 'ur' : 'ren'} niet verzonden`);
    setCurrentStep(5);
  };

  const toggleCustomer = (customerId: string) => {
    const newSelection = new Set(selectedCustomers);
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId);
    } else {
      newSelection.add(customerId);
    }
    setSelectedCustomers(newSelection);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Progress Steps - Mobile Optimized */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4 sm:mb-8 px-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all",
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.id
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > step.id ? (
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <step.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span className="text-xs sm:text-sm font-medium">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-4 sm:w-8 h-0.5 mx-1 sm:mx-2",
                  currentStep > step.id ? "bg-emerald-500" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Filters */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Selecteer periode en instellingen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Period Presets */}
                <div className="space-y-3">
                  <Label>Snelle selectie</Label>
                  <div className="flex flex-wrap gap-2">
                    {periodPresets.map((preset) => (
                      <Button
                        key={preset.value}
                        type="button"
                        variant={periodPreset === preset.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePresetChange(preset.value)}
                        className={cn(
                          "transition-all",
                          periodPreset === preset.value && "ring-2 ring-primary/30"
                        )}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Period Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Periode van</Label>
                    <Input
                      type="date"
                      value={filters.period_from}
                      onChange={(e) => handleDateChange("period_from", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Periode t/m</Label>
                    <Input
                      type="date"
                      value={filters.period_to}
                      onChange={(e) => handleDateChange("period_to", e.target.value)}
                    />
                  </div>
                </div>

                {/* Invoice Date */}
                <div className="space-y-2">
                  <Label>Factuurdatum</Label>
                  <Input
                    type="date"
                    value={filters.invoice_date}
                    onChange={(e) => setFilters({ ...filters, invoice_date: e.target.value })}
                  />
                </div>

                {/* Customer Filter */}
                <div className="space-y-2">
                  <Label>Klant (optioneel)</Label>
                  <Select
                    value={filters.customer_id}
                    onValueChange={(value) =>
                      setFilters({ ...filters, customer_id: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alle klanten" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle klanten</SelectItem>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Footnote */}
                <div className="space-y-2">
                  <Label>Voetnoot (optioneel)</Label>
                  <Textarea
                    placeholder="Eventuele opmerking onder aan de factuur..."
                    value={filters.footnote}
                    onChange={(e) => setFilters({ ...filters, footnote: e.target.value })}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Proforma Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="proforma"
                    checked={filters.is_proforma}
                    onCheckedChange={(checked) =>
                      setFilters({ ...filters, is_proforma: checked as boolean })
                    }
                  />
                  <Label htmlFor="proforma" className="cursor-pointer">
                    Proeffactuur (niet verzenden, alleen ter controle)
                  </Label>
                </div>

                {/* Include unverified toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-unverified"
                    checked={includeUnverified}
                    onCheckedChange={(checked) => setIncludeUnverified(checked as boolean)}
                  />
                  <Label htmlFor="include-unverified" className="cursor-pointer">
                    Inclusief niet-gecontroleerde afgeleverde orders
                  </Label>
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">{includeUnverified ? "Alle afgeronde orders" : "Alleen gecontroleerde orders"}</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      {includeUnverified 
                        ? "Orders met status 'Afgeleverd', 'Afgerond' of 'Gecontroleerd' die nog niet gefactureerd zijn worden opgenomen."
                        : "Alleen orders met status 'Gecontroleerd' of 'Afgerond' die nog niet gefactureerd zijn worden opgenomen in de batch facturatie."
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Preview */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Preview te factureren orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tripsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : customerGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Geen orders gevonden</h3>
                    <p className="text-muted-foreground">
                      Er zijn geen orders met status "Gecontroleerd" of "Afgerond" in de geselecteerde periode.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerGroups.map((group) => (
                      <div
                        key={group.customer_id}
                        className={cn(
                          "border rounded-xl overflow-hidden transition-all",
                          selectedCustomers.has(group.customer_id)
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                            : "border-border"
                        )}
                      >
                        <div
                          className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleCustomer(group.customer_id)}
                        >
                          <Checkbox
                            checked={selectedCustomers.has(group.customer_id)}
                            onCheckedChange={() => toggleCustomer(group.customer_id)}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm sm:text-base truncate">{group.customer_name}</span>
                              <Badge variant="secondary" className="shrink-0 text-xs">{group.trips.length} orders</Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">
                              Totaal: {formatCurrency(group.total_amount)} excl. BTW
                            </div>
                          </div>
                        </div>

                        {selectedCustomers.has(group.customer_id) && (
                          <div className="border-t bg-background/50 max-h-48 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Order</TableHead>
                                  <TableHead>Route</TableHead>
                                  <TableHead>Datum</TableHead>
                                  <TableHead className="text-right">Bedrag</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.trips.map((trip) => (
                                  <TableRow key={trip.id}>
                                    <TableCell className="font-mono text-sm">
                                      {trip.order_number}
                                    </TableCell>
                                    <TableCell>
                                      {trip.pickup_city} → {trip.delivery_city}
                                    </TableCell>
                                    <TableCell>{formatDate(trip.trip_date)}</TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(trip.sales_total)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Bevestig facturatie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
              {/* Summary Cards - Mobile Optimized */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-xl text-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-primary mb-1.5" />
                    <div className="text-xl sm:text-2xl font-bold">{selectedGroups.length}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Klanten</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-xl text-center">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-primary mb-1.5" />
                    <div className="text-xl sm:text-2xl font-bold">{totalOrders}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Orders</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted/50 rounded-xl text-center">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-primary mb-1.5" />
                    <div className="text-xl sm:text-2xl font-bold">{selectedGroups.length}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Facturen</div>
                  </div>
                  <div className="p-3 sm:p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-center overflow-hidden">
                    <Euro className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-emerald-600 dark:text-emerald-400 mb-1.5" />
                    <div className="text-base sm:text-xl font-bold text-emerald-700 dark:text-emerald-300 truncate px-1">
                      {formatCurrency(totalWithVat)}
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                      Incl. BTW
                    </div>
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotaal</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{(() => {
                      const rates = [...new Set(selectedGroups.map(g => {
                        const btw = berekenBTW({
                          afzenderLand: 'NL',
                          ontvangerLand: g.customer_country,
                          ontvangerBTWnummer: g.customer_vat_number,
                        });
                        return btw.tarief;
                      }))];
                      return rates.length > 1 ? 'BTW (diverse)' : `BTW (${rates[0] ?? 21}%)`;
                    })()}</span>
                    <span>{formatCurrency(totalVat)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Totaal</span>
                    <span className="text-emerald-600">{formatCurrency(totalWithVat)}</span>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">Let op: deze actie kan niet ongedaan worden gemaakt</p>
                    <p className="text-amber-600 dark:text-amber-400">
                      Na het aanmaken worden de orders gemarkeerd als gefactureerd en kunnen niet
                      opnieuw gefactureerd worden.
                    </p>
                  </div>
                </div>

                {filters.is_proforma && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Proeffactuur modus</p>
                      <p className="text-blue-600 dark:text-blue-400">
                        De facturen worden aangemaakt als proeffactuur en zijn bedoeld ter controle.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        {/* Step 4: Email Sending */}
        {currentStep === 4 && createdInvoices.length > 0 && (
          <motion.div
            key="step4-email"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Facturen per e-mail verzenden
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Select all toggle */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleAllEmails}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    disabled={isSendingEmails}
                  >
                    <CheckCheck className="h-4 w-4" />
                    {selectedForEmail.size === createdInvoices.filter(i => i.email).length
                      ? "Niets selecteren"
                      : "Alles selecteren"}
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {selectedForEmail.size} van {createdInvoices.filter(i => i.email).length} geselecteerd
                  </span>
                </div>

                {/* Invoice list */}
                <div className="space-y-2 max-h-80 overflow-auto">
                  {createdInvoices.map((inv) => {
                    const status = emailStatuses[inv.id];
                    return (
                      <div
                        key={inv.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all",
                          !inv.email && "opacity-50",
                          status === "sent" && "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10",
                          status === "failed" && "border-destructive bg-destructive/5",
                          !status && selectedForEmail.has(inv.id) && "border-primary/50 bg-primary/5",
                          !status && !selectedForEmail.has(inv.id) && "border-border"
                        )}
                      >
                        <Checkbox
                          checked={selectedForEmail.has(inv.id)}
                          onCheckedChange={() => toggleEmailInvoice(inv.id)}
                          disabled={!inv.email || isSendingEmails || !!status}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">
                              {inv.invoice_number} — {inv.customer_name}
                            </span>
                            <span className="text-sm font-medium shrink-0">
                              {formatCurrency(inv.total_amount)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {inv.email || "Geen e-mailadres beschikbaar"}
                          </div>
                        </div>
                        <div className="shrink-0 w-6">
                          {status === "sending" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                          {status === "sent" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                          {status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar during sending */}
                {isSendingEmails && (
                  <div className="space-y-2">
                    <Progress
                      value={
                        (Object.values(emailStatuses).filter(s => s === "sent" || s === "failed").length /
                          Object.values(emailStatuses).length) *
                        100
                      }
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      {Object.values(emailStatuses).filter(s => s === "sent" || s === "failed").length} van{" "}
                      {Object.values(emailStatuses).length} verwerkt...
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <Button
                    onClick={() => setCurrentStep(5)}
                    variant="outline"
                    disabled={isSendingEmails}
                    className="w-full sm:w-auto"
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Overslaan
                  </Button>
                  <Button
                    onClick={handleSendEmails}
                    disabled={isSendingEmails || selectedForEmail.size === 0}
                    className="w-full sm:w-auto flex-1"
                    variant="premium"
                  >
                    {isSendingEmails ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verzenden...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {selectedForEmail.size} factu{selectedForEmail.size === 1 ? "ur" : "ren"} verzenden
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Success */}
        {currentStep === 5 && successData && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Card className="glass-card border-border/50">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                    className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="space-y-1"
                  >
                    <h3 className="text-xl font-bold">Facturen aangemaakt! 🎉</h3>
                    <p className="text-muted-foreground">
                      {successData.invoices_created} {successData.invoices_created === 1 ? 'factuur' : 'facturen'} voor{' '}
                      {formatCurrency(successData.total_amount)}
                    </p>
                    {Object.values(emailStatuses).some(s => s === "sent") && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        ✉️ {Object.values(emailStatuses).filter(s => s === "sent").length} per e-mail verzonden
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-4"
                  >
                    <Button
                      onClick={() => navigate('/invoices')}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                      size="lg"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Bekijk facturen
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSuccessData(null);
                        setCreatedInvoices([]);
                        setSelectedForEmail(new Set());
                        setEmailStatuses({});
                        setCurrentStep(1);
                        setSelectedCustomers(new Set());
                        setIncludeUnverified(false);
                      }}
                      className="w-full sm:w-auto"
                      size="lg"
                    >
                      Nieuwe batch
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons - Mobile Optimized (hidden on email/success steps) */}
      {currentStep < 4 && (
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onCancel : handleBack}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? "Annuleren" : "Vorige"}
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={currentStep === 2 && customerGroups.length === 0}
              className="w-full sm:w-auto"
            >
              Volgende
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={batchInvoiceMutation.isPending || selectedGroups.length === 0}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              {batchInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {selectedGroups.length === 1 ? "1 factuur aanmaken" : `${selectedGroups.length} facturen aanmaken`}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
      <ConfirmDialog
        open={showConfirm}
        title="Facturen definitief aanmaken?"
        description={`Er ${selectedGroups.length === 1 ? 'wordt 1 factuur' : `worden ${selectedGroups.length} facturen`} aangemaakt voor ${totalOrders} orders met een totaalbedrag van ${formatCurrency(totalAmount + totalVat)} (incl. BTW). Deze actie kan niet ongedaan worden gemaakt.`}
        confirmText="Facturen aanmaken"
        variant="warning"
        isLoading={batchInvoiceMutation.isPending}
        onConfirm={() => {
          batchInvoiceMutation.mutate();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

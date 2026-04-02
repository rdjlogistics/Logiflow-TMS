import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Euro,
  Clock,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronRight,
  Mail,
  Search,
  ArrowUpDown,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { InvoiceAgingBadge } from "@/components/invoices/InvoiceAgingBadge";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { SendReminderDialog } from "@/components/invoices/SendReminderDialog";

import { Suspense, lazy } from "react";
import { CollectionsContent } from "./Collections";
import { CreditDashboardContent } from "./CreditDashboard";

// ── Types ──
interface ReceivableInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  due_date: string;
  invoice_date: string;
  status: string;
  sent_at: string | null;
  is_manual: boolean | null;
  reminder_count: number | null;
  customer_id: string;
  customers?: {
    id: string;
    company_name: string;
    email?: string;
    phone?: string;
  };
}

interface CustomerGroup {
  customerId: string;
  companyName: string;
  email?: string;
  phone?: string;
  invoices: ReceivableInvoice[];
  totalOpen: number;
  totalOverdue: number;
  oldestOverdueDays: number;
}

type SortKey = "amount" | "overdue" | "name";

// ── Shimmer overlay ──
const ShimmerOverlay = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
);

// ── KPI Card ──
function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden rounded-2xl border border-border/25 bg-card/50 backdrop-blur-2xl shadow-xl group hover:ring-2 hover:ring-primary/30 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none" style={{
          background: `radial-gradient(circle at 100% 0%, ${color}, transparent 70%)`,
        }} />
        <ShimmerOverlay />
        <CardContent className="pt-4 pb-3 md:pt-6 md:pb-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main component ──
export default function Receivables() {
  const [activeTab, setActiveTab] = useState("overzicht");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("overdue");
  const [reminderInvoice, setReminderInvoice] = useState<any>(null);
  const navigate = useNavigate();

  // Fetch open invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["receivables-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id, invoice_number, total_amount, due_date, invoice_date,
          status, sent_at, is_manual, reminder_count, customer_id,
          customers (id, company_name, email, phone)
        `)
        .not("status", "in", '("betaald","concept")')
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as ReceivableInvoice[];
    },
  });

  // Group by customer
  const customerGroups = useMemo(() => {
    const now = new Date();
    const map = new Map<string, CustomerGroup>();

    invoices.forEach((inv) => {
      const cid = inv.customer_id;
      if (!map.has(cid)) {
        map.set(cid, {
          customerId: cid,
          companyName: inv.customers?.company_name || "Onbekend",
          email: inv.customers?.email ?? undefined,
          phone: inv.customers?.phone ?? undefined,
          invoices: [],
          totalOpen: 0,
          totalOverdue: 0,
          oldestOverdueDays: 0,
        });
      }
      const group = map.get(cid)!;
      group.invoices.push(inv);
      group.totalOpen += inv.total_amount;

      const daysOver = differenceInDays(now, new Date(inv.due_date));
      if (daysOver > 0) {
        group.totalOverdue += inv.total_amount;
        group.oldestOverdueDays = Math.max(group.oldestOverdueDays, daysOver);
      }
    });

    let groups = Array.from(map.values());

    // Filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      groups = groups.filter((g) => g.companyName.toLowerCase().includes(q));
    }

    // Sort
    groups.sort((a, b) => {
      if (sortBy === "amount") return b.totalOpen - a.totalOpen;
      if (sortBy === "overdue") return b.oldestOverdueDays - a.oldestOverdueDays;
      return a.companyName.localeCompare(b.companyName);
    });

    return groups;
  }, [invoices, searchTerm, sortBy]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const totalOpen = invoices.reduce((s, i) => s + i.total_amount, 0);
    const overdueInvs = invoices.filter((i) => differenceInDays(now, new Date(i.due_date)) > 0);
    const totalOverdue = overdueInvs.reduce((s, i) => s + i.total_amount, 0);
    const uniqueCustomers = new Set(invoices.map((i) => i.customer_id)).size;
    const riskCustomers = new Set(
      overdueInvs.filter((i) => differenceInDays(now, new Date(i.due_date)) > 14).map((i) => i.customer_id)
    ).size;

    // Simple DSO calc
    const totalDays = invoices.reduce((s, i) => {
      const days = differenceInDays(now, new Date(i.invoice_date));
      return s + days;
    }, 0);
    const avgDSO = invoices.length > 0 ? Math.round(totalDays / invoices.length) : 0;

    return { totalOpen, totalOverdue, avgDSO, riskCustomers, uniqueCustomers };
  }, [invoices]);

  const cycleSortBy = () => {
    const order: SortKey[] = ["overdue", "amount", "name"];
    const idx = order.indexOf(sortBy);
    setSortBy(order[(idx + 1) % order.length]);
  };

  const sortLabel = sortBy === "overdue" ? "Langst verlopen" : sortBy === "amount" ? "Hoogste bedrag" : "Alfabetisch";

  return (
    <DashboardLayout title="Debiteuren & Incasso" description="Openstaande vorderingen, incasso en kredietbeheer">
      <div className="space-y-6 pb-24 md:pb-6">
        {/* Premium Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/60 backdrop-blur-xl border border-border/30 p-1 rounded-xl w-full sm:w-auto">
            <TabsTrigger value="overzicht" className="rounded-lg px-4 py-2.5 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="incasso" className="rounded-lg px-4 py-2.5 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Incasso
            </TabsTrigger>
            <TabsTrigger value="credit" className="rounded-lg px-4 py-2.5 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              Credit Analytics
            </TabsTrigger>
          </TabsList>

          {/* ═══ TAB 1: Overzicht ═══ */}
          <TabsContent value="overzicht" className="mt-6 space-y-6">
            {isLoading ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 md:h-28 rounded-2xl" />)}
                </div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <KPICard
                    icon={Euro}
                    label="Totaal Openstaand"
                    value={`€${kpis.totalOpen.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`}
                    sub={`${invoices.length} facturen • ${kpis.uniqueCustomers} klanten`}
                    color="hsl(228, 85%, 60%)"
                  />
                  <KPICard
                    icon={AlertTriangle}
                    label="Verlopen Bedrag"
                    value={`€${kpis.totalOverdue.toLocaleString("nl-NL", { maximumFractionDigits: 0 })}`}
                    sub={kpis.totalOpen > 0
                      ? `${((kpis.totalOverdue / kpis.totalOpen) * 100).toFixed(0)}% van openstaand`
                      : "Geen facturen"}
                    color="hsl(0, 72%, 51%)"
                  />
                  <KPICard
                    icon={Clock}
                    label="Gemiddelde DSO"
                    value={`${kpis.avgDSO} dagen`}
                    sub="Days Sales Outstanding"
                    color="hsl(38, 92%, 50%)"
                  />
                  <KPICard
                    icon={Users}
                    label="Risico-klanten"
                    value={`${kpis.riskCustomers}`}
                    sub=">14 dagen verlopen facturen"
                    color="hsl(280, 67%, 55%)"
                  />
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek klant..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-card/50 border-border/30 backdrop-blur-sm"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={cycleSortBy} className="gap-2">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortLabel}
                  </Button>
                </div>

                {/* Customer Accordions */}
                {customerGroups.length === 0 ? (
                  <Card className="rounded-2xl border border-border/25 bg-card/50 backdrop-blur-2xl">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                        <FileText className="h-7 w-7 text-primary" />
                      </div>
                      <p className="font-medium text-foreground">Geen openstaande facturen</p>
                      <p className="text-sm text-muted-foreground mt-1">Alle facturen zijn betaald — goed bezig!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {customerGroups.map((group, idx) => (
                      <CustomerAccordion
                        key={group.customerId}
                        group={group}
                        index={idx}
                        onNavigate={(id) => navigate(`/invoices/${id}`)}
                        onReminder={(inv) => setReminderInvoice(inv)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ═══ TAB 2: Incasso ═══ */}
          <TabsContent value="incasso" className="mt-6">
            <CollectionsContent />
          </TabsContent>

          {/* ═══ TAB 3: Credit Analytics ═══ */}
          <TabsContent value="credit" className="mt-6">
            <CreditDashboardContent />
          </TabsContent>
        </Tabs>

        {/* Send Reminder Dialog */}
        <SendReminderDialog
          invoice={reminderInvoice}
          open={!!reminderInvoice}
          onOpenChange={(open) => !open && setReminderInvoice(null)}
        />
      </div>
    </DashboardLayout>
  );
}


// ── Customer Accordion ──
function CustomerAccordion({ group, index, onNavigate, onReminder }: {
  group: CustomerGroup;
  index: number;
  onNavigate: (id: string) => void;
  onReminder: (inv: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(index < 3); // auto-expand top 3

  const overdueInvoices = group.invoices.filter(
    (inv) => differenceInDays(new Date(), new Date(inv.due_date)) > 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: index * 0.05 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={cn(
          "relative overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-2xl transition-all",
          group.totalOverdue > 0 ? "border-destructive/20" : "border-border/25",
          isOpen && "shadow-lg"
        )}>
          {/* Top highlight */}
          <div className="h-px bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
          {/* Mesh gradient accent */}
          {group.totalOverdue > 0 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-destructive/60 via-destructive/30 to-transparent" />
          )}

          <CollapsibleTrigger asChild>
            <button className="w-full px-4 md:px-5 py-4 min-h-[56px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 hover:bg-muted/30 transition-colors rounded-2xl touch-manipulation">
              {/* Top row: chevron + name + invoice count */}
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                <div className="text-left min-w-0 flex-1">
                  <p className="font-semibold text-base sm:text-sm tracking-tight truncate">{group.companyName}</p>
                  <p className="text-xs text-muted-foreground/80">
                    {group.invoices.length} facturen
                    {overdueInvoices.length > 0 && (
                      <span className="text-destructive ml-2">• {overdueInvoices.length} verlopen</span>
                    )}
                  </p>
                </div>
              </div>
              {/* Bottom row on mobile: badges + amount */}
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 pl-7 sm:pl-0">
                {group.totalOverdue > 0 && (
                  <Badge variant="destructive" className="tabular-nums text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                    €{group.totalOverdue.toLocaleString("nl-NL", { maximumFractionDigits: 0 })} verlopen
                  </Badge>
                )}
                <span className="font-bold tabular-nums text-sm ml-auto">
                  €{group.totalOpen.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t border-border/20 px-5 pb-4">
              <div className="divide-y divide-border/15">
                {group.invoices.map((inv) => {
                  const daysOver = differenceInDays(new Date(), new Date(inv.due_date));
                  const isOverdue = daysOver > 0;

                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-2 sm:gap-4 hover:bg-muted/20 -mx-2 px-2 rounded-lg cursor-pointer transition-colors min-h-[48px] touch-manipulation"
                      onClick={() => onNavigate(inv.id)}
                    >
                      {/* Row 1: invoice number + status badges */}
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</span>
                        <InvoiceStatusBadge
                          status={inv.status}
                          sentAt={inv.sent_at}
                          isManual={!!inv.is_manual}
                          isOverdue={isOverdue}
                        />
                        <InvoiceAgingBadge dueDate={inv.due_date} status={inv.status} />
                      </div>
                      {/* Row 2: date + amount + action */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(inv.due_date), "d MMM yyyy", { locale: nl })}
                        </span>
                        <span className={cn("font-semibold tabular-nums text-sm ml-auto sm:ml-0", isOverdue && "text-destructive")}>
                          €{inv.total_amount.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                        </span>
                        {isOverdue && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 sm:h-8 sm:w-8 p-0 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReminder({
                                id: inv.id,
                                invoice_number: inv.invoice_number,
                                total_amount: inv.total_amount,
                                due_date: inv.due_date,
                                status: inv.status,
                                reminder_count: inv.reminder_count,
                                customers: inv.customers,
                              });
                            }}
                          >
                            <Mail className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bulk reminder for all overdue */}
              {overdueInvoices.length > 1 && (
                <div className="mt-3 pt-3 border-t border-border/15 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => {
                      // Send reminder for the most overdue invoice first
                      const worst = overdueInvoices.sort(
                        (a, b) => differenceInDays(new Date(), new Date(a.due_date)) - differenceInDays(new Date(), new Date(b.due_date))
                      ).reverse()[0];
                      onReminder({
                        id: worst.id,
                        invoice_number: worst.invoice_number,
                        total_amount: worst.total_amount,
                        due_date: worst.due_date,
                        status: worst.status,
                        reminder_count: worst.reminder_count,
                        customers: worst.customers,
                      });
                    }}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Herinnering versturen ({overdueInvoices.length} facturen)
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}

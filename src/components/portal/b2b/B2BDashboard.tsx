import { motion } from "framer-motion";
import { 
  Package, Truck, CheckCircle2, AlertTriangle, TrendingUp,
  Clock, ArrowUpRight, FileText, PlusCircle, Upload, Euro,
  Sun, Moon, Sunset, Sunrise, Inbox, CalendarClock, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shipment, Invoice, statusConfig } from "../shared/types";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";

interface B2BDashboardProps {
  stats: {
    pending: number;
    active: number;
    delivered: number;
    problems: number;
    total: number;
  };
  recentShipments: Shipment[];
  onNewShipment: () => void;
  onImport: () => void;
  companyName?: string;
  openCasesCount?: number;
  loading?: boolean;
  invoices?: Invoice[];
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
};

const getTimeIcon = () => {
  const hour = new Date().getHours();
  if (hour < 6) return { Icon: Moon, color: "text-blue-300", glow: "shadow-[0_0_15px_hsl(var(--primary)/0.3)]" };
  if (hour < 12) return { Icon: Sunrise, color: "text-amber-400", glow: "shadow-[0_0_15px_hsl(var(--gold)/0.3)]" };
  if (hour < 18) return { Icon: Sun, color: "text-gold", glow: "shadow-[0_0_15px_hsl(var(--gold)/0.3)]" };
  return { Icon: Sunset, color: "text-orange-400", glow: "shadow-[0_0_15px_hsl(var(--primary)/0.2)]" };
};

const springTransition = { type: "spring" as const, stiffness: 300, damping: 25 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};
const listItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.03, type: "spring", stiffness: 400, damping: 25 },
  }),
};

// Skeleton components for loading state
const KPICardSkeleton = () => (
  <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="mt-3">
        <Skeleton className="h-8 w-12 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
    </CardContent>
  </Card>
);

const ShipmentRowSkeleton = ({ index }: { index: number }) => (
  <div className="flex items-center gap-4 p-4 md:py-3 py-4">
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-32" />
    </div>
    <div className="text-right hidden sm:block space-y-1">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="h-4 w-4" />
  </div>
);

export const B2BDashboard = ({ 
  stats, recentShipments, onNewShipment, onImport, companyName, openCasesCount = 0, loading = false, invoices = [],
}: B2BDashboardProps) => {
  const kpis = [
    { label: "In afwachting", value: stats.pending, icon: Clock, color: "text-amber-400", bgColor: "bg-amber-500/10", trend: null },
    { label: "Actief", value: stats.active, icon: Truck, color: "text-primary", bgColor: "bg-primary/10", trend: null },
    { label: "Afgeleverd", value: stats.delivered, icon: CheckCircle2, color: "text-emerald-400", bgColor: "bg-emerald-500/10", trend: null },
    { label: "Problemen", value: stats.problems, icon: AlertTriangle, color: "text-red-400", bgColor: "bg-red-500/10", trend: null, urgent: stats.problems > 0 },
  ];

  const openInvoices = invoices.filter(i => i.status !== 'paid');
  const overdueInvoices = openInvoices.filter(i => i.status === 'overdue' || (i.dueDate && new Date(i.dueDate) < new Date()));
  const openInvoicesTotal = openInvoices.reduce((sum, i) => {
    const paid = i.amountPaid ?? 0;
    return sum + Math.max(0, i.amount - paid);
  }, 0);
  const totalInvoicesAmount = openInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaidAmount = openInvoices.reduce((sum, i) => sum + (i.amountPaid ?? 0), 0);
  const paymentProgress = totalInvoicesAmount > 0 ? Math.round((totalPaidAmount / totalInvoicesAmount) * 100) : 0;

  const formatEuro = (amount: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  
  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - due.getTime()) / 86400000);
  };

  const getDeliveryStep = (status: string) => {
    const steps = ['confirmed', 'picked_up', 'in_transit', 'delivered'];
    const statusMap: Record<string, number> = {
      confirmed: 0, pickup_scheduled: 0, picked_up: 1, in_transit: 2, out_for_delivery: 2, delivered: 3,
    };
    return statusMap[status] ?? 0;
  };

  const activeStatuses = new Set(['pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery'] as const);
  const activeShipments = recentShipments
    .filter(s => activeStatuses.has(s.status as any))
    .sort((a, b) => (a.estimatedDelivery ?? '').localeCompare(b.estimatedDelivery ?? ''));

  const recentUpdates = recentShipments
    .filter(s => s.status !== 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m geleden`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}u geleden`;
    const days = Math.floor(hours / 24);
    return `${days}d geleden`;
  };

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={containerVariants}>
      {/* Welcome Greeting */}
      <motion.div
        variants={itemVariants}
        className="relative rounded-2xl border border-border/20 bg-gradient-to-r from-primary/5 to-gold/5 backdrop-blur-sm p-5 overflow-hidden"
      >
        <div className="flex items-center gap-4">
          {/* Time Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springTransition, delay: 0 }}
            className={`p-3 rounded-xl bg-background/60 ${getTimeIcon().glow}`}
          >
            {(() => { const { Icon, color } = getTimeIcon(); return <Icon className={`h-6 w-6 ${color}`} />; })()}
          </motion.div>

          <div className="flex-1 min-w-0">
            {/* Greeting + Company */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <motion.h1
                className="text-2xl font-display font-bold"
                initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
                animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {getGreeting()}
              </motion.h1>
              {companyName && (
                <motion.span
                  className="text-2xl font-display font-bold text-primary"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springTransition, delay: 0.3 }}
                >
                  , {companyName}
                </motion.span>
              )}
            </div>

            {/* Date */}
            <motion.p
              className="text-sm text-muted-foreground mt-0.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div className="flex flex-wrap gap-3" variants={itemVariants}>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button onClick={onNewShipment} className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground touch-manipulation min-h-[44px]">
            <PlusCircle className="h-4 w-4" /> Nieuwe Zending
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="outline" onClick={onImport} className="gap-2 touch-manipulation min-h-[44px]">
            <Upload className="h-4 w-4" /> Bulk Importeren
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" asChild className="gap-2 touch-manipulation min-h-[44px]">
            <Link to="/portal/b2b/labels"><FileText className="h-4 w-4" /> Labels Printen</Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants}>
        {loading ? (
          <>
            {[0, 1, 2, 3].map(i => (
              <motion.div key={i} variants={itemVariants}><KPICardSkeleton /></motion.div>
            ))}
          </>
        ) : (
          kpis.map((kpi, index) => (
            <motion.div key={kpi.label} variants={itemVariants}>
              <motion.div whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }}>
                <Card className={`relative overflow-hidden cursor-pointer border-border/30 bg-card/60 backdrop-blur-sm ${kpi.urgent ? 'border-red-500/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <motion.div className={`p-2 rounded-lg ${kpi.bgColor}`} whileHover={{ rotate: 10, scale: 1.1 }}>
                        <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      </motion.div>
                      {kpi.trend && (
                        <motion.div
                          className="flex items-center gap-0.5 text-xs text-emerald-400"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          <TrendingUp className="h-3 w-3" /> {kpi.trend}
                        </motion.div>
                      )}
                    </div>
                    <div className="mt-3">
                      <motion.p
                        className="text-2xl font-display font-bold"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15, delay: index * 0.08 }}
                      >
                        {kpi.value}
                      </motion.p>
                      <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Shipments */}
        <motion.div className="lg:col-span-2" variants={itemVariants}>
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recente Zendingen</CardTitle>
              <Button variant="ghost" size="sm" asChild className="group">
                <Link to="/portal/b2b/shipments" className="gap-1">
                  Alle bekijken
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="divide-y divide-border/30">
                  {[0, 1, 2, 3, 4].map(i => (
                    <ShipmentRowSkeleton key={i} index={i} />
                  ))}
                </div>
              ) : recentShipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Package className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Nog geen zendingen</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mb-4">
                    Maak je eerste zending aan om te beginnen met verzenden.
                  </p>
                  <Button onClick={onNewShipment} size="sm" className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground">
                    <PlusCircle className="h-4 w-4" /> Nieuwe Zending
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {recentShipments.slice(0, 5).map((shipment, index) => {
                    const status = statusConfig[shipment.status];
                    return (
                      <motion.div
                        key={shipment.id}
                        custom={index}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ backgroundColor: "hsl(var(--muted) / 0.2)", x: 4 }}
                      >
                        <Link to={`/portal/b2b/shipments/${shipment.id}`} className="flex items-center gap-4 p-4 md:py-3 py-4 transition-colors touch-manipulation">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{shipment.referenceNumber}</span>
                              <Badge variant="outline" className={`${status.bgColor} ${status.color} border-0 text-[10px]`}>{status.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{shipment.fromCity} → {shipment.toCity}</p>
                          </div>
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">{format(new Date(shipment.createdAt), "d MMM", { locale: nl })}</p>
                            {shipment.price && <p className="text-sm font-medium">€{shipment.price.toFixed(2)}</p>}
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar Widgets */}
        <motion.div className="space-y-4" variants={containerVariants}>
          {/* Widget 1: Openstaande Facturen */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <motion.div whileHover={{ rotate: 20 }}><Euro className="h-4 w-4 text-gold" /></motion.div>
                    Openstaande Facturen
                  </span>
                  {overdueInvoices.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {overdueInvoices.length} verlopen
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-16" /></div>
                    ))}
                  </div>
                ) : openInvoices.length === 0 ? (
                  <motion.div className="text-center py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Alles betaald</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="text-center py-2">
                      <motion.p
                        className="text-2xl font-display font-bold tabular-nums"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        {formatEuro(openInvoicesTotal)}
                      </motion.p>
                      <p className="text-xs text-muted-foreground">{openInvoices.length} openstaand</p>
                    </div>
                    {/* Payment progress bar */}
                    {totalInvoicesAmount > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Betaald</span>
                          <span className="tabular-nums">{paymentProgress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${paymentProgress}%` }}
                            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="divide-y divide-border/20">
                      {openInvoices.slice(0, 3).map((inv, i) => {
                        const isOverdue = inv.status === 'overdue' || (inv.dueDate && new Date(inv.dueDate) < new Date());
                        const outstanding = Math.max(0, inv.amount - (inv.amountPaid ?? 0));
                        const daysOver = isOverdue && inv.dueDate ? getDaysOverdue(inv.dueDate) : 0;
                        return (
                          <motion.div
                            key={inv.id}
                            custom={i}
                            variants={listItemVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <Link to="/portal/b2b/invoices" className="flex items-center justify-between py-2 text-sm group touch-manipulation">
                              <div className="min-w-0">
                                <span className="font-medium truncate block group-hover:text-primary transition-colors">{inv.number}</span>
                                {inv.dueDate && (
                                  <span className={`text-[10px] ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {isOverdue && daysOver > 0
                                      ? `⚠ ${daysOver} dag${daysOver !== 1 ? 'en' : ''} verlopen`
                                      : `Verval: ${format(new Date(inv.dueDate), "d MMM", { locale: nl })}`}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <span className={`font-semibold tabular-nums text-sm ${isOverdue ? 'text-destructive' : ''}`}>
                                  {formatEuro(outstanding)}
                                </span>
                                {(inv.amountPaid ?? 0) > 0 && (
                                  <p className="text-[9px] text-muted-foreground tabular-nums">
                                    van {formatEuro(inv.amount)}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-1">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/portal/b2b/invoices" className="gap-1">
                      Bekijk alle facturen <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget 2: Aankomende Leveringen */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <motion.div whileHover={{ rotate: 20 }}><CalendarClock className="h-4 w-4 text-primary" /></motion.div>
                    Aankomende Leveringen
                  </span>
                  {openCasesCount > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400 bg-amber-500/10">
                      {openCasesCount} cases
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="space-y-3">
                    {[0, 1].map(i => (
                      <div key={i} className="flex justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-14" /></div>
                    ))}
                  </div>
                ) : activeShipments.length === 0 ? (
                  <motion.div className="text-center py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Geen actieve leveringen</p>
                  </motion.div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">{activeShipments.length} actieve zending{activeShipments.length !== 1 ? 'en' : ''}</p>
                    <div className="divide-y divide-border/20">
                      {activeShipments.slice(0, 3).map((s, i) => {
                        const st = statusConfig[s.status];
                        const currentStep = getDeliveryStep(s.status);
                        return (
                          <motion.div
                            key={s.id}
                            custom={i}
                            variants={listItemVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <Link to={`/portal/b2b/shipments/${s.id}`} className="block py-2.5 group touch-manipulation">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{s.referenceNumber}</span>
                                    <Badge variant="outline" className={`${st.bgColor} ${st.color} border-0 text-[10px] shrink-0`}>{st.label}</Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">{s.fromCity} → {s.toCity}</p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  {s.estimatedDelivery && (
                                    <span className="text-[10px] text-muted-foreground block">
                                      {format(new Date(s.estimatedDelivery), "d MMM", { locale: nl })}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {s.parcels} colli{s.weight ? ` · ${s.weight}kg` : ''}
                                  </span>
                                </div>
                              </div>
                              {/* Mini progress steps */}
                              <div className="flex items-center gap-0.5 mt-1.5">
                                {['Bevestigd', 'Opgehaald', 'Onderweg', 'Bezorgd'].map((step, idx) => (
                                  <div key={step} className="flex items-center flex-1">
                                    <div className={`h-1 w-full rounded-full ${idx <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
                                  </div>
                                ))}
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-1">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/portal/b2b/shipments" className="gap-1">
                      Bekijk alle zendingen <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Widget 3: Recente Statusupdates */}
          <motion.div variants={itemVariants} whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <motion.div whileHover={{ rotate: 20 }}><Activity className="h-4 w-4 text-emerald-400" /></motion.div>
                  Recente Statusupdates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex justify-between"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-10" /></div>
                    ))}
                  </div>
                ) : recentUpdates.length === 0 ? (
                  <motion.div className="text-center py-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Geen recente updates</p>
                  </motion.div>
                ) : (
                  <div className="space-y-0 divide-y divide-border/20">
                    {recentUpdates.map((s, i) => {
                      const st = statusConfig[s.status];
                      const timeAgo = getRelativeTime(s.createdAt);
                      return (
                        <motion.div
                          key={s.id}
                          custom={i}
                          variants={listItemVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ backgroundColor: "hsl(var(--muted) / 0.15)" }}
                          className="rounded-md transition-colors"
                        >
                          <Link to={`/portal/b2b/shipments/${s.id}`} className="block py-2.5 px-1 touch-manipulation">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.color.replace('text-', 'bg-')}`} />
                                <span className="text-sm font-medium truncate">{s.referenceNumber}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 ml-3.5">
                              <Badge variant="outline" className={`${st.bgColor} ${st.color} border-0 text-[10px]`}>{st.label}</Badge>
                              <span className="text-[10px] text-muted-foreground truncate">{s.fromCity} → {s.toCity}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">· {s.parcels} colli</span>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default B2BDashboard;

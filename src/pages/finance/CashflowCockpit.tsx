import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCashflowSummary, useFinanceGoals, useFinanceAlerts, useFinanceTransactions, useCreateFinanceGoal, useDeleteFinanceGoal, useDismissAlert } from "@/hooks/useFinance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddCostDialog } from "@/components/finance/AddCostDialog";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Fuel,
  Truck,
  Receipt,
  Clock,
  CreditCard,
  Target,
  Bell,
  RefreshCw,
  Plus,
  FileText,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Calendar,
  Banknote,
  PiggyBank,
  Loader2,
  Sparkles,
  ExternalLink,
  Settings2,
  Copy,
  Zap,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const CashflowCockpit = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [showAlerts, setShowAlerts] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [dismissingAlertId, setDismissingAlertId] = useState<string | null>(null);
  
  const { data: summary, isLoading, refetch } = useCashflowSummary(selectedPeriod);
  const { data: goals } = useFinanceGoals();
  const { data: alerts } = useFinanceAlerts();
  const { data: recentTransactions } = useFinanceTransactions({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
  });
  
  const createGoal = useCreateFinanceGoal();
  const deleteGoal = useDeleteFinanceGoal();
  const dismissAlert = useDismissAlert();

  // Payments query
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments-cashflow"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`*, invoices:invoice_id (invoice_number, customers:customer_id (company_name))`)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const paymentStats = {
    total: payments?.length || 0,
    paid: payments?.filter((p) => p.status === "paid").length || 0,
    pending: payments?.filter((p) => p.status === "pending" || p.status === "open").length || 0,
    paidAmount: payments?.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };

  const getPaymentStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      paid: { className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25", label: "Betaald" },
      open: { className: "bg-amber-500/15 text-amber-500 border-amber-500/25", label: "Open" },
      pending: { className: "bg-blue-500/15 text-blue-500 border-blue-500/25", label: "In behandeling" },
      failed: { className: "bg-red-500/15 text-red-500 border-red-500/25", label: "Mislukt" },
      expired: { className: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/25", label: "Verlopen" },
      canceled: { className: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/25", label: "Geannuleerd" },
    };
    const s = map[status] || { className: "bg-muted", label: status };
    return <Badge className={s.className}>{s.label}</Badge>;
  };
  
  // Goal form state
  const [goalForm, setGoalForm] = useState({
    name: '',
    metric_key: 'gross_margin',
    target_value: '',
    warning_threshold: '',
    unit: '%',
    action_link: '',
    action_label: '',
  });
  
  // Goal templates for quick creation
  const goalTemplates = [
    { name: 'Brutomarge 25%', metric_key: 'gross_margin', target_value: 25, unit: '%', action_link: '/invoices', action_label: 'Facturen bekijken' },
    { name: 'Nettomarge 15%', metric_key: 'net_margin', target_value: 15, unit: '%', action_link: '/finance/cashflow', action_label: 'Kosten analyseren' },
    { name: 'DSO onder 30 dagen', metric_key: 'dso_target', target_value: 30, unit: 'dagen', action_link: '/finance/receivables', action_label: 'Incasso bekijken' },
    { name: 'Omzet €100K', metric_key: 'revenue_target', target_value: 100000, unit: '€', action_link: '/invoices', action_label: 'Nieuwe factuur' },
  ];
  
  // Metric action mappings
  const getMetricAction = (metricKey: string) => {
    const actions: Record<string, { link: string; label: string; icon: typeof FileText }> = {
      'gross_margin': { link: '/invoices', label: 'Facturen', icon: FileText },
      'net_margin': { link: '/finance/cashflow', label: 'Kosten', icon: TrendingDown },
      'revenue_target': { link: '/invoices', label: 'Nieuwe factuur', icon: Plus },
      'cost_reduction': { link: '/finance/fuel-cards', label: 'Kosten bekijken', icon: Fuel },
      'dso_target': { link: '/finance/receivables', label: 'Incasso', icon: Banknote },
      'fuel_efficiency': { link: '/finance/fuel-cards', label: 'Brandstof', icon: Fuel },
    };
    return actions[metricKey] || { link: '/finance/cashflow', label: 'Bekijken', icon: Eye };
  };
  
  const applyTemplate = (template: typeof goalTemplates[0]) => {
    setGoalForm({
      name: template.name,
      metric_key: template.metric_key,
      target_value: String(template.target_value),
      warning_threshold: String(Math.round(template.target_value * 0.8)),
      unit: template.unit,
      action_link: template.action_link,
      action_label: template.action_label,
    });
  };

  // Calculate actual current values for goals based on summary data
  const getGoalCurrentValue = (metricKey: string): number => {
    if (!summary) return 0;
    switch (metricKey) {
      case 'gross_margin':
        return summary.grossMargin || 0;
      case 'net_margin':
        return summary.netMargin || 0;
      case 'revenue_target':
        return summary.revenue.mtd || 0;
      case 'dso_target':
        return summary.dso || 0;
      default:
        return 0;
    }
  };

  const costBreakdown = [
    { label: "Brandstof", value: summary?.costs.fuel || 0, icon: Fuel, color: "bg-amber-500", href: "/finance/fuel-cards" },
    { label: "Subcontracting", value: summary?.costs.subcontract || 0, icon: Truck, color: "bg-blue-500", href: "/invoices" },
    { label: "Tol/Parkeren", value: (summary?.costs.toll || 0) + (summary?.costs.parking || 0), icon: Receipt, color: "bg-purple-500", href: "/finance/cashflow" },
    { label: "Onderhoud", value: summary?.costs.maintenance || 0, icon: Clock, color: "bg-orange-500", href: "/fleet" },
    { label: "Overig", value: summary?.costs.other || 0, icon: CreditCard, color: "bg-muted-foreground", href: "/finance/cashflow" },
  ];

  const unreadAlerts = alerts?.filter(a => !a.is_read) || [];

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Gegevens vernieuwd",
      description: "De cashflow data is bijgewerkt.",
    });
  };

  const handleExport = () => {
    if (!summary) {
      toast({ title: "Geen data", description: "Er is geen cashflow data om te exporteren.", variant: "destructive" });
      return;
    }
    
    const csvContent = `Cashflow Rapport - ${format(new Date(), "d MMMM yyyy", { locale: nl })}

Categorie,Bedrag
Omzet MTD,${summary.revenue.mtd}
Brutowinst,${summary.grossProfit}
Brutomarge,${summary.grossMargin}%
Nettomarge,${summary.netMargin}%
Debiteuren Totaal,${summary.receivables.total}
Debiteuren Achterstallig,${summary.receivables.overdue}
DSO,${summary.dso} dagen
Cash Positie,${summary.cashPosition}

Kosten Breakdown
Brandstof,${summary.costs.fuel}
Subcontracting,${summary.costs.subcontract}
Tol,${summary.costs.toll}
Parkeren,${summary.costs.parking}
Onderhoud,${summary.costs.maintenance}
Overig,${summary.costs.other}
`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-rapport-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export gedownload",
      description: "Het cashflow rapport is opgeslagen als CSV.",
    });
  };

  const handleSubmitGoal = () => {
    if (!goalForm.name || !goalForm.target_value) {
      toast({
        title: "Vul alle velden in",
        description: "Naam en doelwaarde zijn verplicht.",
        variant: "destructive",
      });
      return;
    }

    const targetValue = parseFloat(goalForm.target_value);
    const warningThreshold = goalForm.warning_threshold 
      ? parseFloat(goalForm.warning_threshold) 
      : Math.round(targetValue * 0.8); // Default 80% of target
    
    createGoal.mutate({
      name: goalForm.name,
      metric_key: goalForm.metric_key,
      target_value: targetValue,
      warning_threshold: warningThreshold,
      unit: goalForm.unit,
      period: 'monthly',
    }, {
      onSuccess: () => {
        setShowAddGoal(false);
        setGoalForm({ name: '', metric_key: 'gross_margin', target_value: '', warning_threshold: '', unit: '%', action_link: '', action_label: '' });
      }
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    setDeletingGoalId(goalId);
    deleteGoal.mutate(goalId, {
      onSettled: () => setDeletingGoalId(null)
    });
  };

  const handleDismissAlert = (alertId: string) => {
    setDismissingAlertId(alertId);
    dismissAlert.mutate(alertId, {
      onSettled: () => setDismissingAlertId(null)
    });
  };

  const quickActions = [
    { label: "Nieuwe kosten", icon: Plus, onClick: () => setShowAddCost(true), variant: "default" as const },
    { label: "Exporteer rapport", icon: Download, onClick: handleExport, variant: "outline" as const },
    { label: "Bekijk facturen", icon: FileText, href: "/invoices", variant: "outline" as const },
    { label: "Incasso overzicht", icon: Banknote, href: "/finance/receivables", variant: "outline" as const },
  ];

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
  };

  const itemVariants = {
    hidden: { opacity: 0.9, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.1 } }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Cashflow Cockpit">
        <div className="flex items-center justify-center h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Data laden...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Cashflow Cockpit" description="Real-time financieel overzicht">
      <div 
        className="space-y-6"
      >
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector */}
            <div className="flex rounded-lg border border-border/50 p-1 bg-muted/30">
              {(['month', 'quarter', 'year'] as const).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className="h-7 px-3 text-xs"
                >
                  {period === 'month' ? 'Maand' : period === 'quarter' ? 'Kwartaal' : 'Jaar'}
                </Button>
              ))}
            </div>
            
            <Badge variant="outline" className="text-xs gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(), "MMMM yyyy", { locale: nl })}
            </Badge>
            
            {unreadAlerts.length > 0 && (
              <Badge 
                variant="destructive" 
                className="gap-1 cursor-pointer hover:bg-destructive/90"
                onClick={() => setShowAlerts(true)}
              >
                <Bell className="h-3 w-3" />
                {unreadAlerts.length} alerts
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              action.href ? (
                <Button key={action.label} variant={action.variant} size="sm" asChild>
                  <Link to={action.href}>
                    <action.icon className="h-4 w-4 mr-1.5" />
                    {action.label}
                  </Link>
                </Button>
              ) : (
                <Button key={action.label} variant={action.variant} size="sm" onClick={action.onClick}>
                  <action.icon className="h-4 w-4 mr-1.5" />
                  {action.label}
                </Button>
              )
            ))}
            <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-9 w-9">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <Card variant="glass" className="relative overflow-hidden group cursor-pointer hover:border-emerald-500/30 transition-colors">
            <Link to="/invoices">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:bg-emerald-500/20 transition-colors" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Omzet MTD
                  <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.revenue.mtd || 0)}</div>
                <div className="flex items-center gap-1 mt-1">
                  {(summary?.revenue.trend || 0) >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${(summary?.revenue.trend || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {formatPercentage(summary?.revenue.trend || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">vs vorige maand</span>
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Gross Profit */}
          <Card variant="glass" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-8 translate-x-8" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                Brutowinst
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.grossProfit || 0)}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={(summary?.grossMargin || 0) >= 20 ? "default" : "secondary"} className={cn(
                  "text-xs",
                  (summary?.grossMargin || 0) >= 20 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                  {(summary?.grossMargin || 0).toFixed(1)}% marge
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Receivables */}
          <Card variant="glass" className="relative overflow-hidden group cursor-pointer hover:border-amber-500/30 transition-colors">
            <Link to="/finance/receivables">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:bg-amber-500/20 transition-colors" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  Debiteuren
                  <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.receivables.total || 0)}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {(summary?.receivables.overdue || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {formatCurrency(summary?.receivables.overdue || 0)} achterstallig
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">DSO: {(summary?.dso || 0).toFixed(0)}d</span>
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Cash Position */}
          <Card variant="glass" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-8 translate-x-8" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-primary" />
                Cash Positie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary?.cashPosition || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(summary?.cashPosition || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Indicatief saldo na verplichtingen
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Breakdown */}
          <div className="lg:col-span-2">
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Kostenanalyse
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/finance/fuel-cards">
                      <Eye className="h-4 w-4 mr-1.5" />
                      Details
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costBreakdown.map((cost) => {
                    const totalCosts = summary?.costs.total || 1;
                    const percentage = (cost.value / totalCosts) * 100;
                    return (
                      <Link 
                        key={cost.label} 
                        to={cost.href}
                        className="block space-y-2 p-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${cost.color} flex items-center justify-center shadow-sm`}>
                              <cost.icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium">{cost.label}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(cost.value)}</div>
                            <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </Link>
                    );
                  })}
                  
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Totale Kosten</span>
                      <span className="text-red-500">{formatCurrency(summary?.costs.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Goals & Alerts */}
          <div className="space-y-6">
            {/* Goals */}
            <Card variant="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-primary" />
                    Doelen
                    {goals && goals.length > 0 && (
                      <Badge variant="outline" className="text-[10px] ml-1">
                        {goals.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAddGoal(true)}
                    className="h-9 w-9 p-0 active:scale-95 transition-transform touch-manipulation"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {goals && goals.length > 0 ? (
                  <div className="space-y-2">
                    {goals.slice(0, 4).map((goal) => {
                      const currentValue = getGoalCurrentValue(goal.metric_key);
                      const progress = goal.target_value 
                        ? (currentValue / goal.target_value) * 100 
                        : 0;
                      const isAchieved = progress >= 100;
                      const isWarning = goal.warning_threshold && currentValue < goal.warning_threshold && !isAchieved;
                      const metricAction = getMetricAction(goal.metric_key);
                      
                      return (
                        <div 
                          key={goal.id} 
                          className={cn(
                            "p-3 sm:p-4 rounded-xl border transition-all touch-manipulation",
                            "active:scale-[0.98] cursor-pointer",
                            isAchieved 
                              ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10" 
                              : isWarning 
                              ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                              : "bg-muted/20 border-border/50 hover:bg-muted/40"
                          )}
                          onClick={() => {
                            // Navigate to action on mobile tap
                            if (window.innerWidth < 640) {
                              window.location.href = metricAction.link;
                            }
                          }}
                        >
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                isAchieved ? "bg-emerald-500/20" : isWarning ? "bg-amber-500/20" : "bg-primary/10"
                              )}>
                                {isAchieved ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : isWarning ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Target className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{goal.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {metricAction.label}
                                </p>
                              </div>
                            </div>
                            {isAchieved && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] flex-shrink-0">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Behaald
                              </Badge>
                            )}
                          </div>
                          
                          {/* Progress section */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className={cn(
                                "font-semibold",
                                isAchieved ? "text-emerald-500" : isWarning ? "text-amber-500" : "text-foreground"
                              )}>
                                {goal.unit === '€' ? formatCurrency(currentValue) : currentValue.toFixed(1)}{goal.unit !== '€' ? goal.unit : ''}
                              </span>
                              <span className="text-muted-foreground">
                                Doel: {goal.unit === '€' ? formatCurrency(goal.target_value) : goal.target_value}{goal.unit !== '€' ? goal.unit : ''}
                              </span>
                            </div>
                            <div className="relative">
                              <Progress 
                                value={Math.min(progress, 100)} 
                                className={cn(
                                  "h-2.5 rounded-full",
                                  isAchieved && "[&>div]:bg-emerald-500",
                                  isWarning && "[&>div]:bg-amber-500"
                                )} 
                              />
                              {/* Percentage badge */}
                              <div className={cn(
                                "absolute -top-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                isAchieved ? "bg-emerald-500 text-white" : isWarning ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
                              )} style={{ left: `${Math.min(Math.max(progress - 5, 0), 85)}%` }}>
                                {Math.min(progress, 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                          
                          {/* Action row - always visible on mobile, hover on desktop */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-xs px-2 -ml-2 active:scale-95 transition-transform"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link to={metricAction.link}>
                                <metricAction.icon className="h-3.5 w-3.5 mr-1.5" />
                                {metricAction.label}
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                              </Link>
                            </Button>
                            {goal.warning_threshold && !isAchieved && (
                              <span className="text-[10px] text-muted-foreground">
                                Alert bij {goal.warning_threshold}{goal.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {goals.length > 4 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-10 active:scale-[0.98] transition-transform touch-manipulation"
                        onClick={() => setShowAddGoal(true)}
                      >
                        +{goals.length - 4} meer doelen
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Target className="h-7 w-7 text-primary/50" />
                    </div>
                    <p className="text-sm font-medium mb-1">Geen doelen</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Stel financiële targets in
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddGoal(true)}
                      className="h-10 px-4 active:scale-95 transition-transform touch-manipulation"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Doel toevoegen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alerts */}
            <Card variant="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Alerts
                    {unreadAlerts.length > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                        {unreadAlerts.length}
                      </Badge>
                    )}
                  </CardTitle>
                  {alerts && alerts.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAlerts(true)}>
                      Alles
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          alert.severity === "critical"
                            ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15"
                            : alert.severity === "warning"
                            ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
                            : "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15"
                        )}
                        onClick={() => setShowAlerts(true)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{alert.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 shrink-0"
                            disabled={dismissingAlertId === alert.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissAlert(alert.id);
                            }}
                          >
                            {dismissingAlertId === alert.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Geen openstaande alerts
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cashflow Forecast */}
        <div>
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Cashflow Forecast
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Exporteer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">Ontvangsten 7d</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-500">
                    +{formatCurrency(summary?.receivables.within7days || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-muted-foreground">Ontvangsten 14d</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-500">
                    +{formatCurrency(summary?.receivables.within14days || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                    <p className="text-xs text-muted-foreground">Uitgaven 7d</p>
                  </div>
                  <p className="text-xl font-bold text-red-500">
                    -{formatCurrency(summary?.payables.within7days || 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                    <p className="text-xs text-muted-foreground">Uitgaven 14d</p>
                  </div>
                  <p className="text-xl font-bold text-red-500">
                    -{formatCurrency(summary?.payables.within14days || 0)}
                  </p>
                </div>
              </div>

              {/* Net projection */}
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Netto Cashflow (14 dagen)</p>
                    <p className="text-xs text-muted-foreground">Verwachte ontvangsten minus uitgaven</p>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold",
                    ((summary?.receivables.within14days || 0) - (summary?.payables.within14days || 0)) >= 0 
                      ? "text-emerald-500" 
                      : "text-red-500"
                  )}>
                    {formatCurrency((summary?.receivables.within14days || 0) - (summary?.payables.within14days || 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        {recentTransactions && recentTransactions.length > 0 && (
          <div>
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-muted-foreground" />
                    Recente Transacties
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/finance/fuel-cards">
                      Alle transacties
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          tx.transaction_type === 'fuel' ? "bg-amber-500/20" :
                          tx.transaction_type === 'toll' ? "bg-purple-500/20" :
                          tx.transaction_type === 'maintenance' ? "bg-orange-500/20" :
                          "bg-muted"
                        )}>
                          {tx.transaction_type === 'fuel' ? <Fuel className="h-4 w-4 text-amber-500" /> :
                           tx.transaction_type === 'toll' ? <Receipt className="h-4 w-4 text-purple-500" /> :
                           tx.transaction_type === 'maintenance' ? <Clock className="h-4 w-4 text-orange-500" /> :
                           <CreditCard className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description || tx.transaction_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.transaction_date), 'd MMM', { locale: nl })}
                            {tx.vehicle?.license_plate && ` • ${tx.vehicle.license_plate}`}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-semibold",
                        tx.transaction_type === 'revenue' ? "text-emerald-500" : "text-red-500"
                      )}>
                        {tx.transaction_type === 'revenue' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Betalingen Section */}
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Betalingen
                {paymentStats.pending > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20">
                    {paymentStats.pending} open
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {formatCurrency(paymentStats.paidAmount)} ontvangen
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : payments && payments.length > 0 ? (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-muted-foreground">Datum</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Factuur</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Klant</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground text-right">Bedrag</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} className="border-border/20 hover:bg-muted/30 transition-colors">
                        <TableCell className="text-sm tabular-nums">
                          {format(new Date(payment.created_at), "d MMM", { locale: nl })}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-primary">
                            {payment.invoices?.invoice_number || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.invoices?.customers?.company_name || "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-sm">
                          €{Number(payment.amount).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Geen betalingen gevonden</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Sheet */}
      <Sheet open={showAlerts} onOpenChange={setShowAlerts}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alle Alerts
            </SheetTitle>
            <SheetDescription>
              Financiële waarschuwingen en notificaties
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-150px)] mt-4">
            <div className="space-y-3 pr-4">
              {alerts?.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    alert.severity === "critical"
                      ? "bg-red-500/10 border-red-500/30"
                      : alert.severity === "warning"
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-blue-500/10 border-blue-500/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'warning' ? 'default' : 'secondary'
                        } className="text-[10px]">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(alert.created_at), 'd MMM HH:mm', { locale: nl })}
                        </span>
                      </div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0"
                      disabled={dismissingAlertId === alert.id}
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      {dismissingAlertId === alert.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {(!alerts || alerts.length === 0) && (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Geen alerts</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Add Cost Dialog */}
      <AddCostDialog open={showAddCost} onOpenChange={setShowAddCost} />

      {/* Add Goal Sheet */}
      <Sheet open={showAddGoal} onOpenChange={setShowAddGoal}>
        <SheetContent className="w-full sm:max-w-md overflow-hidden">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="block">Nieuw Doel</span>
                <span className="text-xs font-normal text-muted-foreground">Stel meetbare targets in</span>
              </div>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-160px)] -mx-6 px-6">
            <div className="space-y-5 pb-6">
              {/* Quick Templates */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Snelle templates
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {goalTemplates.map((template) => (
                    <Button
                      key={template.name}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-auto py-3 px-3 justify-start text-left flex-col items-start",
                        "active:scale-[0.98] transition-all touch-manipulation",
                        "hover:border-primary/50 hover:bg-primary/5",
                        goalForm.name === template.name && "border-primary bg-primary/10"
                      )}
                      onClick={() => applyTemplate(template)}
                    >
                      <p className="text-xs font-medium">{template.name}</p>
                      <p className="text-[10px] text-muted-foreground">{template.action_label}</p>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-5 space-y-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Of maak een eigen doel</p>
                
                <div className="space-y-1.5">
                  <Label htmlFor="goal-name" className="text-xs">Naam</Label>
                  <Input
                    id="goal-name"
                    placeholder="bijv. Brutomarge verhogen"
                    value={goalForm.name}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, name: e.target.value }))}
                    className="h-11 text-base touch-manipulation"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="goal-metric" className="text-xs">Metriek</Label>
                  <Select 
                    value={goalForm.metric_key} 
                    onValueChange={(val) => {
                      const action = getMetricAction(val);
                      setGoalForm(prev => ({ 
                        ...prev, 
                        metric_key: val,
                        unit: val.includes('margin') || val.includes('pct') || val.includes('reduction') || val.includes('efficiency') ? '%' : val.includes('dso') ? 'dagen' : '€',
                        action_link: action.link,
                        action_label: action.label,
                      }));
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gross_margin">Brutomarge (%)</SelectItem>
                      <SelectItem value="net_margin">Nettomarge (%)</SelectItem>
                      <SelectItem value="revenue_target">Omzet (€)</SelectItem>
                      <SelectItem value="cost_reduction">Kostenbesparing (%)</SelectItem>
                      <SelectItem value="dso_target">DSO (dagen)</SelectItem>
                      <SelectItem value="fuel_efficiency">Brandstof/100km (L)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="goal-target" className="text-xs">Doelwaarde</Label>
                    <Input
                      id="goal-target"
                      type="number"
                      inputMode="decimal"
                      placeholder="bijv. 25"
                      value={goalForm.target_value}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                      className="h-11 text-base touch-manipulation"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="goal-unit" className="text-xs">Eenheid</Label>
                    <Select 
                      value={goalForm.unit} 
                      onValueChange={(val) => setGoalForm(prev => ({ ...prev, unit: val }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="%">%</SelectItem>
                        <SelectItem value="€">€</SelectItem>
                        <SelectItem value="dagen">dagen</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="goal-warning" className="text-xs">Waarschuwingsdrempel</Label>
                  <Input
                    id="goal-warning"
                    type="number"
                    inputMode="decimal"
                    placeholder="Standaard 80% van doel"
                    value={goalForm.warning_threshold}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, warning_threshold: e.target.value }))}
                    className="h-11 text-base touch-manipulation"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Alert wanneer waarde hieronder komt
                  </p>
                </div>

                {/* Custom action configuration - collapsible on mobile */}
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none p-3 -mx-3 rounded-lg hover:bg-muted/30 transition-colors touch-manipulation">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Geavanceerde opties</span>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/50 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Actie label</Label>
                        <Input
                          placeholder="bijv. Facturen"
                          value={goalForm.action_label}
                          onChange={(e) => setGoalForm(prev => ({ ...prev, action_label: e.target.value }))}
                          className="h-10 text-sm touch-manipulation"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Link naar</Label>
                        <Select 
                          value={goalForm.action_link}
                          onValueChange={(val) => setGoalForm(prev => ({ ...prev, action_link: val }))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Pagina..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="/invoices">Facturen</SelectItem>
                            <SelectItem value="/finance/receivables">Incasso</SelectItem>
                            <SelectItem value="/finance/fuel-cards">Brandstof</SelectItem>
                            <SelectItem value="/finance/cashflow">Cashflow</SelectItem>
                            <SelectItem value="/fleet">Vlootbeheer</SelectItem>
                            <SelectItem value="/orders">Orders</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Snelkoppeling die bij je doel verschijnt
                    </p>
                  </div>
                </details>
              </div>
              
              {/* Sticky action buttons */}
              <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm pt-4 pb-2 -mx-6 px-6 border-t border-border/50 mt-6">
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 h-12 active:scale-[0.98] transition-transform touch-manipulation" 
                    onClick={handleSubmitGoal}
                    disabled={createGoal.isPending || !goalForm.name || !goalForm.target_value}
                  >
                    {createGoal.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Doel Opslaan
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 px-4 active:scale-[0.98] transition-transform touch-manipulation"
                    onClick={() => setShowAddGoal(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing goals */}
            {goals && goals.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Bestaande doelen ({goals.length})
                </p>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2 pr-4">
                    {goals.map((goal) => (
                      <div 
                        key={goal.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Doel: {goal.target_value} {goal.unit}
                            {goal.warning_threshold && (
                              <span className="ml-2 text-amber-500">
                                (alert bij {goal.warning_threshold}{goal.unit})
                              </span>
                            )}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                              disabled={deletingGoalId === goal.id}
                            >
                              {deletingGoalId === goal.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Doel verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Weet je zeker dat je "{goal.name}" wilt verwijderen? 
                                Deze actie kan niet ongedaan worden gemaakt.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default CashflowCockpit;

import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFinanceAlerts, useDismissAlert, useMarkAlertRead, useCashflowSummary, useFinanceGoals } from "@/hooks/useFinance";
import {
  BrainCircuit,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Fuel,
  Clock,
  CreditCard,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const AIFinanceCoach = () => {
  const { data: alerts } = useFinanceAlerts();
  const { data: summary } = useCashflowSummary();
  const { data: goals } = useFinanceGoals();
  const dismissAlert = useDismissAlert();
  const markRead = useMarkAlertRead();

  // Generate AI insights based on data
  const generateInsights = () => {
    const insights: Array<{ id: string; icon: any; severity: string; title: string; message: string; impact: string; action: string | null; actionUrl: string | null }> = [];

    // Fuel cost insight
    if (summary && summary.costs.fuel > 0) {
      const fuelPercentage = (summary.costs.fuel / summary.costs.total) * 100;
      if (fuelPercentage > 30) {
        insights.push({
          id: "fuel-high",
          icon: Fuel,
          severity: "warning",
          title: "Brandstofkosten boven doel",
          message: `Brandstof is ${fuelPercentage.toFixed(1)}% van totale kosten. Overweeg tanklocaties te analyseren of rijstijltraining.`,
          impact: `€${((summary.costs.fuel * 0.1)).toFixed(0)} potentiële besparing`,
          action: "Bekijk transacties",
          actionUrl: "/finance/costs",
        });
      }
    }

    // DSO insight
    if (summary && summary.dso > 30) {
      insights.push({
        id: "dso-high",
        icon: Clock,
        severity: "warning",
        title: "Lange betalingstermijn",
        message: `Gemiddelde DSO is ${summary.dso.toFixed(0)} dagen. Overweeg automatische herinneringen of kortere betaaltermijnen.`,
        impact: `Verbeterde cashflow €${(summary.receivables.total * 0.2).toFixed(0)}`,
        action: "Bekijk debiteuren",
        actionUrl: "/invoices",
      });
    }

    // Margin insight
    if (summary && summary.grossMargin < 15) {
      insights.push({
        id: "margin-low",
        icon: TrendingDown,
        severity: "critical",
        title: "Marge onder doel",
        message: `Bruto marge is ${summary.grossMargin.toFixed(1)}%. Analyseer lanes met lage marges en verhoog prijzen waar mogelijk.`,
        impact: "Risico op verlies",
        action: "Bekijk marges",
        actionUrl: "/finance/profit",
      });
    }

    // Positive insight
    if (summary && summary.revenue.trend > 10) {
      insights.push({
        id: "revenue-growth",
        icon: TrendingUp,
        severity: "success",
        title: "Sterke omzetgroei",
        message: `Omzet is ${summary.revenue.trend.toFixed(1)}% hoger dan vorige maand. Behoud dit momentum!`,
        impact: "Positieve trend",
        action: null,
        actionUrl: null,
      });
    }

    // Cash buffer insight
    if (summary && summary.cashPosition < (summary.costs.total * 2)) {
      insights.push({
        id: "cash-low",
        icon: CreditCard,
        severity: "warning",
        title: "Lage cash buffer",
        message: "Cash positie is minder dan 2 weken kosten. Overweeg betalingen te versnellen of kredietlijn aan te vragen.",
        impact: "Liquiditeitsrisico",
        action: "Bekijk cashflow",
        actionUrl: "/finance/bank",
      });
    }

    return insights;
  };

  const insights = generateInsights();
  const activeAlerts = alerts?.filter(a => !a.is_dismissed) || [];

  const handleDismiss = async (alertId: string) => {
    await dismissAlert.mutateAsync(alertId);
  };

  const handleMarkRead = async (alertId: string) => {
    await markRead.mutateAsync(alertId);
  };

  const severityConfig = {
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600" },
    critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-600" },
  };

  return (
    <DashboardLayout title="AI Finance Coach" description="Slimme inzichten en besparingsadvies">
      <div className="space-y-6">
        {/* Header */}
        <Card variant="glass" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-32 translate-x-32" />
          <CardContent className="py-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
                <BrainCircuit className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Finance Coach</h2>
                <p className="text-muted-foreground">
                  Op basis van uw data analyseer ik trends en geef concrete besparingsadviezen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Top Besparingsadviezen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight) => {
                  const config = severityConfig[insight.severity as keyof typeof severityConfig] || severityConfig.warning;
                  return (
                    <div
                      key={insight.id}
                      className={`p-4 rounded-xl ${config.bg} border ${config.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <insight.icon className={`h-5 w-5 ${config.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{insight.title}</h4>
                            <Badge variant={insight.severity === "success" ? "success" : insight.severity === "critical" ? "destructive" : "warning"} className="text-xs">
                              {insight.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{insight.message}</p>
                          {insight.action && insight.actionUrl && (
                            <Button variant="link" className="p-0 h-auto mt-2 text-sm" onClick={() => window.location.href = insight.actionUrl!}>
                              {insight.action}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <p className="font-medium text-emerald-600">Alles ziet er goed uit!</p>
                  <p className="text-sm text-muted-foreground">
                    Geen kritieke punten gedetecteerd
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts from system */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Systeem Alerts ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alert) => {
                  const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.warning;
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl ${config.bg} border ${config.border} ${!alert.is_read ? "ring-2 ring-primary/20" : ""}`}
                      onClick={() => !alert.is_read && handleMarkRead(alert.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(alert.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                  <p className="font-medium">Geen openstaande alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Goals Progress */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Voortgang Financiële Doelen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals && goals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {goals.map((goal) => {
                  const progress = goal.current_value && goal.target_value
                    ? (goal.current_value / goal.target_value) * 100
                    : 0;
                  const isAchieved = progress >= 100;
                  const isWarning = goal.warning_threshold && goal.current_value && goal.current_value < goal.warning_threshold;

                  return (
                    <div
                      key={goal.id}
                      className={`p-4 rounded-xl border ${
                        isAchieved
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : isWarning
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-muted/30 border-border/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{goal.name}</span>
                        {isAchieved ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : isWarning ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : null}
                      </div>
                      <div className="text-2xl font-bold">
                        {goal.current_value?.toFixed(1) || 0}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{goal.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Doel: {goal.target_value} {goal.unit}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAchieved ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Geen doelen ingesteld</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/finance/costs'}>
                  Doelen instellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AIFinanceCoach;

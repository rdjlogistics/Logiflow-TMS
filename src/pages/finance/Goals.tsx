import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCashflowSummary, useFinanceGoals, useCreateFinanceGoal, useDeleteFinanceGoal, type FinanceGoal } from "@/hooks/useFinance";
import {
  Target, Plus, Trash2, CheckCircle2, AlertTriangle, TrendingUp, Loader2, Sparkles,
} from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v);

const goalTemplates = [
  { name: "Brutomarge 25%", metric_key: "gross_margin", target_value: 25, unit: "%", warning_threshold: 20 },
  { name: "Nettomarge 15%", metric_key: "net_margin", target_value: 15, unit: "%", warning_threshold: 12 },
  { name: "DSO onder 30 dagen", metric_key: "dso", target_value: 30, unit: "dagen", warning_threshold: 35 },
  { name: "Omzet €200k/maand", metric_key: "revenue_mtd", target_value: 200000, unit: "€", warning_threshold: 160000 },
];

const metricKeyToCurrentValue = (
  key: string,
  summary: ReturnType<typeof useCashflowSummary>["data"]
): number => {
  if (!summary) return 0;
  switch (key) {
    case "gross_margin": return summary.grossMargin;
    case "net_margin": return summary.netMargin;
    case "dso": return summary.dso;
    case "revenue_mtd": return summary.revenue.mtd;
    case "costs_total": return summary.costs.total;
    default: return 0;
  }
};

const Goals = () => {
  const { data: goals = [], isLoading: loadingGoals } = useFinanceGoals();
  const { data: summary } = useCashflowSummary("month");
  const createGoal = useCreateFinanceGoal();
  const deleteGoal = useDeleteFinanceGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    metric_key: "gross_margin",
    target_value: "",
    warning_threshold: "",
    unit: "%",
  });

  const handleCreate = () => {
    if (!form.name || !form.target_value) return;
    createGoal.mutate(
      {
        name: form.name,
        metric_key: form.metric_key,
        target_value: Number(form.target_value),
        warning_threshold: form.warning_threshold ? Number(form.warning_threshold) : undefined,
        unit: form.unit,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setForm({ name: "", metric_key: "gross_margin", target_value: "", warning_threshold: "", unit: "%" });
        },
      }
    );
  };

  const applyTemplate = (t: typeof goalTemplates[0]) => {
    setForm({
      name: t.name,
      metric_key: t.metric_key,
      target_value: String(t.target_value),
      warning_threshold: String(t.warning_threshold),
      unit: t.unit,
    });
  };

  const getProgress = (goal: FinanceGoal) => {
    const current = metricKeyToCurrentValue(goal.metric_key, summary);
    // For DSO, lower is better
    if (goal.metric_key === "dso") {
      return goal.target_value > 0 ? Math.max(0, Math.min(100, ((goal.target_value - current) / goal.target_value) * 100 + 100)) : 0;
    }
    return goal.target_value > 0 ? (current / goal.target_value) * 100 : 0;
  };

  const getStatus = (goal: FinanceGoal) => {
    const current = metricKeyToCurrentValue(goal.metric_key, summary);
    const threshold = goal.warning_threshold ?? goal.target_value * 0.8;

    if (goal.metric_key === "dso") {
      if (current <= goal.target_value) return "achieved";
      if (current <= threshold) return "warning";
      return "behind";
    }

    if (current >= goal.target_value) return "achieved";
    if (current >= threshold) return "warning";
    return "behind";
  };

  return (
    <DashboardLayout title="Doelen & Budgetten" description="Financiële doelen en voortgang">
      {loadingGoals ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold">Financiële Doelen</h2>
              <Badge variant="outline">{goals.length} actief</Badge>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Nieuw doel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nieuw financieel doel</DialogTitle>
                </DialogHeader>

                {/* Templates */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {goalTemplates.map((t) => (
                    <Button
                      key={t.metric_key}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(t)}
                      className="gap-1 text-xs"
                    >
                      <Sparkles className="h-3 w-3" />
                      {t.name}
                    </Button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Naam</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="bijv. Brutomarge verhogen"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Metric</Label>
                      <Select value={form.metric_key} onValueChange={(v) => setForm((p) => ({ ...p, metric_key: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gross_margin">Brutomarge</SelectItem>
                          <SelectItem value="net_margin">Nettomarge</SelectItem>
                          <SelectItem value="dso">DSO (dagen)</SelectItem>
                          <SelectItem value="revenue_mtd">Omzet MTD</SelectItem>
                          <SelectItem value="costs_total">Kosten totaal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Eenheid</Label>
                      <Select value={form.unit} onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="%">%</SelectItem>
                          <SelectItem value="€">€</SelectItem>
                          <SelectItem value="dagen">Dagen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Doelwaarde</Label>
                      <Input
                        type="number"
                        value={form.target_value}
                        onChange={(e) => setForm((p) => ({ ...p, target_value: e.target.value }))}
                        placeholder="bijv. 25"
                      />
                    </div>
                    <div>
                      <Label>Waarschuwingsdrempel</Label>
                      <Input
                        type="number"
                        value={form.warning_threshold}
                        onChange={(e) => setForm((p) => ({ ...p, warning_threshold: e.target.value }))}
                        placeholder="Standaard 80%"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
                  <Button onClick={handleCreate} disabled={createGoal.isPending}>
                    {createGoal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Opslaan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Goals Grid */}
          {goals.length === 0 ? (
            <Card variant="glass">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Geen doelen ingesteld</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Stel financiële doelen in om je prestaties bij te houden. Gebruik de templates voor een snelle start.
                </p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Eerste doel instellen
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => {
                const current = metricKeyToCurrentValue(goal.metric_key, summary);
                const progress = Math.min(getProgress(goal), 100);
                const status = getStatus(goal);

                return (
                  <Card key={goal.id} variant="glass" className="relative overflow-hidden">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">{goal.metric_key}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {status === "achieved" && (
                            <Badge className="bg-success/10 text-success border-success/20 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Behaald
                            </Badge>
                          )}
                          {status === "warning" && (
                            <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Bijna
                            </Badge>
                          )}
                          {status === "behind" && (
                            <Badge variant="destructive" className="gap-1">
                              <TrendingUp className="h-3 w-3" /> Achter
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Huidig</span>
                          <span className="font-bold tabular-nums">
                            {goal.unit === "€" ? formatCurrency(current) : `${current.toFixed(1)}${goal.unit || ""}`}
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{progress.toFixed(0)}%</span>
                          <span>
                            Doel: {goal.unit === "€" ? formatCurrency(goal.target_value) : `${goal.target_value}${goal.unit || ""}`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Doel verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Weet je zeker dat je "{goal.name}" wilt verwijderen?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteGoal.mutate(goal.id)}>
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Live KPI Summary */}
          {summary && (
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <CardTitle>Live KPI's (huidige maand)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Omzet MTD</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(summary.revenue.mtd)}</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Brutomarge</p>
                    <p className="text-xl font-bold tabular-nums">{summary.grossMargin.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Nettomarge</p>
                    <p className="text-xl font-bold tabular-nums">{summary.netMargin.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">DSO</p>
                    <p className="text-xl font-bold tabular-nums">{summary.dso.toFixed(0)} dagen</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Kosten totaal</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(summary.costs.total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Goals;

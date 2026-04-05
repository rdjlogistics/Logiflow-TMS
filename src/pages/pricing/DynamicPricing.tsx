import { useState } from "react";
import { 
  TrendingUp, Zap, Settings, Calculator, Plus, Activity, Fuel, Cloud, Calendar,
  ArrowRight, Euro, Percent, MapPin, Trash2, Loader2, Shield
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import {
  usePricingRules, useSurgeFactors, useMarketDemand, usePriceHistory,
  useCalculatePrice, useCreatePricingRule, useCreateSurgeFactor,
  useToggleSurgeFactor, useUpdatePricingRule, useDeletePricingRule,
  useDeleteSurgeFactor, PricingRule, SurgeFactor,
} from "@/hooks/useDynamicPricing";

const ruleTypeLabels: Record<string, { label: string; color: string }> = {
  base: { label: "Basis", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  surge: { label: "Surge", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  discount: { label: "Korting", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  minimum: { label: "Minimum", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  maximum: { label: "Maximum", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
};

const factorTypeLabels: Record<string, { label: string; icon: typeof Fuel }> = {
  demand: { label: "Vraag", icon: TrendingUp },
  capacity: { label: "Capaciteit", icon: Activity },
  fuel: { label: "Brandstof", icon: Fuel },
  weather: { label: "Weer", icon: Cloud },
  event: { label: "Evenement", icon: Calendar },
  manual: { label: "Handmatig", icon: Settings },
};

const DynamicPricing = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("calculator");
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [createFactorOpen, setCreateFactorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'rule' | 'factor'; id: string; name: string } | null>(null);

  // Calculator state
  const [calcOrigin, setCalcOrigin] = useState("");
  const [calcDestination, setCalcDestination] = useState("");
  const [calcDistance, setCalcDistance] = useState("");
  const [calcVehicle, setCalcVehicle] = useState("");
  const [calcResult, setCalcResult] = useState<{
    base_price: number; final_price: number; surge_multiplier: number;
    adjustments: Array<{ name: string; type: string; value: number }>;
    breakdown: { distance_charge: number; base_charge: number; surge_charge: number; discounts: number };
  } | null>(null);

  // New rule state
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState("base");
  const [newRuleAdjustmentType, setNewRuleAdjustmentType] = useState("percentage");
  const [newRuleValue, setNewRuleValue] = useState("");

  // New factor state
  const [newFactorName, setNewFactorName] = useState("");
  const [newFactorType, setNewFactorType] = useState("manual");
  const [newFactorMultiplier, setNewFactorMultiplier] = useState("1.0");

  const { data: rules = [], isLoading: rulesLoading } = usePricingRules();
  const { data: surgeFactors = [], isLoading: factorsLoading } = useSurgeFactors();
  const { data: marketDemand = [] } = useMarketDemand();
  const { data: priceHistory = [] } = usePriceHistory();
  
  const calculatePrice = useCalculatePrice();
  const createRule = useCreatePricingRule();
  const updateRule = useUpdatePricingRule();
  const deleteRule = useDeletePricingRule();
  const createFactor = useCreateSurgeFactor();
  const toggleFactor = useToggleSurgeFactor();
  const deleteFactor = useDeleteSurgeFactor();

  const handleCalculate = async () => {
    if (!calcOrigin || !calcDestination || !calcDistance) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }
    const result = await calculatePrice.mutateAsync({
      origin_city: calcOrigin, destination_city: calcDestination,
      distance_km: parseFloat(calcDistance), vehicle_type: calcVehicle || undefined,
    });
    setCalcResult(result);
  };

  const handleCreateRule = async () => {
    if (!newRuleName || !newRuleValue) { toast({ title: "Vul alle velden in", variant: "destructive" }); return; }
    await createRule.mutateAsync({
      name: newRuleName, rule_type: newRuleType as PricingRule['rule_type'],
      adjustment_type: newRuleAdjustmentType as PricingRule['adjustment_type'],
      adjustment_value: parseFloat(newRuleValue),
    });
    setCreateRuleOpen(false);
    setNewRuleName(""); setNewRuleValue("");
  };

  const handleCreateFactor = async () => {
    if (!newFactorName || !newFactorMultiplier) { toast({ title: "Vul alle velden in", variant: "destructive" }); return; }
    await createFactor.mutateAsync({
      name: newFactorName, factor_type: newFactorType as SurgeFactor['factor_type'],
      multiplier: parseFloat(newFactorMultiplier),
    });
    setCreateFactorOpen(false);
    setNewFactorName(""); setNewFactorMultiplier("1.0");
  };

  const handleToggleRule = (rule: PricingRule) => {
    updateRule.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const handleApplyMarketMultiplier = async (region: string, multiplier: number) => {
    await createFactor.mutateAsync({
      name: `Markt: ${region}`,
      factor_type: 'demand',
      multiplier: multiplier,
    });
    toast({ title: "Marktfactor toegepast", description: `${multiplier.toFixed(2)}x multiplier aangemaakt voor ${region}` });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'rule') await deleteRule.mutateAsync(deleteTarget.id);
    else await deleteFactor.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const activeFactors = surgeFactors.filter(f => f.is_active);
  const currentMultiplier = activeFactors.reduce((acc, f) => acc * f.multiplier, 1);

  return (
    <DashboardLayout title="Dynamic Pricing" description="AI-gestuurde tariefberekening op basis van vraag, aanbod en marktcondities">
      <div className="space-y-5">
        {/* Elite Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Prijsregels', value: rules.length, icon: Settings, gradient: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
            { label: 'Actieve Factors', value: activeFactors.length, icon: Zap, gradient: 'from-red-500/20 to-red-500/5', iconColor: 'text-red-500' },
            { label: 'Multiplier', value: `${currentMultiplier.toFixed(2)}x`, icon: TrendingUp, 
              gradient: currentMultiplier > 1.2 ? 'from-red-500/20 to-red-500/5' : currentMultiplier < 0.9 ? 'from-green-500/20 to-green-500/5' : 'from-blue-500/20 to-blue-500/5',
              iconColor: currentMultiplier > 1.2 ? 'text-red-500' : currentMultiplier < 0.9 ? 'text-green-500' : 'text-blue-500' },
            { label: 'Berekeningen', value: priceHistory.length, icon: Calculator, gradient: 'from-purple-500/20 to-purple-500/5', iconColor: 'text-purple-500' },
          ].map((stat, i) => (
            <Card key={i} variant="glass" className="overflow-hidden">
              <CardContent className="p-4 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center border border-border/30 shrink-0">
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
            <TabsList className="min-w-max">
              <TabsTrigger value="calculator" className="gap-1.5 text-xs sm:text-sm"><Calculator className="h-3.5 w-3.5" />Calculator</TabsTrigger>
              <TabsTrigger value="rules" className="gap-1.5 text-xs sm:text-sm"><Settings className="h-3.5 w-3.5" />Prijsregels</TabsTrigger>
              <TabsTrigger value="surge" className="gap-1.5 text-xs sm:text-sm"><Zap className="h-3.5 w-3.5" />Surge</TabsTrigger>
              <TabsTrigger value="market" className="gap-1.5 text-xs sm:text-sm"><TrendingUp className="h-3.5 w-3.5" />Markt</TabsTrigger>
            </TabsList>
          </div>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card variant="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-5 w-5 text-primary" />Prijs Berekenen
                  </CardTitle>
                  <CardDescription className="text-xs">Real-time tarieven op basis van route en marktcondities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ophaaladres</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
                        <Input placeholder="Amsterdam" value={calcOrigin} onChange={(e) => setCalcOrigin(e.target.value)} className="pl-8 h-9" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Afleveradres</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-red-500" />
                        <Input placeholder="Rotterdam" value={calcDestination} onChange={(e) => setCalcDestination(e.target.value)} className="pl-8 h-9" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Afstand (km)</Label>
                      <Input type="number" placeholder="75" value={calcDistance} onChange={(e) => setCalcDistance(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Voertuigtype</Label>
                      <Select value={calcVehicle} onValueChange={setCalcVehicle}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecteer..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bestelbus">Bestelbus</SelectItem>
                          <SelectItem value="bakwagen">Bakwagen</SelectItem>
                          <SelectItem value="vrachtwagen">Vrachtwagen</SelectItem>
                          <SelectItem value="trekker">Trekker</SelectItem>
                          <SelectItem value="koelwagen">Koelwagen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleCalculate} className="w-full gap-2 h-10" disabled={calculatePrice.isPending}>
                    {calculatePrice.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                    {calculatePrice.isPending ? "Berekenen..." : "Bereken Prijs"}
                  </Button>
                </CardContent>
              </Card>

              {/* Result */}
              <Card variant="glass" className={calcResult ? 'ring-1 ring-primary/20' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Euro className="h-5 w-5 text-primary" />Resultaat</CardTitle>
                </CardHeader>
                <CardContent>
                  {calcResult ? (
                    <div className="space-y-4">
                      <div className="text-center p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/10">
                        <p className="text-xs text-muted-foreground mb-1">Berekende prijs</p>
                        <p className="text-3xl font-bold text-primary">€{calcResult.final_price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</p>
                        {calcResult.surge_multiplier > 1 && (
                          <Badge className="mt-2 bg-red-500/10 text-red-600 border-red-500/20">
                            <Zap className="h-3 w-3 mr-1" />Surge {calcResult.surge_multiplier}x
                          </Badge>
                        )}
                        {calcVehicle && (
                          <p className="text-xs text-muted-foreground mt-2">Voertuig: {calcVehicle}</p>
                        )}
                      </div>
                      <Separator />
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Basisprijs</span><span>€{calcResult.breakdown.base_charge.toFixed(2)}</span></div>
                        {calcResult.breakdown.distance_charge > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Afstandstoeslag</span><span>€{calcResult.breakdown.distance_charge.toFixed(2)}</span></div>
                        )}
                        {calcResult.breakdown.surge_charge > 0 && (
                          <div className="flex justify-between text-red-600"><span>Surge toeslag</span><span>+€{calcResult.breakdown.surge_charge.toFixed(2)}</span></div>
                        )}
                        {calcResult.breakdown.discounts > 0 && (
                          <div className="flex justify-between text-green-600"><span>Kortingen</span><span>-€{calcResult.breakdown.discounts.toFixed(2)}</span></div>
                        )}
                      </div>
                      {calcResult.adjustments.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Toegepaste regels</p>
                            {calcResult.adjustments.map((adj, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{adj.name}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {adj.type === 'percentage' ? `${adj.value}%` : adj.type === 'surge_factor' ? `${adj.value}x` : `€${adj.value}`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3 border border-primary/10">
                        <Calculator className="h-6 w-6 text-primary/50" />
                      </div>
                      <p className="text-sm">Vul route gegevens in om een prijs te berekenen</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent calculations */}
            {priceHistory.length > 0 && (
              <Card variant="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recente Berekeningen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {priceHistory.slice(0, 5).map((calc) => (
                      <div key={calc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-card/40 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{calc.origin_city} → {calc.destination_city}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{calc.distance_km}km</span>
                        </div>
                        <span className="font-bold shrink-0">€{calc.calculated_price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-semibold">Prijsregels</h2>
                <p className="text-xs text-muted-foreground">Configureer basis-, surge-, korting- en limietregels</p>
              </div>
              <Dialog open={createRuleOpen} onOpenChange={setCreateRuleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Nieuwe Regel</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Prijsregel</DialogTitle>
                    <DialogDescription>Maak een nieuwe regel aan voor dynamische prijsberekening</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Naam</Label>
                      <Input placeholder="Weekend toeslag" value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Type</Label>
                        <Select value={newRuleType} onValueChange={setNewRuleType}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="base">Basis</SelectItem>
                            <SelectItem value="surge">Surge</SelectItem>
                            <SelectItem value="discount">Korting</SelectItem>
                            <SelectItem value="minimum">Minimum</SelectItem>
                            <SelectItem value="maximum">Maximum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Berekening</Label>
                        <Select value={newRuleAdjustmentType} onValueChange={setNewRuleAdjustmentType}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Vast bedrag</SelectItem>
                            <SelectItem value="per_km">Per km</SelectItem>
                            <SelectItem value="per_hour">Per uur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Waarde</Label>
                      <Input type="number" placeholder={newRuleAdjustmentType === 'percentage' ? "15" : "25.00"} value={newRuleValue} onChange={(e) => setNewRuleValue(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setCreateRuleOpen(false)}>Annuleren</Button>
                    <Button size="sm" onClick={handleCreateRule} disabled={createRule.isPending}>
                      {createRule.isPending ? "Aanmaken..." : "Aanmaken"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {rulesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : rules.length === 0 ? (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-3 border border-primary/10">
                    <Settings className="h-6 w-6 text-primary/50" />
                  </div>
                  <h3 className="font-semibold mb-1">Geen prijsregels</h3>
                  <p className="text-sm text-muted-foreground mb-4">Maak prijsregels aan om dynamische tarieven te berekenen</p>
                  <Button size="sm" onClick={() => setCreateRuleOpen(true)}>Eerste regel aanmaken</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rules.map((rule) => (
                  <Card key={rule.id} variant="glass" className={`transition-all ${!rule.is_active ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm truncate">{rule.name}</h3>
                          <Badge className={`${ruleTypeLabels[rule.rule_type]?.color || ''} text-[10px] mt-1`}>
                            {ruleTypeLabels[rule.rule_type]?.label || rule.rule_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch checked={rule.is_active} onCheckedChange={() => handleToggleRule(rule)} />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: 'rule', id: rule.id, name: rule.name })}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        {rule.adjustment_type === 'percentage' ? (
                          <><Percent className="h-4 w-4" />{rule.adjustment_value}%</>
                        ) : rule.adjustment_type === 'per_km' ? (
                          <>€{rule.adjustment_value}/km</>
                        ) : rule.adjustment_type === 'per_hour' ? (
                          <>€{rule.adjustment_value}/uur</>
                        ) : (
                          <>€{rule.adjustment_value.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">Prioriteit: {rule.priority}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Surge Factors Tab */}
          <TabsContent value="surge" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-semibold">Surge Factors</h2>
                <p className="text-xs text-muted-foreground">Tijdelijke multipliers voor vraag, capaciteit en marktcondities</p>
              </div>
              <Dialog open={createFactorOpen} onOpenChange={setCreateFactorOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Nieuwe Factor</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nieuwe Surge Factor</DialogTitle>
                    <DialogDescription>Maak een tijdelijke prijsmultiplier aan</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Naam</Label>
                      <Input placeholder="Piekmoment vrijdag" value={newFactorName} onChange={(e) => setNewFactorName(e.target.value)} className="h-9" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Type</Label>
                        <Select value={newFactorType} onValueChange={setNewFactorType}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="demand">Vraag</SelectItem>
                            <SelectItem value="capacity">Capaciteit</SelectItem>
                            <SelectItem value="fuel">Brandstof</SelectItem>
                            <SelectItem value="weather">Weer</SelectItem>
                            <SelectItem value="event">Evenement</SelectItem>
                            <SelectItem value="manual">Handmatig</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Multiplier</Label>
                        <Input type="number" step="0.05" min="0.5" max="5.0" placeholder="1.25" value={newFactorMultiplier} onChange={(e) => setNewFactorMultiplier(e.target.value)} className="h-9" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setCreateFactorOpen(false)}>Annuleren</Button>
                    <Button size="sm" onClick={handleCreateFactor} disabled={createFactor.isPending}>
                      {createFactor.isPending ? "Aanmaken..." : "Aanmaken"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Combined Multiplier Card */}
            <Card variant="glass" className="overflow-hidden">
              <CardContent className="p-5 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Gecombineerde Multiplier</p>
                    <p className="text-3xl font-bold mt-0.5">{currentMultiplier.toFixed(2)}x</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{activeFactors.length} actieve factor(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Effect op €100 rit</p>
                    <p className={`text-2xl font-bold ${currentMultiplier > 1 ? 'text-red-600' : currentMultiplier < 1 ? 'text-green-600' : ''}`}>
                      €{(100 * currentMultiplier).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {factorsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : surgeFactors.length === 0 ? (
              <Card variant="glass">
                <CardContent className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-500/5 flex items-center justify-center mx-auto mb-3 border border-red-500/10">
                    <Zap className="h-6 w-6 text-red-500/50" />
                  </div>
                  <h3 className="font-semibold mb-1">Geen surge factors</h3>
                  <p className="text-sm text-muted-foreground mb-4">Maak surge factors aan voor dynamische prijsaanpassingen</p>
                  <Button size="sm" onClick={() => setCreateFactorOpen(true)}>Eerste factor aanmaken</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {surgeFactors.map((factor) => {
                  const FactorIcon = factorTypeLabels[factor.factor_type]?.icon || Settings;
                  return (
                    <Card key={factor.id} variant="glass" className={`transition-all ${!factor.is_active ? 'opacity-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              factor.multiplier > 1 ? 'bg-red-500/10' : 'bg-green-500/10'
                            }`}>
                              <FactorIcon className={`h-5 w-5 ${factor.multiplier > 1 ? 'text-red-500' : 'text-green-500'}`} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium text-sm truncate">{factor.name}</h3>
                              <p className="text-[10px] text-muted-foreground">{factorTypeLabels[factor.factor_type]?.label || factor.factor_type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-lg font-bold ${factor.multiplier > 1 ? 'text-red-600' : factor.multiplier < 1 ? 'text-green-600' : ''}`}>
                              {factor.multiplier.toFixed(2)}x
                            </span>
                            <Switch checked={factor.is_active} onCheckedChange={(checked) => toggleFactor.mutate({ id: factor.id, is_active: checked })} />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ type: 'factor', id: factor.id, name: factor.name })}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Market Analysis Tab */}
          <TabsContent value="market" className="space-y-4">
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />Marktanalyse
                </CardTitle>
                <CardDescription className="text-xs">Real-time vraag/aanbod balans per regio — pas multipliers direct toe</CardDescription>
              </CardHeader>
              <CardContent>
                {marketDemand.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3 border border-primary/10">
                      <Activity className="h-6 w-6 text-primary/50" />
                    </div>
                    <p className="text-sm">Nog geen marktdata beschikbaar</p>
                    <p className="text-xs mt-1">Data wordt automatisch verzameld op basis van transacties</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {marketDemand.map((md) => (
                      <div key={md.id} className="p-3.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-sm">{md.region}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] ${
                              md.balance_ratio > 1.2 ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                              md.balance_ratio < 0.8 ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                              'bg-muted text-muted-foreground border-border'
                            }`}>
                              {md.suggested_multiplier.toFixed(2)}x
                            </Badge>
                            <Button 
                              variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary"
                              onClick={() => handleApplyMarketMultiplier(md.region, md.suggested_multiplier)}
                              disabled={createFactor.isPending}
                            >
                              <Zap className="h-3 w-3" />Toepassen
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Vraag</p>
                            <Progress value={md.demand_score} className="h-1.5" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Capaciteit</p>
                            <Progress value={md.capacity_score} className="h-1.5" />
                          </div>
                        </div>
                        {md.avg_price_per_km && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Gem. €{md.avg_price_per_km.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}/km
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`${deleteTarget?.type === 'rule' ? 'Prijsregel' : 'Surge factor'} verwijderen`}
        description={`Weet je zeker dat je "${deleteTarget?.name}" wilt verwijderen?`}
        onConfirm={handleConfirmDelete}
        isLoading={deleteRule.isPending || deleteFactor.isPending}
      />
    </DashboardLayout>
  );
};

export default DynamicPricing;

import { useState } from "react";
import { 
  TrendingUp, 
  Zap, 
  Settings, 
  Calculator,
  Plus,
  Activity,
  Fuel,
  Cloud,
  Calendar,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
  Euro,
  Percent,
  MapPin,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  usePricingRules,
  useSurgeFactors,
  useMarketDemand,
  usePriceHistory,
  useCalculatePrice,
  useCreatePricingRule,
  useCreateSurgeFactor,
  useToggleSurgeFactor,
  PricingRule,
  SurgeFactor,
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

  // Calculator state
  const [calcOrigin, setCalcOrigin] = useState("");
  const [calcDestination, setCalcDestination] = useState("");
  const [calcDistance, setCalcDistance] = useState("");
  const [calcVehicle, setCalcVehicle] = useState("");
  const [calcResult, setCalcResult] = useState<{
    base_price: number;
    final_price: number;
    surge_multiplier: number;
    adjustments: Array<{ name: string; type: string; value: number }>;
    breakdown: {
      distance_charge: number;
      base_charge: number;
      surge_charge: number;
      discounts: number;
    };
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
  const createFactor = useCreateSurgeFactor();
  const toggleFactor = useToggleSurgeFactor();

  const handleCalculate = async () => {
    if (!calcOrigin || !calcDestination || !calcDistance) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }

    const result = await calculatePrice.mutateAsync({
      origin_city: calcOrigin,
      destination_city: calcDestination,
      distance_km: parseFloat(calcDistance),
      vehicle_type: calcVehicle || undefined,
    });

    setCalcResult(result);
  };

  const handleCreateRule = async () => {
    if (!newRuleName || !newRuleValue) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }

    await createRule.mutateAsync({
      name: newRuleName,
      rule_type: newRuleType as PricingRule['rule_type'],
      adjustment_type: newRuleAdjustmentType as PricingRule['adjustment_type'],
      adjustment_value: parseFloat(newRuleValue),
    });

    setCreateRuleOpen(false);
    setNewRuleName("");
    setNewRuleValue("");
  };

  const handleCreateFactor = async () => {
    if (!newFactorName || !newFactorMultiplier) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }

    await createFactor.mutateAsync({
      name: newFactorName,
      factor_type: newFactorType as SurgeFactor['factor_type'],
      multiplier: parseFloat(newFactorMultiplier),
    });

    setCreateFactorOpen(false);
    setNewFactorName("");
    setNewFactorMultiplier("1.0");
  };

  const activeFactors = surgeFactors.filter(f => f.is_active);
  const currentMultiplier = activeFactors.reduce((acc, f) => acc * f.multiplier, 1);

  return (
    <DashboardLayout title="Dynamic Pricing" description="AI-gestuurde tariefberekening op basis van vraag, aanbod en marktcondities">
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rules.length}</p>
                  <p className="text-xs text-muted-foreground">Prijsregels</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeFactors.length}</p>
                  <p className="text-xs text-muted-foreground">Actieve Factors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  currentMultiplier > 1.2 ? 'bg-red-500/10' : currentMultiplier < 0.9 ? 'bg-green-500/10' : 'bg-blue-500/10'
                }`}>
                  <TrendingUp className={`h-5 w-5 ${
                    currentMultiplier > 1.2 ? 'text-red-500' : currentMultiplier < 0.9 ? 'text-green-500' : 'text-blue-500'
                  }`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentMultiplier.toFixed(2)}x</p>
                  <p className="text-xs text-muted-foreground">Huidige Multiplier</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{priceHistory.length}</p>
                  <p className="text-xs text-muted-foreground">Berekeningen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Settings className="h-4 w-4" />
              Prijsregels
            </TabsTrigger>
            <TabsTrigger value="surge" className="gap-2">
              <Zap className="h-4 w-4" />
              Surge Factors
            </TabsTrigger>
            <TabsTrigger value="market" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Marktanalyse
            </TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Prijs Berekenen
                  </CardTitle>
                  <CardDescription>
                    Bereken real-time tarieven op basis van route, voertuig en marktcondities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ophaaladres</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        <Input
                          placeholder="Amsterdam"
                          value={calcOrigin}
                          onChange={(e) => setCalcOrigin(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Afleveradres</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                        <Input
                          placeholder="Rotterdam"
                          value={calcDestination}
                          onChange={(e) => setCalcDestination(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Afstand (km)</Label>
                      <Input
                        type="number"
                        placeholder="75"
                        value={calcDistance}
                        onChange={(e) => setCalcDistance(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Voertuigtype</Label>
                      <Select value={calcVehicle} onValueChange={setCalcVehicle}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer..." />
                        </SelectTrigger>
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

                  <Button 
                    onClick={handleCalculate} 
                    className="w-full gap-2"
                    disabled={calculatePrice.isPending}
                  >
                    <Calculator className="h-4 w-4" />
                    {calculatePrice.isPending ? "Berekenen..." : "Bereken Prijs"}
                  </Button>
                </CardContent>
              </Card>

              {/* Result */}
              <Card className={`border-border/50 ${calcResult ? 'ring-2 ring-primary/20' : ''}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Resultaat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calcResult ? (
                    <div className="space-y-4">
                      {/* Final Price */}
                      <div className="text-center p-6 bg-primary/5 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Berekende prijs</p>
                        <p className="text-4xl font-bold text-primary">
                          €{calcResult.final_price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                        </p>
                        {calcResult.surge_multiplier > 1 && (
                          <Badge variant="destructive" className="mt-2">
                            <Zap className="h-3 w-3 mr-1" />
                            Surge {calcResult.surge_multiplier}x
                          </Badge>
                        )}
                      </div>

                      <Separator />

                      {/* Breakdown */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Opbouw</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Basisprijs</span>
                            <span>€{calcResult.breakdown.base_charge.toFixed(2)}</span>
                          </div>
                          {calcResult.breakdown.surge_charge > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Surge toeslag</span>
                              <span>+€{calcResult.breakdown.surge_charge.toFixed(2)}</span>
                            </div>
                          )}
                          {calcResult.breakdown.discounts > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Kortingen</span>
                              <span>-€{calcResult.breakdown.discounts.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Applied adjustments */}
                      {calcResult.adjustments.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Toegepaste regels</p>
                            <div className="space-y-1">
                              {calcResult.adjustments.map((adj, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{adj.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {adj.type === 'percentage' ? `${adj.value}%` : 
                                     adj.type === 'surge_factor' ? `${adj.value}x` :
                                     `€${adj.value}`}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Vul de route gegevens in om een prijs te berekenen</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Prijsregels</h2>
                <p className="text-sm text-muted-foreground">
                  Configureer basis-, surge-, korting- en limietregels
                </p>
              </div>
              <Dialog open={createRuleOpen} onOpenChange={setCreateRuleOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nieuwe Regel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Prijsregel</DialogTitle>
                    <DialogDescription>
                      Maak een nieuwe regel aan voor dynamische prijsberekening
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Naam</Label>
                      <Input
                        placeholder="Weekend toeslag"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newRuleType} onValueChange={setNewRuleType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="base">Basis</SelectItem>
                            <SelectItem value="surge">Surge</SelectItem>
                            <SelectItem value="discount">Korting</SelectItem>
                            <SelectItem value="minimum">Minimum</SelectItem>
                            <SelectItem value="maximum">Maximum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Berekening</Label>
                        <Select value={newRuleAdjustmentType} onValueChange={setNewRuleAdjustmentType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Vast bedrag</SelectItem>
                            <SelectItem value="per_km">Per km</SelectItem>
                            <SelectItem value="per_hour">Per uur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Waarde</Label>
                      <Input
                        type="number"
                        placeholder={newRuleAdjustmentType === 'percentage' ? "15" : "25.00"}
                        value={newRuleValue}
                        onChange={(e) => setNewRuleValue(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateRuleOpen(false)}>
                      Annuleren
                    </Button>
                    <Button onClick={handleCreateRule} disabled={createRule.isPending}>
                      {createRule.isPending ? "Aanmaken..." : "Aanmaken"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {rulesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-32 bg-muted/20" />
                  </Card>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Geen prijsregels</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Maak prijsregels aan om dynamische tarieven te berekenen
                  </p>
                  <Button onClick={() => setCreateRuleOpen(true)}>
                    Eerste regel aanmaken
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rules.map((rule) => (
                  <Card key={rule.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{rule.name}</h3>
                          <Badge className={ruleTypeLabels[rule.rule_type]?.color || ''}>
                            {ruleTypeLabels[rule.rule_type]?.label || rule.rule_type}
                          </Badge>
                        </div>
                        <Switch checked={rule.is_active} />
                      </div>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        {rule.adjustment_type === 'percentage' ? (
                          <><Percent className="h-5 w-5" />{rule.adjustment_value}%</>
                        ) : rule.adjustment_type === 'per_km' ? (
                          <>€{rule.adjustment_value}/km</>
                        ) : (
                          <>€{rule.adjustment_value}</>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Prioriteit: {rule.priority}
                      </p>
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
                <h2 className="text-lg font-semibold">Surge Factors</h2>
                <p className="text-sm text-muted-foreground">
                  Tijdelijke multipliers voor vraag, capaciteit, brandstof, weer en evenementen
                </p>
              </div>
              <Dialog open={createFactorOpen} onOpenChange={setCreateFactorOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nieuwe Factor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Surge Factor</DialogTitle>
                    <DialogDescription>
                      Maak een tijdelijke prijsmultiplier aan
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Naam</Label>
                      <Input
                        placeholder="Piekmoment vrijdag"
                        value={newFactorName}
                        onChange={(e) => setNewFactorName(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newFactorType} onValueChange={setNewFactorType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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
                      <div className="space-y-2">
                        <Label>Multiplier</Label>
                        <Input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="5.0"
                          placeholder="1.25"
                          value={newFactorMultiplier}
                          onChange={(e) => setNewFactorMultiplier(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateFactorOpen(false)}>
                      Annuleren
                    </Button>
                    <Button onClick={handleCreateFactor} disabled={createFactor.isPending}>
                      {createFactor.isPending ? "Aanmaken..." : "Aanmaken"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Current Multiplier */}
            <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Gecombineerde Multiplier</p>
                    <p className="text-3xl font-bold">{currentMultiplier.toFixed(2)}x</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeFactors.length} actieve factor(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Effect op €100 rit</p>
                    <p className={`text-2xl font-bold ${
                      currentMultiplier > 1 ? 'text-red-600' : currentMultiplier < 1 ? 'text-green-600' : ''
                    }`}>
                      €{(100 * currentMultiplier).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {factorsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-24 bg-muted/20" />
                  </Card>
                ))}
              </div>
            ) : surgeFactors.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Geen surge factors</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Maak surge factors aan voor dynamische prijsaanpassingen
                  </p>
                  <Button onClick={() => setCreateFactorOpen(true)}>
                    Eerste factor aanmaken
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {surgeFactors.map((factor) => {
                  const FactorIcon = factorTypeLabels[factor.factor_type]?.icon || Settings;
                  return (
                    <Card key={factor.id} className={`border-border/50 ${factor.is_active ? 'ring-1 ring-primary/30' : 'opacity-60'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              factor.multiplier > 1 ? 'bg-red-500/10' : 'bg-green-500/10'
                            }`}>
                              <FactorIcon className={`h-5 w-5 ${
                                factor.multiplier > 1 ? 'text-red-500' : 'text-green-500'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-medium">{factor.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {factorTypeLabels[factor.factor_type]?.label || factor.factor_type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xl font-bold ${
                              factor.multiplier > 1 ? 'text-red-600' : factor.multiplier < 1 ? 'text-green-600' : ''
                            }`}>
                              {factor.multiplier.toFixed(2)}x
                            </span>
                            <Switch 
                              checked={factor.is_active}
                              onCheckedChange={(checked) => toggleFactor.mutate({ id: factor.id, is_active: checked })}
                            />
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
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Marktanalyse
                </CardTitle>
                <CardDescription>
                  Real-time vraag/aanbod balans per regio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {marketDemand.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nog geen marktdata beschikbaar</p>
                    <p className="text-sm">Data wordt automatisch verzameld op basis van transacties</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {marketDemand.map((md) => (
                      <div key={md.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">{md.region}</h4>
                          <Badge variant={md.balance_ratio > 1.2 ? "destructive" : md.balance_ratio < 0.8 ? "default" : "secondary"}>
                            {md.suggested_multiplier.toFixed(2)}x
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Vraag</p>
                            <Progress value={md.demand_score} className="h-2" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Capaciteit</p>
                            <Progress value={md.capacity_score} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DynamicPricing;

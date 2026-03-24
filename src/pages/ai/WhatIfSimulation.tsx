import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  FlaskConical, 
  Plus,
  Play,
  TrendingUp,
  TrendingDown,
  Truck,
  Users,
  Euro,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

interface ScenarioResult {
  [key: string]: string | undefined;
  capacityChange?: string;
  costChange?: string;
  profitImpact?: string;
  utilizationChange?: string;
  marginImpact?: string;
  breakEvenChange?: string;
  recommendedPriceAdjust?: string;
  demandImpact?: string;
  recommendation?: string;
}

interface Scenario {
  id: string;
  name: string;
  type: string;
  status: string;
  results?: ScenarioResult;
  progress?: number;
  createdAt: Date;
}

const mockScenarios: Scenario[] = [
  {
    id: '1',
    name: 'Vloot Uitbreiding Q2',
    type: 'fleet',
    status: 'completed',
    results: {
      capacityChange: '+15%',
      costChange: '+€12,500/maand',
      profitImpact: '+€8,200/maand',
      utilizationChange: '-5%',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: '2',
    name: 'Brandstofprijzen +20%',
    type: 'cost',
    status: 'completed',
    results: {
      marginImpact: '-3.2%',
      costChange: '+€4,800/maand',
      breakEvenChange: '+€0.12/km',
      recommendedPriceAdjust: '+4.5%',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: '3',
    name: 'Piekseizoen December',
    type: 'demand',
    status: 'running',
    progress: 65,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
];

export default function WhatIfSimulation() {
  const [scenarios, setScenarios] = useState<Scenario[]>(mockScenarios);
  const [isCreating, setIsCreating] = useState(false);
  const [newScenario, setNewScenario] = useState({
    name: '',
    type: 'capacity',
    demandChange: [0],
    fleetChange: [0],
    costChange: [0],
    priceChange: [0],
  });

  const runScenario = async () => {
    setIsCreating(true);
    toast.info("Simulatie wordt uitgevoerd...");
    
    const scenario = {
      id: Date.now().toString(),
      name: newScenario.name || 'Nieuwe Simulatie',
      type: newScenario.type,
      status: 'running',
      progress: 0,
      createdAt: new Date(),
    };
    
    setScenarios([scenario, ...scenarios]);
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200));
      setScenarios(prev => prev.map(s => 
        s.id === scenario.id ? { ...s, progress: i } : s
      ));
    }
    
    // Complete with results
    setScenarios(prev => prev.map(s => 
      s.id === scenario.id ? { 
        ...s, 
        status: 'completed',
        progress: undefined,
        results: {
          capacityChange: `${newScenario.fleetChange[0] > 0 ? '+' : ''}${newScenario.fleetChange[0]}%`,
          demandImpact: `${newScenario.demandChange[0] > 0 ? '+' : ''}${newScenario.demandChange[0]}%`,
          profitImpact: `${Math.round((newScenario.demandChange[0] - newScenario.costChange[0]) * 150)}€/maand`,
          recommendation: newScenario.demandChange[0] > newScenario.fleetChange[0] 
            ? 'Overweeg capaciteitsuitbreiding'
            : 'Huidige capaciteit is voldoende',
        }
      } : s
    ));
    
    setIsCreating(false);
    toast.success("Simulatie voltooid!");
    setNewScenario({
      name: '',
      type: 'capacity',
      demandChange: [0],
      fleetChange: [0],
      costChange: [0],
      priceChange: [0],
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'fleet':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><Truck className="h-3 w-3 mr-1" />Vloot</Badge>;
      case 'demand':
        return <Badge variant="outline" className="border-green-500 text-green-500"><TrendingUp className="h-3 w-3 mr-1" />Vraag</Badge>;
      case 'cost':
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><Euro className="h-3 w-3 mr-1" />Kosten</Badge>;
      case 'capacity':
        return <Badge variant="outline" className="border-purple-500 text-purple-500"><BarChart3 className="h-3 w-3 mr-1" />Capaciteit</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout title="What-If Simulatie" description="Scenario planning en capaciteitsvoorspelling">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Scenario */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Nieuwe Simulatie
            </CardTitle>
            <CardDescription>Creëer een what-if scenario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Scenario Naam</Label>
              <Input 
                placeholder="bijv. Vlootuitbreiding Q2"
                value={newScenario.name}
                onChange={(e) => setNewScenario({...newScenario, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={newScenario.type}
                onValueChange={(v) => setNewScenario({...newScenario, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capacity">Capaciteit</SelectItem>
                  <SelectItem value="demand">Vraag</SelectItem>
                  <SelectItem value="fleet">Vloot</SelectItem>
                  <SelectItem value="cost">Kosten</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Vraag Verandering</Label>
                  <span className="text-sm font-medium">{newScenario.demandChange[0] > 0 ? '+' : ''}{newScenario.demandChange[0]}%</span>
                </div>
                <Slider 
                  value={newScenario.demandChange}
                  onValueChange={(v) => setNewScenario({...newScenario, demandChange: v})}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Vloot Verandering</Label>
                  <span className="text-sm font-medium">{newScenario.fleetChange[0] > 0 ? '+' : ''}{newScenario.fleetChange[0]}%</span>
                </div>
                <Slider 
                  value={newScenario.fleetChange}
                  onValueChange={(v) => setNewScenario({...newScenario, fleetChange: v})}
                  min={-50}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Kosten Verandering</Label>
                  <span className="text-sm font-medium">{newScenario.costChange[0] > 0 ? '+' : ''}{newScenario.costChange[0]}%</span>
                </div>
                <Slider 
                  value={newScenario.costChange}
                  onValueChange={(v) => setNewScenario({...newScenario, costChange: v})}
                  min={-30}
                  max={30}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Prijs Aanpassing</Label>
                  <span className="text-sm font-medium">{newScenario.priceChange[0] > 0 ? '+' : ''}{newScenario.priceChange[0]}%</span>
                </div>
                <Slider 
                  value={newScenario.priceChange}
                  onValueChange={(v) => setNewScenario({...newScenario, priceChange: v})}
                  min={-20}
                  max={20}
                  step={1}
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={runScenario}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <FlaskConical className="h-4 w-4 mr-2 animate-pulse" />
                  Simuleren...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Simulatie Starten
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Scenarios List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Simulatie Resultaten</h2>
          
          {scenarios.map(scenario => (
            <Card key={scenario.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{scenario.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getTypeBadge(scenario.type)}
                      {scenario.status === 'running' ? (
                        <Badge variant="outline" className="border-blue-500">
                          <FlaskConical className="h-3 w-3 mr-1 animate-pulse" />
                          Running
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Voltooid
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {scenario.createdAt.toLocaleDateString('nl-NL')}
                  </span>
                </div>

                {scenario.status === 'running' && scenario.progress !== undefined ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Simulatie voortgang</span>
                      <span>{scenario.progress}%</span>
                    </div>
                    <Progress value={scenario.progress} />
                  </div>
                ) : scenario.results ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(scenario.results).map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className={`text-lg font-bold ${
                          String(value).includes('+') ? 'text-green-600' : 
                          String(value).includes('-') ? 'text-red-600' : ''
                        }`}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {scenario.results?.recommendation && (
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Aanbeveling</p>
                      <p className="text-sm text-muted-foreground">{scenario.results.recommendation}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

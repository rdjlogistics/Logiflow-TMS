import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { 
  FlaskConical, 
  Play,
  TrendingUp,
  Truck,
  Euro,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface ScenarioResult {
  [key: string]: string | undefined;
  huidigAantalRitten?: string;
  huidigeOmzet?: string;
  verwachteRittenNaSimulatie?: string;
  verwachteOmzetNaSimulatie?: string;
  vlootCapaciteit?: string;
  bezettingsgraad?: string;
  kostenImpact?: string;
  recommendation?: string;
}

interface Scenario {
  id: string;
  name: string;
  type: string;
  status: string;
  results?: ScenarioResult;
  createdAt: Date;
}

export default function WhatIfSimulation() {
  const { company } = useCompany();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
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
    if (!company?.id) {
      toast.error("Geen bedrijf gevonden.");
      return;
    }

    setIsCreating(true);
    toast.info("Echte data wordt opgehaald voor simulatie...");

    try {
      // Fetch real data from DB
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [tripsRes, vehiclesRes] = await Promise.all([
        supabase
          .from('trips')
          .select('id, price, sales_total, purchase_total, status')
          .eq('company_id', company.id)
          .gte('trip_date', thirtyDaysAgo.toISOString().split('T')[0])
          .lte('trip_date', now.toISOString().split('T')[0]),
        supabase
          .from('vehicles')
          .select('id, is_active')
          .eq('company_id', company.id),
      ]);

      const trips = tripsRes.data || [];
      const vehicles = vehiclesRes.data || [];

      const totalTrips = trips.length;
      const totalRevenue = trips.reduce((sum, t) => sum + (Number(t.sales_total ?? t.price) || 0), 0);
      const totalCost = trips.reduce((sum, t) => sum + (Number(t.purchase_total) || 0), 0);
      const activeVehicles = vehicles.filter(v => v.is_active === true).length;
      const totalVehicles = vehicles.length;
      const occupancy = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

      // Calculate simulation impact
      const demandFactor = 1 + (newScenario.demandChange[0] / 100);
      const fleetFactor = 1 + (newScenario.fleetChange[0] / 100);
      const costFactor = 1 + (newScenario.costChange[0] / 100);
      const priceFactor = 1 + (newScenario.priceChange[0] / 100);

      const projectedTrips = Math.round(totalTrips * demandFactor);
      const projectedRevenue = Math.round(totalRevenue * demandFactor * priceFactor);
      const projectedCost = Math.round(totalCost * costFactor * fleetFactor);
      const projectedFleet = Math.round(totalVehicles * fleetFactor);
      const newOccupancy = projectedFleet > 0 
        ? Math.min(100, Math.round((projectedTrips / (projectedFleet * 1.5)) * 100))
        : 0;

      // Generate recommendation
      let recommendation = '';
      if (demandFactor > fleetFactor && occupancy > 80) {
        recommendation = `Vraag stijgt sneller dan vlootcapaciteit. Overweeg ${Math.ceil(totalVehicles * (demandFactor - fleetFactor))} extra voertuigen.`;
      } else if (projectedRevenue - projectedCost < totalRevenue - totalCost) {
        recommendation = `Let op: nettomarge daalt van €${(totalRevenue - totalCost).toLocaleString('nl-NL')} naar €${(projectedRevenue - projectedCost).toLocaleString('nl-NL')} per maand.`;
      } else if (newOccupancy < 50) {
        recommendation = `Bezettingsgraad is laag (${newOccupancy}%). Overweeg vloot te verkleinen of meer acquisitie.`;
      } else {
        recommendation = `Scenario ziet er positief uit. Verwachte marge: €${(projectedRevenue - projectedCost).toLocaleString('nl-NL')}/maand.`;
      }

      const scenario: Scenario = {
        id: Date.now().toString(),
        name: newScenario.name || 'Nieuwe Simulatie',
        type: newScenario.type,
        status: 'completed',
        createdAt: new Date(),
        results: {
          huidigAantalRitten: `${totalTrips} ritten/maand`,
          huidigeOmzet: `€${totalRevenue.toLocaleString('nl-NL')}`,
          verwachteRittenNaSimulatie: `${projectedTrips} ritten/maand`,
          verwachteOmzetNaSimulatie: `€${projectedRevenue.toLocaleString('nl-NL')}`,
          vlootCapaciteit: `${totalVehicles} → ${projectedFleet} voertuigen`,
          bezettingsgraad: `${occupancy}% → ${newOccupancy}%`,
          kostenImpact: `€${totalCost.toLocaleString('nl-NL')} → €${projectedCost.toLocaleString('nl-NL')}`,
          recommendation,
        },
      };

      setScenarios(prev => [scenario, ...prev]);
      toast.success("Simulatie voltooid op basis van echte data!");
      setNewScenario({
        name: '',
        type: 'capacity',
        demandChange: [0],
        fleetChange: [0],
        costChange: [0],
        priceChange: [0],
      });
    } catch (err) {
      console.error('Simulation error:', err);
      toast.error("Fout bij ophalen van data voor simulatie.");
    } finally {
      setIsCreating(false);
    }
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
    <DashboardLayout title="What-If Simulatie" description="Scenario planning op basis van echte bedrijfsdata">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Scenario */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Nieuwe Simulatie
            </CardTitle>
            <CardDescription>Bereken impact op basis van echte data</CardDescription>
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Data ophalen...
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
          
          {scenarios.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nog geen simulaties uitgevoerd. Stel de parameters in en klik op "Simulatie Starten".</p>
              </CardContent>
            </Card>
          )}

          {scenarios.map(scenario => (
            <Card key={scenario.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{scenario.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getTypeBadge(scenario.type)}
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Voltooid
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {scenario.createdAt.toLocaleDateString('nl-NL')}
                  </span>
                </div>

                {scenario.results && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(scenario.results)
                      .filter(([key]) => key !== 'recommendation')
                      .map(([key, value]) => (
                        <div key={key} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className={`text-sm font-bold ${
                            String(value).includes('+') ? 'text-green-600' : 
                            String(value).includes('-') ? 'text-red-600' : ''
                          }`}>
                            {value}
                          </p>
                        </div>
                    ))}
                  </div>
                )}

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

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMaintenancePredictions } from "@/hooks/useMaintenancePredictions";
import { useFleetManagement } from "@/hooks/useFleetManagement";
import { 
  Wrench, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Gauge,
  Activity,
  Calendar,
  TrendingUp,
  Bell,
  Loader2
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

export default function PredictiveMaintenance() {
  const { activePredictions, predictions, isLoading, stats, acknowledgePrediction, scheduleMaintenance } = useMaintenancePredictions();
  const { vehicles } = useFleetManagement();
  
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [scheduledDate, setScheduledDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Kritiek</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">Hoog</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white">Gemiddeld</Badge>;
      case 'low':
        return <Badge variant="secondary">Laag</Badge>;
      default:
        return <Badge variant="outline">Onbekend</Badge>;
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'bg-green-500';
    if (health >= 70) return 'bg-amber-500';
    if (health >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Calculate vehicle health based on predictions
  const vehicleHealth = vehicles?.map(v => {
    const vehiclePredictions = predictions.filter(p => p.vehicle_id === v.id && !p.is_acknowledged);
    const criticalCount = vehiclePredictions.filter(p => p.severity === 'critical').length;
    const highCount = vehiclePredictions.filter(p => p.severity === 'high').length;
    const health = Math.max(0, 100 - (criticalCount * 25) - (highCount * 10) - (vehiclePredictions.length * 5));
    
    return {
      id: v.id,
      plate: v.license_plate,
      health,
      issues: vehiclePredictions.length,
      nextService: v.apk_expiry_date ? parseISO(v.apk_expiry_date) : addDays(new Date(), 30),
    };
  }) || [];

  const handleScheduleMaintenance = () => {
    if (!selectedPrediction) return;
    
    const basedOn = selectedPrediction.based_on_json as Record<string, unknown> | null;
    const component = (basedOn?.component as string) || selectedPrediction.prediction_type || 'Onderhoud';
    
    scheduleMaintenance.mutate({
      predictionId: selectedPrediction.id,
      vehicleId: selectedPrediction.vehicle_id,
      description: `${component}: ${selectedPrediction.recommended_action || 'Preventief onderhoud'}`,
      scheduledDate,
      estimatedCost: selectedPrediction.estimated_cost || 0,
    }, {
      onSuccess: () => {
        setScheduleDialogOpen(false);
        setSelectedPrediction(null);
      }
    });
  };

  const handleAcknowledge = (predictionId: string) => {
    acknowledgePrediction.mutate(predictionId);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Predictive Maintenance" description="AI-gestuurde onderhoudsvoorspellingen">
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Predictive Maintenance" description="AI-gestuurde onderhoudsvoorspellingen">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Actieve waarschuwingen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-sm text-muted-foreground">Kritieke issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">€{stats.estimatedSavings.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Geschatte besparing</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgAccuracy}%</p>
                  <p className="text-sm text-muted-foreground">Gem. nauwkeurigheid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="predictions">
          <TabsList>
            <TabsTrigger value="predictions">Voorspellingen</TabsTrigger>
            <TabsTrigger value="fleet">Vloot Gezondheid</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            {activePredictions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                  <h3 className="font-medium text-lg mb-1">Geen actieve voorspellingen</h3>
                  <p className="text-muted-foreground">Alle voertuigen zijn in goede conditie</p>
                </CardContent>
              </Card>
            ) : (
              activePredictions
                .sort((a, b) => {
                  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                  return (severityOrder[a.severity || 'low'] || 4) - (severityOrder[b.severity || 'low'] || 4);
                })
                .map(prediction => {
                  const basedOn = prediction.based_on_json as Record<string, unknown> | null;
                  const component = (basedOn?.component as string) || prediction.prediction_type || 'Component';
                  const predictedIssue = (basedOn?.issue as string) || 'Mogelijke storing';
                  const dataSource = (basedOn?.source as string) || 'AI Analyse';
                  const mileage = (basedOn?.mileage as number) || 0;
                  
                  return (
                    <Card key={prediction.id} className={
                      prediction.severity === 'critical' ? 'border-red-500 border-2' : ''
                    }>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-lg bg-muted">
                              <Truck className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold">{prediction.vehicle?.license_plate || 'Onbekend'}</span>
                                {getSeverityBadge(prediction.severity)}
                              </div>
                              <h3 className="font-medium">{component}</h3>
                              <p className="text-sm text-muted-foreground">{predictedIssue}</p>
                              
                              <div className="flex items-center gap-4 mt-3 text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    Verwacht: {prediction.predicted_failure_date 
                                      ? format(parseISO(prediction.predicted_failure_date), "d MMM yyyy", { locale: nl })
                                      : 'Binnenkort'}
                                  </span>
                                </div>
                                {mileage > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Gauge className="h-4 w-4 text-muted-foreground" />
                                    <span>{mileage.toLocaleString()} km</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-muted-foreground">Zekerheid</span>
                              <span className="font-bold text-lg">{prediction.confidence_percent || 0}%</span>
                            </div>
                            <Progress value={prediction.confidence_percent || 0} className="w-24 h-2" />
                            {prediction.estimated_cost && (
                              <p className="text-lg font-bold text-primary mt-2">
                                €{prediction.estimated_cost.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {prediction.recommended_action && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Wrench className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Aanbevolen actie</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">{prediction.recommended_action}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  Bron: {dataSource}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-4">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setSelectedPrediction(prediction);
                              setScheduleDialogOpen(true);
                            }}
                          >
                            Plan Onderhoud
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAcknowledge(prediction.id)}
                            disabled={acknowledgePrediction.isPending}
                          >
                            Negeer (30 dagen)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </TabsContent>

          <TabsContent value="fleet" className="space-y-4">
            {vehicleHealth.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium text-lg mb-1">Geen voertuigen</h3>
                  <p className="text-muted-foreground">Voeg eerst voertuigen toe aan je vloot</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {vehicleHealth.map(vehicle => (
                  <Card key={vehicle.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Truck className="h-5 w-5" />
                          </div>
                          <span className="font-bold">{vehicle.plate}</span>
                        </div>
                        {vehicle.issues > 0 && (
                          <Badge variant="outline">{vehicle.issues} issue{vehicle.issues > 1 ? 's' : ''}</Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Gezondheid</span>
                            <span className="font-medium">{vehicle.health}%</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getHealthColor(vehicle.health)} transition-all`}
                              style={{ width: `${vehicle.health}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Volgende service</span>
                          <span className="font-medium">
                            {format(vehicle.nextService, "d MMM", { locale: nl })}
                          </span>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full mt-4" size="sm">
                        Bekijk Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Schedule Maintenance Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onderhoud Inplannen</DialogTitle>
              <DialogDescription>
                Plan preventief onderhoud voor {selectedPrediction?.vehicle?.license_plate}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPrediction && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">
                    {(selectedPrediction.based_on_json as any)?.component || selectedPrediction.prediction_type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPrediction.recommended_action}
                  </p>
                  {selectedPrediction.estimated_cost && (
                    <p className="text-sm font-medium mt-2">
                      Geschatte kosten: €{selectedPrediction.estimated_cost.toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Datum inplannen</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={handleScheduleMaintenance}
                disabled={scheduleMaintenance.isPending}
              >
                {scheduleMaintenance.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Inplannen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

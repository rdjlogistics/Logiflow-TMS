import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Satellite, Plus, Settings, RefreshCw, CheckCircle, 
  Truck, MapPin, Activity, Gauge, Fuel, Clock, Loader2, Info
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const providers = [
  { id: 'tomtom', name: 'TomTom Telematics', logo: '🗺️', description: 'Webfleet Solutions' },
  { id: 'fleetboard', name: 'Fleetboard', logo: '🚛', description: 'Daimler Truck' },
  { id: 'webfleet', name: 'Webfleet', logo: '📡', description: 'Bridgestone' },
  { id: 'samsara', name: 'Samsara', logo: '📊', description: 'Connected Operations' },
  { id: 'geotab', name: 'Geotab', logo: '🌐', description: 'Fleet Management' },
];

export default function TelematicsIntegration() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [syncInterval, setSyncInterval] = useState('5');

  // Fetch connections from database
  const { data: connections = [] } = useQuery({
    queryKey: ['telematics-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telematics_connections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        id: c.id,
        provider: c.provider,
        name: c.name,
        isActive: c.is_active,
        lastSync: c.last_sync_at ? new Date(c.last_sync_at).toLocaleString('nl-NL') : 'Wacht op activatie',
        vehiclesLinked: c.vehicles_linked ?? 0,
        status: c.status,
      }));
    },
  });

  // Fetch real vehicles from database
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['telematics-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, license_plate, brand, model, vehicle_type, mileage_km')
        .order('license_plate')
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch active trips with driver info for "live" status
  const { data: activeTrips = [] } = useQuery({
    queryKey: ['telematics-active-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('id, vehicle_id, status, drivers(name)')
        .in('status', ['onderweg', 'geladen', 'gepland'])
        .is('deleted_at', null)
        .not('vehicle_id', 'is', null)
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const handleAddConnection = async () => {
    if (!selectedProvider || !apiKey) { toast.error("Vul alle velden in"); return; }
    const provider = providers.find(p => p.id === selectedProvider);
    try {
      const { error } = await supabase
        .from('telematics_connections')
        .insert({
          provider: selectedProvider,
          name: provider?.name || selectedProvider,
          sync_interval_minutes: parseInt(syncInterval) || 5,
          status: 'pending_activation',
          is_active: false,
        });
      if (error) throw error;
      toast.info(`${provider?.name} configuratie opgeslagen — koppeling vereist activatie bij de provider`);
      queryClient.invalidateQueries({ queryKey: ['telematics-connections'] });
      setIsAddDialogOpen(false);
      setSelectedProvider('');
      setApiKey('');
    } catch (err: any) {
      toast.error("Opslaan mislukt", { description: err.message });
    }
  };

  const toggleConnection = async (id: string) => {
    const conn = connections.find((c: any) => c.id === id);
    if (!conn) return;
    const { error } = await supabase
      .from('telematics_connections')
      .update({ is_active: !conn.isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) queryClient.invalidateQueries({ queryKey: ['telematics-connections'] });
  };

  // Build vehicle status from active trips
  const vehiclesWithStatus = vehicles.map(v => {
    const trip = activeTrips.find((t: any) => t.vehicle_id === v.id);
    return {
      ...v,
      driverName: trip ? (trip.drivers as any)?.name ?? '—' : '—',
      tripStatus: trip?.status ?? 'idle',
    };
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'onderweg': return 'Rijdend';
      case 'geladen': return 'Geladen';
      case 'gepland': return 'Gepland';
      default: return 'Stilstand';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'onderweg': return 'bg-green-500';
      case 'geladen': return 'bg-blue-500';
      case 'gepland': return 'bg-amber-500';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <DashboardLayout title="Telematics Integratie" description="Koppel boordcomputers en telematica systemen">
      <Tabs defaultValue="live-data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="live-data">Voertuigen</TabsTrigger>
          <TabsTrigger value="connections">Koppelingen</TabsTrigger>
        </TabsList>

        <TabsContent value="live-data" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Truck className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{vehicles.length}</p>
                    <p className="text-sm text-muted-foreground">Voertuigen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10"><Activity className="h-5 w-5 text-green-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{activeTrips.filter((t: any) => t.status === 'onderweg').length}</p>
                    <p className="text-sm text-muted-foreground">Onderweg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10"><MapPin className="h-5 w-5 text-blue-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{activeTrips.length}</p>
                    <p className="text-sm text-muted-foreground">Actieve ritten</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10"><Satellite className="h-5 w-5 text-amber-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{connections.filter(c => c.isActive).length}</p>
                    <p className="text-sm text-muted-foreground">Koppelingen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Voertuig Overzicht</CardTitle>
              <CardDescription>Alle voertuigen uit uw vloot met actuele status</CardDescription>
            </CardHeader>
            <CardContent>
              {vehiclesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Geen voertuigen gevonden</p>
                  <p className="text-sm">Voeg voertuigen toe via Vlootbeheer</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kenteken</TableHead>
                      <TableHead>Voertuig</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Chauffeur</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>KM-stand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehiclesWithStatus.map(vehicle => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.license_plate}</TableCell>
                        <TableCell>{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}</TableCell>
                        <TableCell>{vehicle.vehicle_type || '—'}</TableCell>
                        <TableCell>{vehicle.driverName}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(vehicle.tripStatus)} text-white`}>
                            {getStatusLabel(vehicle.tripStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.mileage_km ? `${vehicle.mileage_km.toLocaleString('nl-NL')} km` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {connections.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Koppel een telematica provider via het tabblad "Koppelingen" voor live GPS data, snelheid en brandstofniveaus.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Telematica Providers</h2>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Nieuwe Koppeling</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Telematica Provider Koppelen</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger><SelectValue placeholder="Selecteer provider" /></SelectTrigger>
                      <SelectContent>
                        {providers.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2"><span>{p.logo}</span><span>{p.name}</span></span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" placeholder="Voer API key in" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sync Interval (minuten)</Label>
                    <Select value={syncInterval} onValueChange={setSyncInterval}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minuut</SelectItem>
                        <SelectItem value="5">5 minuten</SelectItem>
                        <SelectItem value="15">15 minuten</SelectItem>
                        <SelectItem value="30">30 minuten</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleAddConnection}>Koppeling Toevoegen</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {providers.map(provider => {
              const connection = connections.find(c => c.provider === provider.id);
              return (
                <Card key={provider.id} className={connection?.isActive ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{provider.logo}</span>
                        <div>
                          <CardTitle className="text-base">{provider.name}</CardTitle>
                          <CardDescription>{provider.description}</CardDescription>
                        </div>
                      </div>
                      {connection && (
                        <Badge variant={connection.isActive ? "default" : "secondary"}>
                          {connection.isActive ? 'Actief' : 'Inactief'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {connection ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <span className="flex items-center gap-1">
                            {connection.status === 'connected' ? (
                              <><CheckCircle className="h-4 w-4 text-green-500" /> Verbonden</>
                            ) : (
                              <><Clock className="h-4 w-4 text-amber-500" /> Wacht op activatie</>
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm"><Settings className="h-4 w-4" /></Button>
                          <Switch checked={connection.isActive} onCheckedChange={() => toggleConnection(connection.id)} />
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={() => { setSelectedProvider(provider.id); setIsAddDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />Koppelen
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

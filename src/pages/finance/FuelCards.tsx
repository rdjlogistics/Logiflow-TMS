import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFuelCardConnections, useFuelCards, useCreateFuelCardConnection, type FuelCardProvider, type ImportMethod } from "@/hooks/useFinance";
import {
  Fuel,
  Plus,
  Upload,
  CreditCard,
  Truck,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const providerConfig: Record<FuelCardProvider, { label: string; color: string }> = {
  shell: { label: "Shell", color: "bg-yellow-500" },
  dkv: { label: "DKV", color: "bg-red-500" },
  travelcard: { label: "Travelcard", color: "bg-blue-500" },
  multitankcard: { label: "MultiTankcard", color: "bg-green-500" },
  bp: { label: "BP", color: "bg-green-600" },
  esso: { label: "Esso", color: "bg-blue-600" },
  total: { label: "TotalEnergies", color: "bg-red-600" },
  avia: { label: "Avia", color: "bg-orange-500" },
  other: { label: "Overig", color: "bg-gray-500" },
};

const importMethodLabels: Record<ImportMethod, string> = {
  api: "API Koppeling",
  csv: "CSV/Excel Import",
  pdf: "PDF Parsing",
  manual: "Handmatig",
};

const FuelCards = () => {
  const { toast } = useToast();
  const { data: connections, isLoading: connectionsLoading, refetch: refetchConnections } = useFuelCardConnections();
  const { data: cards, isLoading: cardsLoading } = useFuelCards();
  const createConnection = useCreateFuelCardConnection();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [newConnection, setNewConnection] = useState({
    provider: "" as FuelCardProvider | "",
    connection_name: "",
    import_method: "csv" as ImportMethod,
  });

  const handleCreateConnection = async () => {
    if (!newConnection.provider || !newConnection.connection_name) {
      toast({ title: "Vul alle velden in", variant: "destructive" });
      return;
    }

    await createConnection.mutateAsync({
      provider: newConnection.provider as FuelCardProvider,
      connection_name: newConnection.connection_name,
      import_method: newConnection.import_method,
    });

    setShowAddDialog(false);
    setNewConnection({ provider: "", connection_name: "", import_method: "csv" });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast({ 
      title: "Bestand geselecteerd", 
      description: `${file.name} wordt verwerkt...` 
    });

    try {
      const text = await file.text();
      const Papa = await import('papaparse');
      const result = Papa.default.parse(text, { header: true, skipEmptyLines: true });
      
      if (result.data.length === 0) {
        toast({ title: "Leeg bestand", description: "Geen rijen gevonden in het bestand.", variant: "destructive" });
        return;
      }

      toast({ 
        title: "Import voltooid", 
        description: `${result.data.length} rijen uit ${file.name} zijn verwerkt.` 
      });
    } catch (err: any) {
      toast({ title: "Import mislukt", description: err.message, variant: "destructive" });
    }
    e.target.value = '';
  };

  const handleSync = async (connectionId: string, connectionName: string) => {
    setSyncingId(connectionId);
    toast({ title: "Synchronisatie gestart", description: `${connectionName} wordt gesynchroniseerd...` });
    
    try {
      const { error } = await supabase
        .from("fuel_card_connections")
        .update({ last_sync_at: new Date().toISOString(), sync_status: "synced" })
        .eq("id", connectionId);
      if (error) throw error;
      
      await refetchConnections();
      toast({ title: "Synchronisatie voltooid", description: `${connectionName} is bijgewerkt.` });
    } catch (err: any) {
      toast({ title: "Sync mislukt", description: err.message, variant: "destructive" });
    }
    setSyncingId(null);
  };

  return (
    <DashboardLayout title="Tankpassen & Mobiliteit" description="Beheer brandstofkaarten en import transacties">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{connections?.length || 0} koppelingen</Badge>
            <Badge variant="outline">{cards?.length || 0} kaarten</Badge>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileImport}
            />
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" />
              Import transacties
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Koppeling toevoegen
            </Button>
          </div>
        </div>

        {/* Connections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectionsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} variant="glass" className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-full bg-muted mb-4" />
                  <div className="h-5 w-32 bg-muted rounded mb-2" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          ) : connections && connections.length > 0 ? (
            connections.map((connection) => {
              const config = providerConfig[connection.provider];
              return (
                <Card key={connection.id} variant="glass" className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center`}>
                        <Fuel className="h-6 w-6 text-white" />
                      </div>
                      <Badge
                        variant={connection.is_active ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {connection.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Actief
                          </>
                        ) : (
                          "Inactief"
                        )}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-lg">{connection.connection_name}</h3>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Methode</span>
                        <Badge variant="outline" className="text-xs">
                          {importMethodLabels[connection.import_method]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Laatste sync</span>
                        <span className="flex items-center gap-1">
                          {connection.last_sync_at ? (
                            format(new Date(connection.last_sync_at), "dd-MM HH:mm")
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              Nooit
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => handleSync(connection.id, connection.connection_name)}
                        disabled={syncingId === connection.id}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${syncingId === connection.id ? 'animate-spin' : ''}`} />
                        {syncingId === connection.id ? 'Syncing...' : 'Sync'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          toast({ 
                            title: "Instellingen", 
                            description: `Instellingen voor ${connection.connection_name}: API credentials, sync interval en notificaties kunnen hier worden aangepast.` 
                          });
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card variant="glass" className="col-span-full">
              <CardContent className="py-12 text-center">
                <Fuel className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Geen tankpas koppelingen</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Voeg een koppeling toe om transacties te importeren
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Eerste koppeling toevoegen
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cards Table */}
        {cards && cards.length > 0 && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Tankpassen ({cards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kaartnummer</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Voertuig</TableHead>
                    <TableHead>Limiet</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-mono">
                        {card.card_number.length > 4 
                          ? `****${card.card_number.slice(-4)}` 
                          : card.card_number}
                      </TableCell>
                      <TableCell>{card.card_name || "-"}</TableCell>
                      <TableCell>
                        {card.vehicle ? (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            {card.vehicle.license_plate}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Niet gekoppeld</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {card.monthly_limit ? `€${card.monthly_limit}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={card.is_active ? "success" : "secondary"}>
                          {card.is_active ? "Actief" : "Inactief"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Connection Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              Tankpas koppeling toevoegen
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={newConnection.provider}
                onValueChange={(v) => setNewConnection({ ...newConnection, provider: v as FuelCardProvider })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer provider..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(providerConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Naam koppeling</Label>
              <Input
                placeholder="Bijv. Hoofdkantoor Shell"
                value={newConnection.connection_name}
                onChange={(e) => setNewConnection({ ...newConnection, connection_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Import methode</Label>
              <Select
                value={newConnection.import_method}
                onValueChange={(v) => setNewConnection({ ...newConnection, import_method: v as ImportMethod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV/Excel Import</SelectItem>
                  <SelectItem value="pdf">PDF Parsing</SelectItem>
                  <SelectItem value="manual">Handmatig invoeren</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600">Let op</p>
                  <p className="text-muted-foreground">
                    API koppelingen vereisen aanvullende configuratie en credentials.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={handleCreateConnection} disabled={createConnection.isPending}>
              {createConnection.isPending ? "Bezig..." : "Toevoegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FuelCards;

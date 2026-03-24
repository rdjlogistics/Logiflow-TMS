import { useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Car,
  Wrench,
  FileCheck,
  Calendar,
  Gauge,
  Euro,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Fuel,
} from "lucide-react";
import { Vehicle, useVehicleMaintenance, MaintenanceRecord, APKRecord } from "@/hooks/useFleetManagement";
import { AddMaintenanceDialog } from "./AddMaintenanceDialog";
import { AddAPKDialog } from "./AddAPKDialog";
import { FuelLogDialog } from "./FuelLogDialog";

interface VehicleDetailSheetProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleDetailSheet({ vehicle, open, onOpenChange }: VehicleDetailSheetProps) {
  const [addMaintenanceOpen, setAddMaintenanceOpen] = useState(false);
  const [addAPKOpen, setAddAPKOpen] = useState(false);
  const [fuelLogOpen, setFuelLogOpen] = useState(false);

  const {
    maintenanceRecords,
    maintenanceLoading,
    apkHistory,
    apkLoading,
    maintenanceStats,
    addMaintenance,
    addAPK,
    deleteMaintenance,
    deleteAPK,
  } = useVehicleMaintenance(vehicle?.id || null);

  if (!vehicle) return null;

  const getAPKStatus = () => {
    if (!vehicle.apk_expiry_date) return { status: "unknown", color: "secondary" as const };
    const days = differenceInDays(parseISO(vehicle.apk_expiry_date), new Date());
    if (days < 0) return { status: "Verlopen", color: "destructive" as const };
    if (days <= 7) return { status: `${days} dagen`, color: "destructive" as const };
    if (days <= 30) return { status: `${days} dagen`, color: "warning" as const };
    return { status: "Geldig", color: "default" as const };
  };

  const apkStatus = getAPKStatus();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl font-mono">{vehicle.license_plate}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {vehicle.brand} {vehicle.model} {vehicle.year_of_manufacture && `(${vehicle.year_of_manufacture})`}
                </p>
              </div>
              <Badge variant={vehicle.is_active ? "default" : "secondary"} className="ml-auto">
                {vehicle.is_active ? "Actief" : "Inactief"}
              </Badge>
            </div>
          </SheetHeader>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pb-4">
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-center">
                <Gauge className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {vehicle.mileage_km ? vehicle.mileage_km.toLocaleString() : "-"}
                </p>
                <p className="text-xs text-muted-foreground">km stand</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-center">
                <FileCheck className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <Badge variant={apkStatus.color} className="text-xs">
                  {apkStatus.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">APK status</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-center">
                <Euro className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  €{maintenanceStats.totalCost.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">totaal kosten</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overzicht</TabsTrigger>
              <TabsTrigger value="fuel">Brandstof</TabsTrigger>
              <TabsTrigger value="maintenance">Onderhoud</TabsTrigger>
              <TabsTrigger value="apk">APK</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Voertuig Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium">{vehicle.vehicle_type || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Laadvermogen</p>
                      <p className="font-medium">{vehicle.capacity_kg ? `${vehicle.capacity_kg} kg` : "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bouwjaar</p>
                      <p className="font-medium">{vehicle.year_of_manufacture || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kilometerstand</p>
                      <p className="font-medium">{vehicle.mileage_km ? `${vehicle.mileage_km.toLocaleString()} km` : "-"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Belangrijke Datums
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <span>APK vervalt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {vehicle.apk_expiry_date ? (
                          <>
                            <span className="font-medium">
                              {format(parseISO(vehicle.apk_expiry_date), "d MMM yyyy", { locale: nl })}
                            </span>
                            <Badge variant={apkStatus.color} className="text-xs">
                              {apkStatus.status}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span>Volgende onderhoud</span>
                      </div>
                      <span className="font-medium">
                        {vehicle.next_service_date
                          ? format(parseISO(vehicle.next_service_date), "d MMM yyyy", { locale: nl })
                          : "-"}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>Verzekering verloopt</span>
                      </div>
                      <span className="font-medium">
                        {vehicle.insurance_expiry_date
                          ? format(parseISO(vehicle.insurance_expiry_date), "d MMM yyyy", { locale: nl })
                          : "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {vehicle.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Notities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{vehicle.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="fuel" className="mt-0 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Brandstofregistraties
                  </p>
                  <Button size="sm" onClick={() => setFuelLogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tanken
                  </Button>
                </div>

                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Fuel className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Brandstof registreren</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setFuelLogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Tankbeurt toevoegen
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="maintenance" className="mt-0 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {maintenanceRecords.length} onderhoudsrecords
                  </p>
                  <Button size="sm" onClick={() => setAddMaintenanceOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Toevoegen
                  </Button>
                </div>

                {maintenanceRecords.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Wrench className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Geen onderhoudshistorie</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setAddMaintenanceOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Eerste onderhoud toevoegen
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {maintenanceRecords.map((record) => (
                      <MaintenanceRecordCard
                        key={record.id}
                        record={record}
                        onDelete={() => deleteMaintenance(record.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="apk" className="mt-0 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {apkHistory.length} APK registraties
                  </p>
                  <Button size="sm" onClick={() => setAddAPKOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Toevoegen
                  </Button>
                </div>

                {apkHistory.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <FileCheck className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Geen APK historie</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setAddAPKOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Eerste APK toevoegen
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {apkHistory.map((record) => (
                      <APKRecordCard
                        key={record.id}
                        record={record}
                        onDelete={() => deleteAPK(record.id)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AddMaintenanceDialog
        open={addMaintenanceOpen}
        onOpenChange={setAddMaintenanceOpen}
        vehicleId={vehicle.id}
        onAdd={addMaintenance}
      />

      <AddAPKDialog
        open={addAPKOpen}
        onOpenChange={setAddAPKOpen}
        vehicleId={vehicle.id}
        onAdd={addAPK}
      />

      <FuelLogDialog
        open={fuelLogOpen}
        onOpenChange={setFuelLogOpen}
        vehicleId={vehicle.id}
        vehiclePlate={vehicle.license_plate}
      />
    </>
  );
}

function MaintenanceRecordCard({ record, onDelete }: { record: MaintenanceRecord; onDelete: () => void }) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{record.maintenance_type}</p>
              {record.description && (
                <p className="text-sm text-muted-foreground">{record.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(record.performed_at), "d MMM yyyy", { locale: nl })}
                </span>
                {record.mileage_at_service && (
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    {record.mileage_at_service.toLocaleString()} km
                  </span>
                )}
                {record.cost && (
                  <span className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    €{record.cost.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function APKRecordCard({ record, onDelete }: { record: APKRecord; onDelete: () => void }) {
  const getResultBadge = () => {
    switch (record.result) {
      case "approved":
        return { icon: CheckCircle2, label: "Goedgekeurd", variant: "default" as const };
      case "rejected":
        return { icon: XCircle, label: "Afgekeurd", variant: "destructive" as const };
      case "conditional":
        return { icon: AlertTriangle, label: "Voorwaardelijk", variant: "warning" as const };
      default:
        return { icon: Clock, label: record.result, variant: "secondary" as const };
    }
  };

  const result = getResultBadge();
  const ResultIcon = result.icon;

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center mt-0.5 ${
              record.result === "approved" ? "bg-green-500/10" :
              record.result === "rejected" ? "bg-destructive/10" : "bg-yellow-500/10"
            }`}>
              <ResultIcon className={`h-5 w-5 ${
                record.result === "approved" ? "text-green-600" :
                record.result === "rejected" ? "text-destructive" : "text-yellow-600"
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">APK Keuring</p>
                <Badge variant={result.variant}>{result.label}</Badge>
              </div>
              {record.station_name && (
                <p className="text-sm text-muted-foreground">{record.station_name}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(record.apk_date), "d MMM yyyy", { locale: nl })}
                </span>
                <span>→</span>
                <span>Geldig tot {format(parseISO(record.expiry_date), "d MMM yyyy", { locale: nl })}</span>
                {record.mileage_at_apk && (
                  <span className="flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    {record.mileage_at_apk.toLocaleString()} km
                  </span>
                )}
              </div>
              {record.remarks && (
                <p className="text-sm text-muted-foreground mt-2">{record.remarks}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

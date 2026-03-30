import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Plus, Pencil, Trash2, Search, Loader2, MapPin, Calendar, Truck, Euro, CheckSquare } from "lucide-react";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { IncomingDispatchesPanel } from "@/components/orders/IncomingDispatchesPanel";
import { TripFormDialog } from "@/components/trips/TripFormDialog";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { SwipeableCard, swipeActions } from "@/components/ui/swipeable-card";
import { BulkActionBar } from "@/components/trips/BulkActionBar";
import { Checkbox } from "@/components/ui/checkbox";

type TripStatus = "offerte" | "aanvraag" | "draft" | "gepland" | "geladen" | "onderweg" | "afgeleverd" | "afgerond" | "gecontroleerd" | "gefactureerd" | "geannuleerd";

interface Trip {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  trip_date: string;
  pickup_address: string;
  pickup_postal_code: string | null;
  pickup_city: string | null;
  pickup_house_number?: string | null;
  pickup_country?: string | null;
  pickup_company_name?: string | null;
  pickup_contact_person?: string | null;
  pickup_phone?: string | null;
  pickup_time_from?: string | null;
  pickup_time_to?: string | null;
  pickup_remarks?: string | null;
  delivery_address: string;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_house_number?: string | null;
  delivery_country?: string | null;
  delivery_company_name?: string | null;
  delivery_contact_person?: string | null;
  delivery_phone?: string | null;
  delivery_time_from?: string | null;
  delivery_time_to?: string | null;
  delivery_remarks?: string | null;
  cargo_description: string | null;
  weight_kg: number | null;
  distance_km: number | null;
  price: number | null;
  status: TripStatus;
  notes: string | null;
  customer_reference?: string | null;
  waybill_number?: string | null;
  cmr_number?: string | null;
  save_pickup_to_addressbook?: boolean;
  save_delivery_to_addressbook?: boolean;
  customers?: { company_name: string } | null;
  vehicles?: { license_plate: string } | null;
}

interface Customer {
  id: string;
  company_name: string;
}

interface Vehicle {
  id: string;
  license_plate: string;
  brand: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

const statusColors: Record<TripStatus, string> = {
  offerte: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  aanvraag: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  draft: "bg-muted/30 text-muted-foreground",
  gepland: "bg-primary/10 text-primary",
  geladen: "bg-warning/10 text-warning",
  onderweg: "bg-warning/10 text-warning",
  afgeleverd: "bg-success/10 text-success",
  afgerond: "bg-success/10 text-success",
  gecontroleerd: "bg-accent/10 text-accent-foreground",
  gefactureerd: "bg-muted/30 text-muted-foreground",
  geannuleerd: "bg-destructive/10 text-destructive",
};

const Trips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { canDelete, canManageTrips } = usePermissions();
  const isMobile = useIsMobile();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTrips.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTrips.map(t => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tripsRes, customersRes, vehiclesRes] = await Promise.all([
        supabase
          .from("trips")
          .select("*, customers(company_name), vehicles(license_plate)")
          .is("deleted_at", null)
          .order("trip_date", { ascending: false }),
        supabase.from("customers").select("id, company_name").order("company_name"),
        supabase.from("vehicles").select("id, license_plate, brand").eq("is_active", true).order("license_plate"),
      ]);

      if (tripsRes.error) throw tripsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      setTrips((tripsRes.data || []) as unknown as Trip[]);
      setCustomers(customersRes.data || []);
      setVehicles(vehiclesRes.data || []);
    } catch {
      toast({
        title: "Fout bij ophalen gegevens",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTripToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) return;

    try {
      const { error } = await supabase.from("trips").delete().eq("id", tripToDelete);
      if (error) throw error;
      toast({ title: "Rit verwijderd" });
      fetchData();
    } catch {
      toast({
        title: "Fout bij verwijderen",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setTripToDelete(null);
    }
  };

  const filteredTrips = trips.filter(
    (t) =>
      t.pickup_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.delivery_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customers?.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.waybill_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filteredTrips.length === 0) {
      toast({ title: "Geen ritten om te exporteren", variant: "destructive" });
      return;
    }
    const headers = ["ID", "Datum", "Klant", "Afhaaladres", "Afleveradres", "Status", "Voertuig", "Prijs"];
    const rows = filteredTrips.map((t) => [
      t.id.slice(0, 8),
      t.trip_date || "",
      t.customers?.company_name || "",
      [t.pickup_address, t.pickup_city].filter(Boolean).join(", "),
      [t.delivery_address, t.delivery_city].filter(Boolean).join(", "),
      t.status || "",
      t.vehicles?.license_plate || "",
      t.price != null ? String(t.price) : "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ritten-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV gedownload", description: `${filteredTrips.length} rit(ten) geëxporteerd` });
  };

  const openNewDialog = () => {
    setEditingTrip(null);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout title="Ritten">
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <IncomingDispatchesPanel />
        </motion.div>

        <div className="space-y-6">
          <motion.div variants={itemVariants} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek ritten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full text-base"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {isMobile && (
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) clearSelection(); }}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <CheckSquare className="h-4 w-4" />
                  {selectionMode ? "Klaar" : "Selecteer"}
                </Button>
              )}
              <Button variant="outline" onClick={handleExportCSV} className="gap-2 flex-1 sm:flex-none">
                <Download className="h-4 w-4" />
                CSV
              </Button>
              {canManageTrips && (
                <Button onClick={openNewDialog} className="flex-1 sm:flex-none">
                  <Plus className="mr-2 h-4 w-4" />
                  Nieuwe rit
                </Button>
              )}
            </div>
          </motion.div>

          <TripFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editingTrip={editingTrip}
            customers={customers}
            vehicles={vehicles}
            onSuccess={fetchData}
          />

          <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-border/40 bg-card/90 backdrop-blur-sm shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
            <CardHeader className="relative pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg font-semibold">Ritten ({filteredTrips.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative p-2 sm:p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </div>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Truck className="h-8 w-8 opacity-30" />
                  </div>
                  <p className="font-medium">{searchTerm ? "Geen ritten gevonden" : "Nog geen ritten toegevoegd"}</p>
                </div>
              ) : isMobile ? (
                /* Mobile card view - Pull-to-refresh + Swipe gestures */
                <PullToRefresh onRefresh={async () => { await fetchData(); }}>
                  <motion.div
                    className="space-y-3 p-1"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {filteredTrips.map((trip) => (
                      <motion.div key={trip.id} variants={itemVariants} className="relative">
                      {selectionMode && (
                        <div className="absolute left-2 top-2 z-10">
                          <Checkbox
                            checked={selectedIds.has(trip.id)}
                            onCheckedChange={() => toggleSelect(trip.id)}
                            className="h-5 w-5 border-2"
                          />
                        </div>
                      )}
                      <SwipeableCard
                        leftActions={[swipeActions.more(() => handleEdit(trip))]}
                        rightActions={canDelete ? [swipeActions.delete(() => handleDeleteClick(trip.id))] : []}
                      >
                        <Card className="relative overflow-hidden border-border/40 bg-gradient-to-br from-card to-muted/20 shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-lg">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-sm">
                                  {format(new Date(trip.trip_date), "d MMM yyyy", { locale: nl })}
                                </span>
                              </div>
                              <Badge className={`${statusColors[trip.status]} font-semibold px-3 py-1`} variant="secondary">
                                {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                              </Badge>
                            </div>

                            {trip.customers?.company_name && (
                              <div className="font-semibold text-base mb-2">
                                {trip.customers.company_name}
                              </div>
                            )}

                            {trip.customer_reference && (
                              <div className="text-xs text-muted-foreground mb-2">
                                Ref: {trip.customer_reference}
                              </div>
                            )}

                            <div className="space-y-2 text-sm mb-4">
                              <div className="flex items-start gap-3 p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <MapPin className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                                <div>
                                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                    {trip.pickup_company_name || trip.pickup_city || trip.pickup_address}
                                  </span>
                                  {trip.pickup_time_from && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {trip.pickup_time_from}{trip.pickup_time_to && ` - ${trip.pickup_time_to}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-start gap-3 p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <MapPin className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                                <div>
                                  <span className="font-medium text-blue-700 dark:text-blue-400">
                                    {trip.delivery_company_name || trip.delivery_city || trip.delivery_address}
                                  </span>
                                  {trip.delivery_time_from && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {trip.delivery_time_from}{trip.delivery_time_to && ` - ${trip.delivery_time_to}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                              {trip.vehicles?.license_plate && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-mono font-medium">{trip.vehicles.license_plate}</span>
                                </div>
                              )}
                              {trip.price && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                  <Euro className="h-4 w-4 text-emerald-600" />
                                  <span className="font-bold text-emerald-700 dark:text-emerald-400">€{trip.price.toFixed(2)}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-border/40">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 rounded-xl min-h-[44px]"
                                onClick={() => handleEdit(trip)}
                              >
                                <Pencil className="h-4 w-4 mr-1.5" />
                                Bewerken
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-xl min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteClick(trip.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </SwipeableCard>
                      </motion.div>
                    ))}
                  </motion.div>
                </PullToRefresh>
              ) : (
                /* Desktop table view */
                <div className="overflow-x-auto rounded-xl">
                  <Table>
                     <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={filteredTrips.length > 0 && selectedIds.size === filteredTrips.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Klant</TableHead>
                        <TableHead>Referentie</TableHead>
                        <TableHead>Van</TableHead>
                        <TableHead>Naar</TableHead>
                        <TableHead>Voertuig</TableHead>
                        <TableHead>Prijs</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrips.map((trip) => (
                        <TableRow key={trip.id} data-state={selectedIds.has(trip.id) ? "selected" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(trip.id)}
                              onCheckedChange={() => toggleSelect(trip.id)}
                            />
                          </TableCell>
                          <TableCell>
                            {format(new Date(trip.trip_date), "d MMM yyyy", { locale: nl })}
                          </TableCell>
                          <TableCell>{trip.customers?.company_name || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {trip.customer_reference || trip.waybill_number || "-"}
                          </TableCell>
                          <TableCell>
                            <div>
                              {trip.pickup_company_name || trip.pickup_city || trip.pickup_address}
                              {trip.pickup_time_from && (
                                <span className="text-xs text-muted-foreground block">
                                  {trip.pickup_time_from}{trip.pickup_time_to && ` - ${trip.pickup_time_to}`}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {trip.delivery_company_name || trip.delivery_city || trip.delivery_address}
                              {trip.delivery_time_from && (
                                <span className="text-xs text-muted-foreground block">
                                  {trip.delivery_time_from}{trip.delivery_time_to && ` - ${trip.delivery_time_to}`}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {trip.vehicles?.license_plate || "-"}
                          </TableCell>
                          <TableCell>
                            {trip.price ? `€${trip.price.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[trip.status]} variant="secondary">
                              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(trip)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(trip.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </div>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rit verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze rit wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        selectedIds={selectedIds}
        onClear={clearSelection}
        onComplete={fetchData}
      />
    </DashboardLayout>
  );
};

export default Trips;

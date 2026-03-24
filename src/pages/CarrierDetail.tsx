import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCarrierTrips } from "@/hooks/useCarrierTrips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import CarrierPurchaseInvoices from "@/components/carriers/CarrierPurchaseInvoices";
import { CarrierPortalAccessTab } from "@/components/carriers/CarrierPortalAccessTab";
import { CarrierContactsManager } from "@/components/carriers/CarrierContactsManager";
import { CarrierDocumentsManager } from "@/components/carriers/CarrierDocumentsManager";
import { CarrierAuditLogTab } from "@/components/carriers/CarrierAuditLogTab";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft, Star, Building2, MapPin, CreditCard, Truck, Shield, Users,
  FileText, Mail, Phone, CheckCircle2, Globe, Play, Pause, Trash2,
  Route, BarChart3, FolderOpen, Clock, Target, TrendingUp, AlertTriangle, Package, History,
  ThumbsUp, ThumbsDown
} from "lucide-react";

interface Carrier {
  id: string;
  company_name: string;
  tenant_id: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  vat_number: string | null;
  iban: string | null;
  bic: string | null;
  notes: string | null;
  is_active: boolean;
  rating: number | null;
  vehicle_types: string[] | null;
  permits: string[] | null;
  vat_liable_eu: boolean | null;
  vat_liable_non_eu: boolean | null;
  payment_terms_days: number | null;
  payment_method: string | null;
  credit_limit: number | null;
}

interface CarrierContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean | null;
  notes: string | null;
}

interface CarrierScorecardData {
  id: string;
  otif_percentage: number | null;
  accept_rate: number | null;
  on_time_pickups: number | null;
  on_time_deliveries: number | null;
  claims_count: number | null;
  no_show_rate: number | null;
  total_tenders: number | null;
  accepted_tenders: number | null;
  completed_orders: number | null;
  last_calculated_at: string | null;
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-2 border-b border-border/30 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-right">{value || "—"}</span>
  </div>
);

const statusColors: Record<string, string> = {
  gepland: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  onderweg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  afgerond: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const KpiCard = ({ icon: Icon, label, value, suffix }: { icon: any; label: string; value: number | null; suffix?: string }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value != null ? `${value}${suffix || ''}` : '—'}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const CarrierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [contacts, setContacts] = useState<CarrierContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [scorecard, setScorecard] = useState<CarrierScorecardData | null>(null);
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);

  const { trips, loading: tripsLoading, fetchTrips: refetchTrips } = useCarrierTrips(carrier?.id || null, { allStatuses: true });

  const handleTripStatusUpdate = async (tripId: string, newStatus: "gepland" | "geannuleerd") => {
    setUpdatingTripId(tripId);
    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: newStatus })
        .eq("id", tripId);
      if (error) throw error;
      toast({
        title: newStatus === "gepland" ? "Opdracht geaccepteerd" : "Opdracht geweigerd",
        description: newStatus === "gepland" ? "De rit is bevestigd en gepland." : "De rit is geannuleerd.",
      });
      refetchTrips?.();
    } catch (err: any) {
      toast({ title: "Fout bij updaten status", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingTripId(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [carrierRes, contactsRes, scorecardRes] = await Promise.all([
      supabase.from("carriers").select("*").eq("id", id!).single(),
      supabase.from("carrier_contacts").select("*").eq("carrier_id", id!).order("is_primary", { ascending: false }),
      supabase.from("carrier_scorecards").select("*").eq("carrier_id", id!).limit(1).maybeSingle(),
    ]);
    if (carrierRes.error) {
      toast({ title: "Charter niet gevonden", variant: "destructive" });
      navigate("/carriers");
      return;
    }
    setCarrier(carrierRes.data as unknown as Carrier);
    setContacts((contactsRes.data as unknown as CarrierContact[]) || []);
    setScorecard(scorecardRes.data as unknown as CarrierScorecardData | null);
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const refetchContacts = async () => {
    if (!id) return;
    const { data } = await supabase.from("carrier_contacts").select("*").eq("carrier_id", id!).order("is_primary", { ascending: false });
    setContacts((data as unknown as CarrierContact[]) || []);
  };

  const handleToggleActive = async () => {
    if (!carrier) return;
    const newActive = !carrier.is_active;
    const { error } = await supabase.from('carriers').update({ is_active: newActive }).eq('id', carrier.id);
    if (error) {
      toast({ title: "Fout bij wijzigen status", variant: "destructive" });
    } else {
      toast({ title: newActive ? "Charter geactiveerd" : "Charter gedeactiveerd" });
      setCarrier({ ...carrier, is_active: newActive });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!carrier) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('carriers').delete().eq('id', carrier.id);
    if (error) {
       toast({ title: "Fout bij verwijderen charter", variant: "destructive" });
     } else {
       toast({ title: "Charter verwijderd" });
      navigate("/carriers");
    }
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
  };

  if (loading || !carrier) {
    return (
      <DashboardLayout title="Charter" description="">
        <div className="text-center py-16 text-muted-foreground">Laden...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={carrier.company_name} description="Charter details">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/carriers")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{carrier.company_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={carrier.is_active ? "default" : "destructive"}>
                  {carrier.is_active ? "Actief" : "Inactief"}
                </Badge>
                {carrier.rating && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {carrier.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToggleActive} className="gap-1.5">
              {carrier.is_active ? (
                <><Pause className="h-4 w-4" /> Deactiveren</>
              ) : (
                <><Play className="h-4 w-4" /> Activeren</>
              )}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} className="gap-1.5">
              <Trash2 className="h-4 w-4" /> Verwijderen
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overzicht">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overzicht" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Overzicht
            </TabsTrigger>
            <TabsTrigger value="ritten" className="gap-1.5">
              <Route className="h-4 w-4" /> Ritten {!tripsLoading && trips.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{trips.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="facturen" className="gap-1.5">
              <FileText className="h-4 w-4" /> Inkoopfacturen
            </TabsTrigger>
            <TabsTrigger value="scorecard" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Scorecard
            </TabsTrigger>
            <TabsTrigger value="documenten" className="gap-1.5">
              <FolderOpen className="h-4 w-4" /> Documenten
            </TabsTrigger>
            <TabsTrigger value="voertuigen" className="gap-1.5">
              <Truck className="h-4 w-4" /> Voertuigen
            </TabsTrigger>
            <TabsTrigger value="contacten" className="gap-1.5">
              <Users className="h-4 w-4" /> Contactpersonen
            </TabsTrigger>
            <TabsTrigger value="portaal" className="gap-1.5">
              <Globe className="h-4 w-4" /> Portaal
            </TabsTrigger>
            <TabsTrigger value="historie" className="gap-1.5">
              <History className="h-4 w-4" /> Historie
            </TabsTrigger>
          </TabsList>

          {/* Overzicht */}
          <TabsContent value="overzicht" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> Basisgegevens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="Contactpersoon" value={carrier.contact_name} />
                  <InfoRow label="E-mail" value={carrier.email} />
                  <InfoRow label="Telefoon" value={carrier.phone} />
                  <InfoRow label="Adres" value={[carrier.address, carrier.postal_code, carrier.city].filter(Boolean).join(", ")} />
                  <InfoRow label="Land" value={carrier.country} />
                  <InfoRow label="BTW-nummer" value={carrier.vat_number} />
                  <InfoRow label="IBAN" value={carrier.iban} />
                  {carrier.bic && <InfoRow label="BIC" value={carrier.bic} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" /> Financieel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoRow label="BTW-plichtig EU" value={carrier.vat_liable_eu ? "Ja" : "Nee"} />
                  <InfoRow label="BTW-plichtig buiten EU" value={carrier.vat_liable_non_eu ? "Ja" : "Nee"} />
                  <InfoRow label="Betalingstermijn" value={carrier.payment_terms_days ? `${carrier.payment_terms_days} dagen` : null} />
                  <InfoRow label="Betaalwijze" value={carrier.payment_method} />
                  <InfoRow label="Kredietlimiet" value={carrier.credit_limit != null ? `€ ${carrier.credit_limit.toFixed(2)}` : null} />
                </CardContent>
              </Card>

              {carrier.notes && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{carrier.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Ritten */}
          <TabsContent value="ritten" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="h-4 w-4 text-muted-foreground" /> Ritten ({trips.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tripsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Laden...</p>
                ) : trips.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Geen ritten voor dit charter.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordernummer</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Ophaaladres</TableHead>
                        <TableHead>Afleveradres</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lading</TableHead>
                        <TableHead className="text-right">Opdracht</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map(trip => (
                        <TableRow
                          key={trip.id}
                          isClickable
                          onClick={() => navigate(`/orders/${trip.id}`)}
                        >
                          <TableCell className="font-medium">{trip.order_number || '—'}</TableCell>
                          <TableCell>{format(new Date(trip.trip_date), 'd MMM yyyy', { locale: nl })}</TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">{trip.pickup_city || trip.pickup_address}</div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">{trip.delivery_city || trip.delivery_address}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[trip.status] || ''} variant="secondary">
                              {trip.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {[
                                trip.cargo_description,
                                ((trip as any).cargo_weight ?? (trip as any).total_weight_kg) ? `${(trip as any).cargo_weight ?? (trip as any).total_weight_kg} kg` : null,
                                (trip as any).loading_meters ? `${(trip as any).loading_meters} ldm` : null,
                              ].filter(Boolean).join(' · ') || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {(trip.status === 'aanvraag' || trip.status === 'draft') && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  disabled={updatingTripId === trip.id}
                                  onClick={() => handleTripStatusUpdate(trip.id, "gepland")}
                                >
                                  <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                                  Accepteren
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                                  disabled={updatingTripId === trip.id}
                                  onClick={() => handleTripStatusUpdate(trip.id, "geannuleerd")}
                                >
                                  <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                                  Weigeren
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inkoopfacturen */}
          <TabsContent value="facturen" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <CarrierPurchaseInvoices carrierId={carrier.id} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scorecard */}
          <TabsContent value="scorecard" className="mt-4">
            {scorecard ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <KpiCard icon={Target} label="OTIF %" value={scorecard.otif_percentage} suffix="%" />
                  <KpiCard icon={TrendingUp} label="Accept rate" value={scorecard.accept_rate} suffix="%" />
                  <KpiCard icon={Clock} label="On-time leveringen" value={scorecard.on_time_deliveries} />
                  <KpiCard icon={Clock} label="On-time ophalingen" value={scorecard.on_time_pickups} />
                  <KpiCard icon={AlertTriangle} label="Claims" value={scorecard.claims_count} />
                  <KpiCard icon={Package} label="Afgeronde orders" value={scorecard.completed_orders} />
                </div>
                {scorecard.last_calculated_at && (
                  <p className="text-xs text-muted-foreground">
                    Laatst berekend: {format(new Date(scorecard.last_calculated_at), 'd MMM yyyy HH:mm', { locale: nl })}
                  </p>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nog geen scorecard beschikbaar voor dit charter.</p>
                    <p className="text-xs mt-1">Scorecards worden automatisch berekend wanneer er voldoende data is.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documenten */}
          <TabsContent value="documenten" className="mt-4">
            <CarrierDocumentsManager carrierId={carrier.id} tenantId={carrier.tenant_id} />
          </TabsContent>

          {/* Voertuigen & Vergunningen */}
          <TabsContent value="voertuigen" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" /> Voertuigtypes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(carrier.vehicle_types || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {carrier.vehicle_types!.map(vt => (
                        <Badge key={vt} variant="secondary">{vt}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Geen voertuigtypes opgegeven.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" /> Vergunningen & Certificeringen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(carrier.permits || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {carrier.permits!.map(p => (
                        <Badge key={p} variant="outline">{p}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Geen vergunningen opgegeven.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contactpersonen */}
          <TabsContent value="contacten" className="mt-4">
            <CarrierContactsManager
              carrierId={carrier.id}
              tenantId={carrier.tenant_id}
              contacts={contacts}
              onContactsChange={refetchContacts}
            />
          </TabsContent>

          {/* Portaal Toegang */}
          <TabsContent value="portaal" className="mt-4">
            <CarrierPortalAccessTab carrierId={carrier.id} tenantId={carrier.tenant_id || ''} />
          </TabsContent>

          {/* Historie / Audit Log */}
          <TabsContent value="historie" className="mt-4">
            <CarrierAuditLogTab carrierId={carrier.id} />
          </TabsContent>
        </Tabs>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Charter verwijderen"
        description={`Weet je zeker dat je "${carrier.company_name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteLoading}
      />
    </DashboardLayout>
  );
};

export default CarrierDetail;

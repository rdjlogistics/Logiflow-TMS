import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ShoppingCart, FileText, CheckCircle, XCircle, Clock, Euro, Truck, MapPin, Calendar, Weight } from "lucide-react";
import { motion } from "framer-motion";

// ===== TYPES =====
interface RFQRequest {
  id: string;
  titel: string;
  omschrijving: string | null;
  ophaaladres: string | null;
  afleveradres: string | null;
  datum: string | null;
  gewicht_kg: number | null;
  deadline_offerte: string | null;
  status: "open" | "gesloten" | "toegewezen";
  created_at: string;
  company_id: string;
}

interface RFQOfferte {
  id: string;
  rfq_id: string;
  carrier_naam: string;
  carrier_email: string | null;
  prijs: number | null;
  doorlooptijd_uren: number | null;
  notities: string | null;
  status: "ingediend" | "geaccepteerd" | "afgewezen";
  created_at: string;
}

const emptyRFQ = {
  titel: "",
  omschrijving: "",
  ophaaladres: "",
  afleveradres: "",
  datum: "",
  gewicht_kg: "",
  deadline_offerte: "",
};

const emptyOfferte = {
  carrier_naam: "",
  carrier_email: "",
  prijs: "",
  doorlooptijd_uren: "",
  notities: "",
};

// ===== STATUS BADGE =====
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: "Open", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    gesloten: { label: "Gesloten", className: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
    toegewezen: { label: "Toegewezen", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    ingediend: { label: "Ingediend", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    geaccepteerd: { label: "Geaccepteerd", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    afgewezen: { label: "Afgewezen", className: "bg-red-500/10 text-red-600 border-red-500/30" },
  };
  const s = map[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-xs ${s.className}`}>
      {s.label}
    </Badge>
  );
}

// ===== MAIN PAGE =====
const Procurement = () => {
  const { company } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRFQOpen, setNewRFQOpen] = useState(false);
  const [rfqForm, setRFQForm] = useState(emptyRFQ);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQRequest | null>(null);
  const [offerteOpen, setOfferteOpen] = useState(false);
  const [offerteForm, setOfferteForm] = useState(emptyOfferte);
  const [activeTab, setActiveTab] = useState("aanvragen");

  // Fetch RFQ requests
  const { data: rfqRequests = [], isLoading: rfqLoading } = useQuery({
    queryKey: ["rfq-requests", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("rfq_requests" as any)
        .select("id, titel, omschrijving, ophaaladres, afleveradres, datum, gewicht_kg, deadline_offerte, status, created_at, company_id")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RFQRequest[];
    },
    enabled: !!company?.id,
  });

  // Fetch offertes for selected RFQ
  const { data: offertes = [], isLoading: offertesLoading } = useQuery({
    queryKey: ["rfq-offertes", selectedRFQ?.id],
    queryFn: async () => {
      if (!selectedRFQ?.id) return [];
      const { data, error } = await supabase
        .from("rfq_offertes" as any)
        .select("*")
        .eq("rfq_id", selectedRFQ.id)
        .order("prijs", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RFQOfferte[];
    },
    enabled: !!selectedRFQ?.id,
  });

  // Create RFQ
  const createRFQMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Geen bedrijf gevonden");
      const { error } = await supabase.from("rfq_requests" as any).insert([
        {
          company_id: company.id,
          titel: rfqForm.titel,
          omschrijving: rfqForm.omschrijving || null,
          ophaaladres: rfqForm.ophaaladres || null,
          afleveradres: rfqForm.afleveradres || null,
          datum: rfqForm.datum || null,
          gewicht_kg: rfqForm.gewicht_kg ? parseFloat(rfqForm.gewicht_kg) : null,
          deadline_offerte: rfqForm.deadline_offerte ? new Date(rfqForm.deadline_offerte).toISOString() : null,
          status: "open",
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-requests"] });
      toast({ title: "Aanvraag aangemaakt" });
      setNewRFQOpen(false);
      setRFQForm(emptyRFQ);
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  // Add offerte
  const addOfferteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRFQ?.id) throw new Error("Geen aanvraag geselecteerd");
      const { error } = await supabase.from("rfq_offertes" as any).insert([
        {
          rfq_id: selectedRFQ.id,
          carrier_naam: offerteForm.carrier_naam,
          carrier_email: offerteForm.carrier_email || null,
          prijs: offerteForm.prijs ? parseFloat(offerteForm.prijs) : null,
          doorlooptijd_uren: offerteForm.doorlooptijd_uren ? parseInt(offerteForm.doorlooptijd_uren) : null,
          notities: offerteForm.notities || null,
          status: "ingediend",
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-offertes", selectedRFQ?.id] });
      toast({ title: "Offerte toegevoegd" });
      setOfferteOpen(false);
      setOfferteForm(emptyOfferte);
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  // Accept offerte
  const acceptOfferteMutation = useMutation({
    mutationFn: async (offerte: RFQOfferte) => {
      const { error: oe } = await supabase
        .from("rfq_offertes" as any)
        .update({ status: "geaccepteerd" })
        .eq("id", offerte.id);
      if (oe) throw oe;
      const { error: re } = await supabase
        .from("rfq_requests" as any)
        .update({ status: "toegewezen" })
        .eq("id", offerte.rfq_id);
      if (re) throw re;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-offertes", selectedRFQ?.id] });
      queryClient.invalidateQueries({ queryKey: ["rfq-requests"] });
      toast({ title: "Offerte geaccepteerd" });
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  // Reject offerte
  const rejectOfferteMutation = useMutation({
    mutationFn: async (offerteId: string) => {
      const { error } = await supabase
        .from("rfq_offertes" as any)
        .update({ status: "afgewezen" })
        .eq("id", offerteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-offertes", selectedRFQ?.id] });
      toast({ title: "Offerte afgewezen" });
    },
    onError: (e: Error) => toast({ title: "Fout", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout
      title="Charter aanvragen"
      description="Stuur offerteaanvragen naar charters en kies de beste prijs"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Aanvragen", value: rfqRequests.length, icon: FileText, color: "text-primary" },
            { label: "Open", value: rfqRequests.filter(r => r.status === "open").length, icon: Clock, color: "text-amber-500" },
            { label: "Toegewezen", value: rfqRequests.filter(r => r.status === "toegewezen").length, icon: CheckCircle, color: "text-emerald-500" },
            { label: "Gesloten", value: rfqRequests.filter(r => r.status === "gesloten").length, icon: XCircle, color: "text-gray-500" },
          ].map((kpi) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 space-y-1"
            >
              <div className="flex items-center gap-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="aanvragen" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Charter aanvragen
            </TabsTrigger>
            <TabsTrigger value="offertes" className="gap-2">
              <FileText className="h-4 w-4" /> Ontvangen offertes
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Aanvragen */}
          <TabsContent value="aanvragen" className="space-y-4 mt-6">
            <div className="flex justify-end">
              <Button onClick={() => setNewRFQOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Nieuwe aanvraag
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-4 w-4" /> Charter aanvragen ({rfqRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rfqLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Laden...</div>
                ) : rfqRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Nog geen charter aanvragen</p>
                    <p className="text-sm mt-1">Maak een aanvraag aan om charters offertes te laten indienen.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Titel</TableHead>
                          <TableHead>Ophaal</TableHead>
                          <TableHead>Aflever</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Gewicht</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Acties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rfqRequests.map((rfq) => (
                          <TableRow
                            key={rfq.id}
                            className="cursor-pointer hover:bg-muted/40"
                            onClick={() => {
                              setSelectedRFQ(rfq);
                              setActiveTab("offertes");
                            }}
                          >
                            <TableCell className="font-medium">{rfq.titel}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{rfq.ophaaladres ?? "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{rfq.afleveradres ?? "—"}</TableCell>
                            <TableCell className="text-sm">
                              {rfq.datum ? new Date(rfq.datum).toLocaleDateString("nl-NL") : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {rfq.gewicht_kg ? `${rfq.gewicht_kg} kg` : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {rfq.deadline_offerte
                                ? new Date(rfq.deadline_offerte).toLocaleDateString("nl-NL")
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={rfq.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRFQ(rfq);
                                  setActiveTab("offertes");
                                }}
                              >
                                Offertes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Offertes */}
          <TabsContent value="offertes" className="space-y-4 mt-6">
            {!selectedRFQ ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Selecteer een aanvraag</p>
                  <p className="text-sm mt-1">Klik op een aanvraag in het tabblad Aanvragen om offertes te bekijken.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base">{selectedRFQ.titel}</CardTitle>
                        {selectedRFQ.omschrijving && (
                          <CardDescription>{selectedRFQ.omschrijving}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={selectedRFQ.status} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOfferteOpen(true)}
                          className="gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Offerte invoeren
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedRFQ(null)}
                          className="text-xs"
                        >
                          Sluiten
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      {selectedRFQ.ophaaladres && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {selectedRFQ.ophaaladres}
                        </span>
                      )}
                      {selectedRFQ.afleveradres && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5" /> {selectedRFQ.afleveradres}
                        </span>
                      )}
                      {selectedRFQ.gewicht_kg && (
                        <span className="flex items-center gap-1">
                          <Weight className="h-3.5 w-3.5" /> {selectedRFQ.gewicht_kg} kg
                        </span>
                      )}
                      {selectedRFQ.deadline_offerte && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Deadline: {new Date(selectedRFQ.deadline_offerte).toLocaleDateString("nl-NL")}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Euro className="h-4 w-4" /> Ontvangen offertes ({offertes.length})
                    </CardTitle>
                    <CardDescription>Gesorteerd op prijs (goedkoopste eerst)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {offertesLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Laden...</div>
                    ) : offertes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nog geen offertes ontvangen.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 gap-1"
                          onClick={() => setOfferteOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Offerte invoeren
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Charter</TableHead>
                              <TableHead>E-mail</TableHead>
                              <TableHead className="text-right">Prijs</TableHead>
                              <TableHead className="text-right">Doorlooptijd</TableHead>
                              <TableHead>Notities</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Acties</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {offertes.map((offerte, idx) => (
                              <motion.tr
                                key={offerte.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`border-b ${idx === 0 ? 'bg-emerald-500/5' : ''}`}
                              >
                                <TableCell className="font-medium">
                                  {idx === 0 && (
                                    <span className="text-xs text-emerald-600 font-semibold block">Goedkoopste</span>
                                  )}
                                  {offerte.carrier_naam}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {offerte.carrier_email ?? "—"}
                                </TableCell>
                                <TableCell className="text-right font-bold text-emerald-600">
                                  {offerte.prijs != null ? `€${offerte.prijs.toFixed(2)}` : "—"}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {offerte.doorlooptijd_uren != null ? `${offerte.doorlooptijd_uren} uur` : "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                                  {offerte.notities ?? "—"}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={offerte.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                  {offerte.status === "ingediend" && (
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                                        onClick={() => acceptOfferteMutation.mutate(offerte)}
                                        disabled={acceptOfferteMutation.isPending}
                                      >
                                        <CheckCircle className="h-3 w-3" /> Accepteren
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-destructive"
                                        onClick={() => rejectOfferteMutation.mutate(offerte.id)}
                                        disabled={rejectOfferteMutation.isPending}
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog: Nieuwe aanvraag */}
        <Dialog open={newRFQOpen} onOpenChange={setNewRFQOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe charter aanvraag</DialogTitle>
              <DialogDescription>Stuur een offerteaanvraag naar charters voor deze rit.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>Titel *</Label>
                <Input
                  placeholder="bijv. Transport Rotterdam naar Brussel"
                  value={rfqForm.titel}
                  onChange={(e) => setRFQForm({ ...rfqForm, titel: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Omschrijving</Label>
                <Textarea
                  placeholder="Beschrijf de vracht, bijzonderheden, etc."
                  value={rfqForm.omschrijving}
                  onChange={(e) => setRFQForm({ ...rfqForm, omschrijving: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ophaaladres</Label>
                  <Input
                    placeholder="Straat, Stad"
                    value={rfqForm.ophaaladres}
                    onChange={(e) => setRFQForm({ ...rfqForm, ophaaladres: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Afleveradres</Label>
                  <Input
                    placeholder="Straat, Stad"
                    value={rfqForm.afleveradres}
                    onChange={(e) => setRFQForm({ ...rfqForm, afleveradres: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transportdatum</Label>
                  <Input
                    type="date"
                    value={rfqForm.datum}
                    onChange={(e) => setRFQForm({ ...rfqForm, datum: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gewicht (kg)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="bijv. 5000"
                    value={rfqForm.gewicht_kg}
                    onChange={(e) => setRFQForm({ ...rfqForm, gewicht_kg: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deadline offerte</Label>
                <Input
                  type="datetime-local"
                  value={rfqForm.deadline_offerte}
                  onChange={(e) => setRFQForm({ ...rfqForm, deadline_offerte: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewRFQOpen(false)}>Annuleren</Button>
              <Button
                onClick={() => createRFQMutation.mutate()}
                disabled={!rfqForm.titel || createRFQMutation.isPending}
              >
                Aanvraag aanmaken
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Offerte invoeren */}
        <Dialog open={offerteOpen} onOpenChange={setOfferteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Offerte invoeren</DialogTitle>
              <DialogDescription>
                Voer een offerte in voor: {selectedRFQ?.titel}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                 <Label>Charter *</Label>
                 <Input
                   placeholder="Naam van het charter"
                   value={offerteForm.carrier_naam}
                   onChange={(e) => setOfferteForm({ ...offerteForm, carrier_naam: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label>E-mail charter</Label>
                <Input
                  type="email"
                  placeholder="carrier@voorbeeld.nl"
                  value={offerteForm.carrier_email}
                  onChange={(e) => setOfferteForm({ ...offerteForm, carrier_email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prijs (€)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="bijv. 450.00"
                    value={offerteForm.prijs}
                    onChange={(e) => setOfferteForm({ ...offerteForm, prijs: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Doorlooptijd (uur)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="bijv. 4"
                    value={offerteForm.doorlooptijd_uren}
                    onChange={(e) => setOfferteForm({ ...offerteForm, doorlooptijd_uren: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Textarea
                  placeholder="Bijzonderheden, voorwaarden, etc."
                  value={offerteForm.notities}
                  onChange={(e) => setOfferteForm({ ...offerteForm, notities: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOfferteOpen(false)}>Annuleren</Button>
              <Button
                onClick={() => addOfferteMutation.mutate()}
                disabled={!offerteForm.carrier_naam || addOfferteMutation.isPending}
              >
                Offerte opslaan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Procurement;

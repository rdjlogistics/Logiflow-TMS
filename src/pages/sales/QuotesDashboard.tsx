import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  ArrowRight,
  Euro,
  Loader2,
  Search,
  Eye,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  concept: { label: "Concept", color: "bg-gray-500", icon: FileText },
  verzonden: { label: "Verzonden", color: "bg-blue-500", icon: Send },
  akkoord: { label: "Akkoord", color: "bg-emerald-500", icon: CheckCircle2 },
  verlopen: { label: "Verlopen", color: "bg-amber-500", icon: Clock },
  afgewezen: { label: "Afgewezen", color: "bg-red-500", icon: XCircle },
  order: { label: "Omgezet", color: "bg-violet-500", icon: ArrowRight },
};

const QuotesDashboard = () => {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    quote_number: "",
    title: "",
    customer_id: "",
    contact_name: "",
    contact_email: "",
    pickup_address: "",
    pickup_city: "",
    delivery_address: "",
    delivery_city: "",
    distance_km: "",
    weight_kg: "",
    vehicle_type: "",
    price_excl_btw: "",
    valid_until: "",
    description: "",
  });

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes", companyId, filterStatus],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from("quotes")
        .select("*, customers(company_name)")
        .eq("tenant_id", companyId)
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") query = query.eq("status", filterStatus as any);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-select", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("customers")
        .select("id, company_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("company_name")
        .limit(200);
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const priceExcl = parseFloat(form.price_excl_btw) || 0;
      const totalIncl = priceExcl * 1.21;
      const quoteNum = form.quote_number || `OFF-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("quotes").insert({
        tenant_id: companyId,
        quote_number: quoteNum,
        title: form.title || null,
        customer_id: form.customer_id || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        pickup_address: form.pickup_address || null,
        pickup_city: form.pickup_city || null,
        delivery_address: form.delivery_address || null,
        delivery_city: form.delivery_city || null,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        vehicle_type: form.vehicle_type || null,
        price_excl_btw: priceExcl || null,
        total_incl_btw: totalIncl || null,
        valid_until: form.valid_until || null,
        description: form.description || null,
        status: "concept",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Offerte aangemaakt");
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "akkoord") updates.accepted_at = new Date().toISOString();
      const { error } = await supabase.from("quotes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Status bijgewerkt");
    },
  });

  // KPI stats
  const allQuotes = quotes ?? [];
  const totalOpen = allQuotes.filter((q: any) => ["concept", "verzonden"].includes(q.status)).length;
  const totalAccepted = allQuotes.filter((q: any) => ["akkoord", "order"].includes(q.status)).length;
  const totalValue = allQuotes.reduce((s: number, q: any) => s + (Number(q.total_incl_btw) || 0), 0);
  const conversionRate = allQuotes.length > 0 ? Math.round((totalAccepted / allQuotes.length) * 100) : 0;

  const filtered = allQuotes.filter((q: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.quote_number?.toLowerCase().includes(s) ||
      q.title?.toLowerCase().includes(s) ||
      q.contact_name?.toLowerCase().includes(s) ||
      (q.customers as any)?.company_name?.toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout title="Offertes & Proforma" description="Beheer offertes en volg conversies">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Offertes</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOpen}</div>
              <p className="text-xs text-muted-foreground">{allQuotes.length} totaal</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geaccepteerd</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAccepted}</div>
              <p className="text-xs text-muted-foreground">Akkoord + omgezet</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversie</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground">Offerte naar order</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Waarde</CardTitle>
              <Euro className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalValue.toLocaleString("nl-NL", { minimumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">Incl. BTW</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op nummer, klant of titel..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Offerte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuwe Offerte</DialogTitle>
                <DialogDescription>Maak een offerte aan voor een klant</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Offertenummer</Label>
                    <Input value={form.quote_number} onChange={(e) => setForm({ ...form, quote_number: e.target.value })} placeholder="Auto-generatie" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Klant</Label>
                    <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                      <SelectContent>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Titel</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Bijv. Transport Amsterdam - Rotterdam" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Contactpersoon</Label>
                    <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Ophaaladres</Label>
                    <Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ophaalplaats</Label>
                    <Input value={form.pickup_city} onChange={(e) => setForm({ ...form, pickup_city: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Afleveradres</Label>
                    <Input value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Afleverplaats</Label>
                    <Input value={form.delivery_city} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Afstand (km)</Label>
                    <Input type="number" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Gewicht (kg)</Label>
                    <Input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Voertuigtype</Label>
                    <Input value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} placeholder="Bijv. Tautliner" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Prijs excl. BTW (€)</Label>
                    <Input type="number" step="0.01" value={form.price_excl_btw} onChange={(e) => setForm({ ...form, price_excl_btw: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Geldig tot</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Omschrijving</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Aanmaken
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quotes Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">Geen offertes gevonden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nummer</TableHead>
                      <TableHead>Klant</TableHead>
                      <TableHead>Titel / Route</TableHead>
                      <TableHead className="text-right">Bedrag</TableHead>
                      <TableHead>Geldig tot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((q: any) => {
                      const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.concept;
                      const isExpired = q.valid_until && q.valid_until < new Date().toISOString().split("T")[0] && q.status === "verzonden";
                      return (
                        <TableRow key={q.id}>
                          <TableCell className="font-medium">{q.quote_number}</TableCell>
                          <TableCell>{(q.customers as any)?.company_name || q.contact_name || "—"}</TableCell>
                          <TableCell>
                            {q.title || (q.pickup_city && q.delivery_city ? `${q.pickup_city} - ${q.delivery_city}` : "—")}
                          </TableCell>
                          <TableCell className="text-right">
                            {q.total_incl_btw ? `€${Number(q.total_incl_btw).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}` : "—"}
                          </TableCell>
                          <TableCell>
                            {q.valid_until ? (
                              <span className={isExpired ? "text-destructive" : ""}>
                                {new Date(q.valid_until).toLocaleDateString("nl-NL")}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {q.status === "concept" && (
                                <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ id: q.id, status: "verzonden" })}>
                                  <Send className="h-3 w-3 mr-1" />
                                  Verzenden
                                </Button>
                              )}
                              {q.status === "verzonden" && (
                                <>
                                  <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatusMutation.mutate({ id: q.id, status: "akkoord" })}>
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Akkoord
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatusMutation.mutate({ id: q.id, status: "afgewezen" })}>
                                    <XCircle className="h-3 w-3 mr-1" />
                                  </Button>
                                </>
                              )}
                              {q.status === "akkoord" && (
                                <Button size="sm" variant="outline" className="text-violet-600" onClick={() => updateStatusMutation.mutate({ id: q.id, status: "order" })}>
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Naar Order
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QuotesDashboard;

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Send, Clock, CheckCircle, XCircle, AlertTriangle, Gavel, TrendingUp, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Concept", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  open: { label: "Open", variant: "default", icon: <Send className="h-3 w-3" /> },
  pending_response: { label: "Wachtend op reactie", variant: "outline", icon: <AlertTriangle className="h-3 w-3" /> },
  accepted: { label: "Geaccepteerd", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: "Afgewezen", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Verlopen", variant: "destructive", icon: <Clock className="h-3 w-3" /> },
  cancelled: { label: "Geannuleerd", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
};

interface TenderRow {
  id: string;
  title: string;
  order_id: string | null;
  deadline: string;
  status: string;
  expected_price_min: number | null;
  expected_price_max: number | null;
  description: string | null;
  created_at: string;
  tender_invites: { id: string; offered_price: number | null; status: string }[];
}

const TenderDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { company } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [newTender, setNewTender] = useState({
    title: "",
    minPrice: "",
    maxPrice: "",
    deadline: "",
    notes: "",
  });

  const queryKey = ["tenders", company?.id];

  const { data: tenders = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("tenders")
        .select("id, title, order_id, deadline, status, expected_price_min, expected_price_max, description, created_at, tender_invites(id, offered_price, status)")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TenderRow[];
    },
    enabled: !!company?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: typeof newTender) => {
      if (!company?.id) throw new Error("Geen bedrijf");
      const { error } = await supabase.from("tenders").insert({
        company_id: company.id,
        title: input.title || "Nieuwe charter aanvraag",
        deadline: input.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        expected_price_min: input.minPrice ? parseFloat(input.minPrice) : null,
        expected_price_max: input.maxPrice ? parseFloat(input.maxPrice) : null,
        description: input.notes || null,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Charter aanvraag succesvol aangemaakt");
      setNewTender({ title: "", minPrice: "", maxPrice: "", deadline: "", notes: "" });
      setIsCreateOpen(false);
    },
    onError: (err: Error) => toast.error("Fout bij aanmaken", { description: err.message }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tenders")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedTenderId(null);
    },
    onError: (err: Error) => toast.error("Fout bij bijwerken", { description: err.message }),
  });

  const stats = useMemo(() => {
    const active = tenders.filter(t => ["open", "pending_response"].includes(t.status)).length;
    const accepted = tenders.filter(t => t.status === "accepted").length;
    const expired = tenders.filter(t => t.status === "expired").length;

    // Calculate real avg savings: (expected_max - best_offer) / expected_max
    let totalSavingsPct = 0;
    let savingsCount = 0;
    for (const t of tenders) {
      if (!t.expected_price_max) continue;
      const offers = t.tender_invites
        .filter(i => i.offered_price != null)
        .map(i => i.offered_price!);
      if (offers.length === 0) continue;
      const best = Math.min(...offers);
      if (best < t.expected_price_max) {
        totalSavingsPct += ((t.expected_price_max - best) / t.expected_price_max) * 100;
        savingsCount++;
      }
    }
    const avgSavings = savingsCount > 0 ? `${(totalSavingsPct / savingsCount).toFixed(0)}%` : "–";

    return { active, accepted, expired, avgSavings };
  }, [tenders]);

  const filteredTenders = useMemo(() => {
    return tenders.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.order_id ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenders, searchTerm, statusFilter]);

  const selectedTender = tenders.find(t => t.id === selectedTenderId) ?? null;

  const getBestOffer = (t: TenderRow): number | null => {
    const prices = t.tender_invites
      .filter(i => i.offered_price != null)
      .map(i => i.offered_price!);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const handleCreateTender = () => {
    if (!newTender.title.trim()) {
      toast.error("Vul een titel in");
      return;
    }
    createMutation.mutate(newTender);
  };

  const handleAcceptBid = (tender: TenderRow) => {
    const best = getBestOffer(tender);
    updateStatusMutation.mutate({ id: tender.id, status: "accepted" });
    toast.success(`Bod van €${best} geaccepteerd`);
  };

  const handleCancelTender = (tender: TenderRow) => {
    updateStatusMutation.mutate({ id: tender.id, status: "cancelled" });
    toast.success("Charter aanvraag geannuleerd");
  };

  return (
    <DashboardLayout title="Charter aanvragen">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actieve charter aanvragen</CardTitle>
              <Gavel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.active}</div>}
              <p className="text-xs text-muted-foreground">Wachtend op reacties</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geaccepteerd</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-emerald-600">{stats.accepted}</div>}
              <p className="text-xs text-muted-foreground">Totaal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verlopen</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-destructive">{stats.expired}</div>}
              <p className="text-xs text-muted-foreground">Handmatig afhandelen</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. Besparing</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold text-emerald-600">{stats.avgSavings}</div>}
              <p className="text-xs text-muted-foreground">vs. verwachte prijs</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>Charter aanvragen</CardTitle>
                <CardDescription>Beheer uw uitvragen naar charters</CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nieuwe charter aanvraag
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nieuwe charter aanvraag aanmaken</DialogTitle>
                    <DialogDescription>
                      Start een uitvraag naar één of meerdere charters.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Titel</Label>
                      <Input
                        placeholder="Bijv. Rotterdam → Amsterdam"
                        value={newTender.title}
                        onChange={(e) => setNewTender(p => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Min. Prijs (€)</Label>
                        <Input
                          type="number"
                          placeholder="150"
                          value={newTender.minPrice}
                          onChange={(e) => setNewTender(p => ({ ...p, minPrice: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Max. Prijs (€)</Label>
                        <Input
                          type="number"
                          placeholder="200"
                          value={newTender.maxPrice}
                          onChange={(e) => setNewTender(p => ({ ...p, maxPrice: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={newTender.deadline}
                        onChange={(e) => setNewTender(p => ({ ...p, deadline: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Opmerkingen</Label>
                      <Textarea
                        placeholder="Extra instructies voor charters..."
                        value={newTender.notes}
                        onChange={(e) => setNewTender(p => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuleren</Button>
                    <Button onClick={handleCreateTender} disabled={createMutation.isPending}>
                      <Send className="mr-2 h-4 w-4" />
                      {createMutation.isPending ? "Bezig..." : "Verstuur charter aanvraag"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op titel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending_response">Wachtend</SelectItem>
                  <SelectItem value="accepted">Geaccepteerd</SelectItem>
                  <SelectItem value="expired">Verlopen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Charter aanvraag</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reacties</TableHead>
                    <TableHead>Beste Bod</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredTenders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Geen charter aanvragen gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenders.map((tender) => {
                      const config = statusConfig[tender.status] ?? statusConfig.draft;
                      const deadlineDate = new Date(tender.deadline);
                      const isUrgent = deadlineDate < new Date(Date.now() + 24 * 60 * 60 * 1000) &&
                        ["open", "pending_response"].includes(tender.status);
                      const bestOffer = getBestOffer(tender);
                      const invitesCount = tender.tender_invites.length;
                      const responsesCount = tender.tender_invites.filter(i => i.offered_price != null).length;

                      return (
                        <TableRow key={tender.id}>
                          <TableCell className="font-medium">{tender.title}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 ${isUrgent ? 'text-destructive' : ''}`}>
                              {isUrgent && <AlertTriangle className="h-3 w-3" />}
                              {deadlineDate.toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.variant} className="gap-1">
                              {config.icon}
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {responsesCount}/{invitesCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            {bestOffer != null ? (
                              <span className="font-medium text-emerald-600">€{bestOffer}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedTenderId(tender.id)}>
                              Bekijk
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tender Detail Sheet */}
        <Sheet open={!!selectedTender} onOpenChange={(open) => !open && setSelectedTenderId(null)}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{selectedTender?.title}</SheetTitle>
              <SheetDescription>Charter aanvraag details</SheetDescription>
            </SheetHeader>
            {selectedTender && (() => {
              const bestOffer = getBestOffer(selectedTender);
              const config = statusConfig[selectedTender.status] ?? statusConfig.draft;
              const invitesCount = selectedTender.tender_invites.length;
              const responsesCount = selectedTender.tender_invites.filter(i => i.offered_price != null).length;

              return (
                <div className="mt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={config.variant} className="mt-1 gap-1">
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="font-medium">
                        {new Date(selectedTender.deadline).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Verwachte Prijs</p>
                      <p className="font-medium">
                        €{selectedTender.expected_price_min ?? '–'} - €{selectedTender.expected_price_max ?? '–'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reacties</p>
                      <p className="font-medium">{responsesCount}/{invitesCount}</p>
                    </div>
                  </div>

                  {bestOffer != null && (
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Beste Bod</p>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">€{bestOffer}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedTender.expected_price_min != null && selectedTender.expected_price_max != null
                          ? (selectedTender.expected_price_min <= bestOffer && bestOffer <= selectedTender.expected_price_max
                            ? "Binnen verwachting"
                            : bestOffer < selectedTender.expected_price_min
                              ? `€${selectedTender.expected_price_min - bestOffer} onder verwachting`
                              : `€${bestOffer - selectedTender.expected_price_max} boven verwachting`)
                          : ""
                        }
                      </p>
                    </div>
                  )}

                  {selectedTender.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Opmerkingen</p>
                      <p className="text-sm">{selectedTender.description}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    {selectedTender.status === "open" && bestOffer != null && (
                      <Button className="flex-1" onClick={() => handleAcceptBid(selectedTender)} disabled={updateStatusMutation.isPending}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accepteer Bod
                      </Button>
                    )}
                    {["open", "pending_response"].includes(selectedTender.status) && (
                      <Button variant="outline" onClick={() => handleCancelTender(selectedTender)} disabled={updateStatusMutation.isPending}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Annuleren
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default TenderDashboard;

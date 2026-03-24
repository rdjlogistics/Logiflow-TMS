import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Search, Send, Clock, CheckCircle, XCircle, AlertTriangle, Gavel, TrendingUp, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface CharterAanvraag {
  id: string;
  title: string;
  orderNumber: string;
  deadline: string;
  status: string;
  invitesCount: number;
  responsesCount: number;
  expectedPriceMin: number;
  expectedPriceMax: number;
  bestOffer: number | null;
}

// Status configuration
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Concept", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  open: { label: "Open", variant: "default", icon: <Send className="h-3 w-3" /> },
  pending_response: { label: "Wachtend op reactie", variant: "outline", icon: <AlertTriangle className="h-3 w-3" /> },
  accepted: { label: "Geaccepteerd", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: "Afgewezen", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Verlopen", variant: "destructive", icon: <Clock className="h-3 w-3" /> },
  cancelled: { label: "Geannuleerd", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
};

const TenderDashboard = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tenders, setTenders] = useState<CharterAanvraag[]>([]);
  const [selectedTender, setSelectedTender] = useState<CharterAanvraag | null>(null);
  const [newTender, setNewTender] = useState({
    order: "",
    pool: "",
    minPrice: "",
    maxPrice: "",
    deadline: "",
    notes: "",
  });

  const stats = {
    active: tenders.filter(t => ["open", "pending_response"].includes(t.status)).length,
    accepted: tenders.filter(t => t.status === "accepted").length,
    expired: tenders.filter(t => t.status === "expired").length,
    avgSavings: "12%",
  };

  const filteredTenders = tenders.filter((tender: CharterAanvraag) => {
    const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tender.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tender.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTender = () => {
    if (!newTender.order) {
      toast.error("Selecteer een order");
      return;
    }
    const created: CharterAanvraag = {
      id: Date.now().toString(),
      title: newTender.order.split(" - ")[1] || "Nieuwe charter aanvraag",
      orderNumber: newTender.order.split(" - ")[0] || `2025-${Date.now().toString().slice(-5)}`,
      deadline: newTender.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "open",
      invitesCount: newTender.pool === "premium" ? 3 : newTender.pool === "regional" ? 5 : 8,
      responsesCount: 0,
      expectedPriceMin: parseInt(newTender.minPrice) || 100,
      expectedPriceMax: parseInt(newTender.maxPrice) || 200,
      bestOffer: null,
    };
    setTenders([created, ...tenders]);
    toast.success("Charter aanvraag succesvol aangemaakt", {
      description: `${created.invitesCount} uitnodigingen worden verstuurd naar ${newTender.pool || "alle"} charters.`
    });
    setNewTender({ order: "", pool: "", minPrice: "", maxPrice: "", deadline: "", notes: "" });
    setIsCreateOpen(false);
  };

  const handleAcceptBid = (tender: CharterAanvraag) => {
    setTenders(tenders.map(t => t.id === tender.id ? { ...t, status: "accepted" } : t));
    toast.success(`Bod van €${tender.bestOffer} geaccepteerd`, {
      description: `Order ${tender.orderNumber} is toegewezen.`
    });
    setSelectedTender(null);
  };

  const handleCancelTender = (tender: CharterAanvraag) => {
    setTenders(tenders.map(t => t.id === tender.id ? { ...t, status: "cancelled" } : t));
    toast.success("Charter aanvraag geannuleerd");
    setSelectedTender(null);
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
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Wachtend op reacties</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Geaccepteerd</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.accepted}</div>
              <p className="text-xs text-muted-foreground">Deze maand</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verlopen</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">Handmatig afhandelen</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gem. Besparing</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.avgSavings}</div>
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
                      <Label htmlFor="order">Order</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2025-00150">2025-00150 - Rotterdam → Amsterdam</SelectItem>
                          <SelectItem value="2025-00151">2025-00151 - Den Haag → Utrecht</SelectItem>
                          <SelectItem value="2025-00152">2025-00152 - Eindhoven → Maastricht</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pool">Carrier Pool</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer pool" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium Carriers</SelectItem>
                          <SelectItem value="regional">Regionale Partners</SelectItem>
                          <SelectItem value="all">Alle Carriers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Min. Prijs (€)</Label>
                        <Input type="number" placeholder="150" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Max. Prijs (€)</Label>
                        <Input type="number" placeholder="200" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Deadline</Label>
                      <Input type="datetime-local" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Opmerkingen</Label>
                      <Textarea placeholder="Extra instructies voor charters..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuleren</Button>
                    <Button onClick={handleCreateTender}>
                      <Send className="mr-2 h-4 w-4" />
                      Verstuur charter aanvraag
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
                  placeholder="Zoek op titel of ordernummer..."
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
                    <TableHead>Order</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reacties</TableHead>
                    <TableHead>Beste Bod</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenders.map((tender) => {
                    const config = statusConfig[tender.status];
                    const deadlineDate = new Date(tender.deadline);
                    const isUrgent = deadlineDate < new Date(Date.now() + 24 * 60 * 60 * 1000) && 
                                    ["open", "pending_response"].includes(tender.status);
                    
                    return (
                      <TableRow key={tender.id}>
                        <TableCell className="font-medium">{tender.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tender.orderNumber}</Badge>
                        </TableCell>
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
                            {tender.responsesCount}/{tender.invitesCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tender.bestOffer ? (
                            <span className="font-medium text-emerald-600">€{tender.bestOffer}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTender(tender)}>
                            Bekijk
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Tender Detail Sheet */}
        <Sheet open={!!selectedTender} onOpenChange={(open) => !open && setSelectedTender(null)}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{selectedTender?.title}</SheetTitle>
              <SheetDescription>Order {selectedTender?.orderNumber}</SheetDescription>
            </SheetHeader>
            {selectedTender && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[selectedTender.status]?.variant} className="mt-1 gap-1">
                      {statusConfig[selectedTender.status]?.icon}
                      {statusConfig[selectedTender.status]?.label}
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
                    <p className="font-medium">€{selectedTender.expectedPriceMin} - €{selectedTender.expectedPriceMax}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reacties</p>
                    <p className="font-medium">{selectedTender.responsesCount}/{selectedTender.invitesCount}</p>
                  </div>
                </div>

                {selectedTender.bestOffer && (
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Beste Bod</p>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">€{selectedTender.bestOffer}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTender.expectedPriceMin <= selectedTender.bestOffer && selectedTender.bestOffer <= selectedTender.expectedPriceMax
                        ? "Binnen verwachting"
                        : selectedTender.bestOffer < selectedTender.expectedPriceMin
                          ? `€${selectedTender.expectedPriceMin - selectedTender.bestOffer} onder verwachting`
                          : `€${selectedTender.bestOffer - selectedTender.expectedPriceMax} boven verwachting`
                      }
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  {selectedTender.status === "open" && selectedTender.bestOffer && (
                    <Button className="flex-1" onClick={() => handleAcceptBid(selectedTender)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accepteer Bod
                    </Button>
                  )}
                  {["open", "pending_response"].includes(selectedTender.status) && (
                    <Button variant="outline" onClick={() => handleCancelTender(selectedTender)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuleren
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => navigate(`/orders?search=${selectedTender.orderNumber}`)}>
                    Bekijk Order
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
};

export default TenderDashboard;

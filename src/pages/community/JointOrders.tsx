import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Handshake, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownLeft, Filter, Plus, Eye, Download, MapPin, Calendar, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

// Placeholder data
const mockJointOrders = [
  {
    id: "JO-2024-001",
    workspace: "Benelux Courier Partners",
    orderNumber: "2024-00123",
    route: "Amsterdam → Rotterdam",
    leadCompany: "TransCo BV",
    isOwner: true,
    executingCompany: "FastDelivery NL",
    status: "in_progress",
    revenue: 450,
    cost: 320,
    margin: 130,
    date: "2024-01-15",
  },
  {
    id: "JO-2024-002",
    workspace: "XL Transport Groep",
    orderNumber: "2024-00124",
    route: "Utrecht → Eindhoven",
    leadCompany: "LogiPro",
    isOwner: false,
    executingCompany: "Mijn Bedrijf",
    status: "pending_approval",
    revenue: 280,
    cost: 0,
    margin: 280,
    date: "2024-01-14",
  },
  {
    id: "JO-2024-003",
    workspace: "Benelux Courier Partners",
    orderNumber: "2024-00125",
    route: "Den Haag → Breda",
    leadCompany: "Mijn Bedrijf",
    isOwner: true,
    executingCompany: "QuickTrans",
    status: "completed",
    revenue: 380,
    cost: 290,
    margin: 90,
    date: "2024-01-13",
  },
  {
    id: "JO-2024-004",
    workspace: "Last Mile Network",
    orderNumber: "2024-00126",
    route: "Maastricht → Nijmegen",
    leadCompany: "CityExpress",
    isOwner: false,
    executingCompany: "Mijn Bedrijf",
    status: "rejected",
    revenue: 0,
    cost: 0,
    margin: 0,
    date: "2024-01-12",
  },
];

const JointOrders = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof mockJointOrders[0] | null>(null);
  const [newOrder, setNewOrder] = useState({
    workspace: "",
    route: "",
    partner: "",
    notes: "",
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return (
          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <Clock className="mr-1 h-3 w-3" />
            Wacht op goedkeuring
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">
            <Handshake className="mr-1 h-3 w-3" />
            In uitvoering
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Afgerond
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="mr-1 h-3 w-3" />
            Afgewezen
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredOrders = mockJointOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.workspace.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWorkspace =
      workspaceFilter === "all" || order.workspace === workspaceFilter;

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "outgoing" && order.isOwner) ||
      (activeTab === "incoming" && !order.isOwner);

    return matchesSearch && matchesWorkspace && matchesTab;
  });

  const uniqueWorkspaces = [...new Set(mockJointOrders.map((o) => o.workspace))];

  const handleExport = () => {
    const exportData = filteredOrders.map(order => ({
      "Order #": order.orderNumber,
      "Workspace": order.workspace,
      "Route": order.route,
      "Type": order.isOwner ? "Uitgezet" : "Ontvangen",
      "Partner": order.isOwner ? order.executingCompany : order.leadCompany,
      "Status": order.status,
      "Omzet": order.revenue,
      "Kosten": order.cost,
      "Marge": order.margin,
      "Datum": order.date,
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `gezamenlijke-ritten-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Export voltooid ✓",
      description: `${exportData.length} ritten geëxporteerd naar CSV.`,
    });
  };

  const handleCreateOrder = () => {
    if (!newOrder.workspace || !newOrder.route) {
      toast({
        title: "Vul alle velden in",
        description: "Workspace en route zijn verplicht.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Gezamenlijke rit aangemaakt ✓",
      description: `Nieuwe rit naar ${newOrder.route} is aangemaakt in ${newOrder.workspace}.`,
    });
    setIsNewOrderDialogOpen(false);
    setNewOrder({ workspace: "", route: "", partner: "", notes: "" });
  };

  return (
    <DashboardLayout title="Gezamenlijke Ritten">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gezamenlijke Ritten</h1>
            <p className="text-muted-foreground">
              Beheer ritten die je deelt met partners in je workspaces
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsNewOrderDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Rit
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal Orders</CardTitle>
              <Handshake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockJointOrders.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uitgezet</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockJointOrders.filter((o) => o.isOwner).length}
              </div>
              <p className="text-xs text-muted-foreground">Jij als opdrachtgever</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ontvangen</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockJointOrders.filter((o) => !o.isOwner).length}
              </div>
              <p className="text-xs text-muted-foreground">Jij als uitvoerder</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wacht op Actie</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockJointOrders.filter((o) => o.status === "pending_approval").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="outgoing" className="gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Uitgezet
              </TabsTrigger>
              <TabsTrigger value="incoming" className="gap-1">
                <ArrowDownLeft className="h-3 w-3" />
                Ontvangen
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Zoeken..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Alle workspaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle workspaces</SelectItem>
                  {uniqueWorkspaces.map((ws) => (
                    <SelectItem key={ws} value={ws}>
                      {ws}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders Overzicht</CardTitle>
                <CardDescription>
                  {activeTab === "outgoing"
                    ? "Orders die je hebt uitgezet bij partners"
                    : activeTab === "incoming"
                    ? "Orders die je hebt ontvangen van partners"
                    : "Alle gezamenlijke orders"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <TableCell>
                          <div className="font-medium">{order.orderNumber}</div>
                          <div className="text-xs text-muted-foreground">{order.date}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.workspace}</Badge>
                        </TableCell>
                        <TableCell>{order.route}</TableCell>
                        <TableCell>
                          {order.isOwner ? (
                            <div className="flex items-center gap-1 text-violet-600">
                              <ArrowUpRight className="h-4 w-4" />
                              <span className="text-sm">Uitgezet</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <ArrowDownLeft className="h-4 w-4" />
                              <span className="text-sm">Ontvangen</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.isOwner ? order.executingCompany : order.leadCompany}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          {order.margin > 0 ? (
                            <span className="font-medium text-emerald-600">
                              €{order.margin.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Geen orders gevonden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Order Dialog */}
        <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Gezamenlijke Rit</DialogTitle>
              <DialogDescription>
                Maak een nieuwe rit aan om te delen met een partner
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Workspace *</Label>
                <Select value={newOrder.workspace} onValueChange={(v) => setNewOrder({ ...newOrder, workspace: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueWorkspaces.map((ws) => (
                      <SelectItem key={ws} value={ws}>{ws}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Route *</Label>
                <Input
                  placeholder="bijv. Amsterdam → Rotterdam"
                  value={newOrder.route}
                  onChange={(e) => setNewOrder({ ...newOrder, route: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Partner bedrijf</Label>
                <Input
                  placeholder="Naam van partner"
                  value={newOrder.partner}
                  onChange={(e) => setNewOrder({ ...newOrder, partner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notities</Label>
                <Input
                  placeholder="Extra informatie..."
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewOrderDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleCreateOrder}>Aanmaken</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Detail Sheet */}
        <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                {selectedOrder?.orderNumber}
              </SheetTitle>
              <SheetDescription>
                Details van de gezamenlijke rit
              </SheetDescription>
            </SheetHeader>
            {selectedOrder && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  {getStatusBadge(selectedOrder.status)}
                  <Badge variant="outline">
                    {selectedOrder.isOwner ? "Uitgezet" : "Ontvangen"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="font-medium">{selectedOrder.route}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Workspace</p>
                      <p className="font-medium">{selectedOrder.workspace}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Datum</p>
                      <p className="font-medium">{selectedOrder.date}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Partijen</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Opdrachtgever</p>
                      <p className="font-medium">{selectedOrder.leadCompany}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Uitvoerder</p>
                      <p className="font-medium">{selectedOrder.executingCompany}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Financieel</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Omzet</p>
                      <p className="font-bold text-lg">€{selectedOrder.revenue}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Kosten</p>
                      <p className="font-bold text-lg">€{selectedOrder.cost}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                      <p className="text-xs text-muted-foreground">Marge</p>
                      <p className="font-bold text-lg text-emerald-600">€{selectedOrder.margin}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={() => {
                    // Navigate to messenger with order context
                    navigate(`/messenger?order=${selectedOrder.orderNumber}&partner=${encodeURIComponent(selectedOrder.isOwner ? selectedOrder.executingCompany : selectedOrder.leadCompany)}`);
                  }}>
                    Open Chat
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(null)}>
                    Sluiten
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

export default JointOrders;

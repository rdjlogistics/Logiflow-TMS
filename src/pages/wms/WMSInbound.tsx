import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowDownToLine,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Truck,
  MoreHorizontal,
  Edit,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInboundOrders, useCreateInboundOrder, useWarehouses } from "@/hooks/useWMS";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { WMSGlassCard, WMSCardTitle, WMSStatCard } from "@/components/wms";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/hooks/useCompany";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Wachtend", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: <Clock className="h-3 w-3" /> },
  partial: { label: "Deels ontvangen", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: <Package className="h-3 w-3" /> },
  received: { label: "Ontvangen", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Geannuleerd", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
};

export default function WMSInbound() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newOrder, setNewOrder] = useState({
    warehouse_id: "",
    supplier_name: "",
    supplier_reference: "",
    expected_date: "",
    notes: "",
  });

  const { data: orders, isLoading } = useInboundOrders(activeTab !== "all" ? activeTab : undefined);
  const { data: warehouses } = useWarehouses();
  const createOrder = useCreateInboundOrder();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { company } = useCompany();

  const filteredOrders = orders?.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrder = () => {
    if (!newOrder.warehouse_id) {
      toast({ title: "Selecteer een magazijn", variant: "destructive" });
      return;
    }
    
    createOrder.mutate(
      {
        ...newOrder,
        expected_date: newOrder.expected_date || null,
      } as any,
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setNewOrder({
            warehouse_id: "",
            supplier_name: "",
            supplier_reference: "",
            expected_date: "",
            notes: "",
          });
        },
      }
    );
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "received") {
        updates.received_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("inbound_orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: `Order ${status === "received" ? "ontvangen" : "bijgewerkt"}` });
      queryClient.invalidateQueries({ queryKey: ["inbound-orders"] });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const pendingCount = orders?.filter((o) => o.status === "pending").length || 0;
  const partialCount = orders?.filter((o) => o.status === "partial").length || 0;
  const receivedCount = orders?.filter((o) => o.status === "received").length || 0;
  const linkedCount = orders?.filter((o) => o.trip_id).length || 0;

  return (
    <DashboardLayout title="Ontvangst (Inbound)">
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <p className="text-muted-foreground">
            Beheer inkomende leveringen en goederenontvangst
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe Inbound Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Inbound Order</DialogTitle>
              <DialogDescription>
                Registreer een inkomende levering
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Magazijn *</Label>
                <Select value={newOrder.warehouse_id} onValueChange={(v) => setNewOrder({ ...newOrder, warehouse_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer magazijn" /></SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leverancier</Label>
                  <Input
                    placeholder="Leveranciersnaam"
                    value={newOrder.supplier_name}
                    onChange={(e) => setNewOrder({ ...newOrder, supplier_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referentie</Label>
                  <Input
                    placeholder="PO-12345"
                    value={newOrder.supplier_reference}
                    onChange={(e) => setNewOrder({ ...newOrder, supplier_reference: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Verwachte datum</Label>
                <Input
                  type="date"
                  value={newOrder.expected_date}
                  onChange={(e) => setNewOrder({ ...newOrder, expected_date: e.target.value })}
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
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleCreateOrder} disabled={createOrder.isPending}>
                {createOrder.isPending ? "Bezig..." : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <WMSStatCard
          title="Wachtend"
          value={pendingCount}
          icon={<Clock className="h-full w-full" />}
          variant="warning"
        />
        <WMSStatCard
          title="Deels ontvangen"
          value={partialCount}
          icon={<Package className="h-full w-full" />}
          variant="primary"
        />
        <WMSStatCard
          title="Afgerond"
          value={receivedCount}
          icon={<CheckCircle2 className="h-full w-full" />}
          variant="success"
        />
        <WMSStatCard
          title="TMS Gekoppeld"
          value={linkedCount}
          icon={<Truck className="h-full w-full" />}
          variant="gold"
        />
      </div>

      {/* Orders List */}
      <WMSGlassCard
        header={
          <WMSCardTitle subtitle={`${filteredOrders?.length || 0} orders gevonden`}>
            Inbound Orders
          </WMSCardTitle>
        }
        actions={
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op order, leverancier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        }
        noPadding
      >
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Wachtend</TabsTrigger>
              <TabsTrigger value="partial">Deels ontvangen</TabsTrigger>
              <TabsTrigger value="received">Afgerond</TabsTrigger>
              <TabsTrigger value="all">Alle</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredOrders?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowDownToLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Geen orders gevonden</p>
                  <p className="text-sm mb-4">Maak een nieuwe inbound order aan</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Order
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Leverancier</TableHead>
                      <TableHead>Magazijn</TableHead>
                      <TableHead>Verwacht</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>TMS</TableHead>
                      <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders?.map((order, index) => {
                      const status = statusConfig[order.status] || statusConfig.pending;
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <TableCell>
                            <span className="font-mono font-medium">{order.order_number}</span>
                            {order.supplier_reference && (
                              <p className="text-xs text-muted-foreground">
                                Ref: {order.supplier_reference}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{order.supplier_name || "-"}</TableCell>
                          <TableCell>{order.warehouse?.name}</TableCell>
                          <TableCell>
                            {order.expected_date ? (
                              <div>
                                <p className="text-sm">
                                  {format(new Date(order.expected_date), "dd MMM yyyy", { locale: nl })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(order.expected_date), {
                                    addSuffix: true,
                                    locale: nl,
                                  })}
                                </p>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color} variant="outline">
                              <span className="mr-1">{status.icon}</span>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.trip_id ? (
                              <Badge variant="secondary">
                                <Truck className="h-3 w-3 mr-1" />
                                Gekoppeld
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Bekijken
                                </DropdownMenuItem>
                                {order.status === "pending" && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "partial")}>
                                      Deels ontvangen
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "received")}>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Volledig ontvangen
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {order.status === "partial" && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "received")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Volledig ontvangen
                                  </DropdownMenuItem>
                                )}
                                {order.status !== "cancelled" && order.status !== "received" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleUpdateStatus(order.id, "cancelled")}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Annuleren
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </WMSGlassCard>

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedOrder?.order_number}
            </SheetTitle>
            <SheetDescription>
              Inbound order details
            </SheetDescription>
          </SheetHeader>
          {selectedOrder && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <Badge className={statusConfig[selectedOrder.status]?.color || "bg-muted"} variant="outline">
                  <span className="mr-1">{statusConfig[selectedOrder.status]?.icon}</span>
                  {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
                {selectedOrder.trip_id && (
                  <Badge variant="secondary">
                    <Truck className="h-3 w-3 mr-1" />
                    TMS Gekoppeld
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Leverancier</p>
                    <p className="font-medium">{selectedOrder.supplier_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Referentie</p>
                    <p className="font-medium">{selectedOrder.supplier_reference || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Magazijn</p>
                    <p className="font-medium">{selectedOrder.warehouse?.name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Verwachte datum</p>
                    <p className="font-medium">
                      {selectedOrder.expected_date
                        ? format(new Date(selectedOrder.expected_date), "dd MMMM yyyy", { locale: nl })
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Notities</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedOrder.status === "pending" && (
                  <>
                    <Button className="flex-1" onClick={() => {
                      handleUpdateStatus(selectedOrder.id, "received");
                      setSelectedOrder(null);
                    }}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Volledig Ontvangen
                    </Button>
                    <Button variant="outline" onClick={() => {
                      handleUpdateStatus(selectedOrder.id, "partial");
                      setSelectedOrder(null);
                    }}>
                      Deels Ontvangen
                    </Button>
                  </>
                )}
                {selectedOrder.status === "partial" && (
                  <Button className="flex-1" onClick={() => {
                    handleUpdateStatus(selectedOrder.id, "received");
                    setSelectedOrder(null);
                  }}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Volledig Ontvangen
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Sluiten
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

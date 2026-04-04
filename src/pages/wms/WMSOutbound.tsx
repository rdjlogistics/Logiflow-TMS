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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowUpFromLine,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  Truck,
  PlayCircle,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOutboundOrders, useCreateOutboundOrder, useWarehouses } from "@/hooks/useWMS";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { WMSGlassCard, WMSCardTitle, WMSStatCard } from "@/components/wms";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Wachtend", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: <Clock className="h-3 w-3" /> },
  allocated: { label: "Gealloceerd", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: <Package className="h-3 w-3" /> },
  picking: { label: "Picking", color: "bg-violet-500/15 text-violet-600 border-violet-500/30", icon: <Layers className="h-3 w-3" /> },
  packed: { label: "Ingepakt", color: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30", icon: <Package className="h-3 w-3" /> },
  shipped: { label: "Verzonden", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Geannuleerd", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: <Clock className="h-3 w-3" /> },
};

export default function WMSOutbound() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    warehouse_id: "",
    customer_id: "",
    customer_reference: "",
    required_date: "",
    priority: "3",
    picking_strategy: "fifo",
    notes: "",
  });

  const { data: orders, isLoading } = useOutboundOrders(activeTab !== "all" ? activeTab : undefined);
  const { data: warehouses } = useWarehouses();
  const createOrder = useCreateOutboundOrder();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredOrders = orders?.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrder = () => {
    if (!newOrder.warehouse_id) {
      toast({ title: "Selecteer een magazijn", variant: "destructive" });
      return;
    }
    
    createOrder.mutate(
      {
        ...newOrder,
        priority: parseInt(newOrder.priority),
        required_date: newOrder.required_date || null,
        customer_id: newOrder.customer_id || null,
      } as any,
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setNewOrder({
            warehouse_id: "",
            customer_id: "",
            customer_reference: "",
            required_date: "",
            priority: "3",
            picking_strategy: "fifo",
            notes: "",
          });
        },
      }
    );
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "shipped") {
        updates.shipped_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("outbound_orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: `Order status: ${statusConfig[status]?.label || status}` });
      queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const counts = {
    pending: orders?.filter((o) => o.status === "pending").length || 0,
    allocated: orders?.filter((o) => o.status === "allocated").length || 0,
    picking: orders?.filter((o) => o.status === "picking").length || 0,
    packed: orders?.filter((o) => o.status === "packed").length || 0,
    shipped: orders?.filter((o) => o.status === "shipped").length || 0,
  };

  return (
    <DashboardLayout title="Verzending (Outbound)">
      {/* Header */}
      <div}}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <p className="text-muted-foreground">
            Beheer uitgaande orders, picking en verzending
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            Start Wave
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuwe Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Outbound Order</DialogTitle>
                <DialogDescription>
                  Maak een uitgaande order aan
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
                    <Label>Klant Referentie</Label>
                    <Input
                      placeholder="ORD-12345"
                      value={newOrder.customer_reference}
                      onChange={(e) => setNewOrder({ ...newOrder, customer_reference: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vereiste datum</Label>
                    <Input
                      type="date"
                      value={newOrder.required_date}
                      onChange={(e) => setNewOrder({ ...newOrder, required_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioriteit</Label>
                    <Select value={newOrder.priority} onValueChange={(v) => setNewOrder({ ...newOrder, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">P1 - Kritiek</SelectItem>
                        <SelectItem value="2">P2 - Hoog</SelectItem>
                        <SelectItem value="3">P3 - Normaal</SelectItem>
                        <SelectItem value="4">P4 - Laag</SelectItem>
                        <SelectItem value="5">P5 - Laagst</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Picking Strategie</Label>
                    <Select value={newOrder.picking_strategy} onValueChange={(v) => setNewOrder({ ...newOrder, picking_strategy: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fifo">FIFO</SelectItem>
                        <SelectItem value="fefo">FEFO</SelectItem>
                        <SelectItem value="lifo">LIFO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <WMSStatCard title="Wachtend" value={counts.pending} icon={<Clock className="h-full w-full" />} variant="warning" />
        <WMSStatCard title="Gealloceerd" value={counts.allocated} icon={<Package className="h-full w-full" />} variant="primary" />
        <WMSStatCard title="Picking" value={counts.picking} icon={<Layers className="h-full w-full" />} variant="gold" />
        <WMSStatCard title="Ingepakt" value={counts.packed} icon={<Package className="h-full w-full" />} variant="default" />
        <WMSStatCard title="Verzonden" value={counts.shipped} icon={<CheckCircle2 className="h-full w-full" />} variant="success" />
      </div>

      {/* Orders List */}
      <WMSGlassCard
        header={
          <WMSCardTitle subtitle={`${filteredOrders?.length || 0} orders gevonden`}>
            Outbound Orders
          </WMSCardTitle>
        }
        actions={
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op order, klant..."
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
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="pending">Wachtend</TabsTrigger>
              <TabsTrigger value="allocated">Gealloceerd</TabsTrigger>
              <TabsTrigger value="picking">Picking</TabsTrigger>
              <TabsTrigger value="packed">Ingepakt</TabsTrigger>
              <TabsTrigger value="shipped">Verzonden</TabsTrigger>
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
                  <ArrowUpFromLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Geen orders gevonden</p>
                  <p className="text-sm mb-4">Maak een nieuwe outbound order aan</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Order
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Klant</TableHead>
                        <TableHead>Magazijn</TableHead>
                        <TableHead>Vereist op</TableHead>
                        <TableHead>Prioriteit</TableHead>
                        <TableHead>Strategie</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders?.map((order, index) => {
                        const status = statusConfig[order.status] || statusConfig.pending;

                        return (
                          <tr
                            key={order.id}}}}
                            className="border-b border-border/50 hover:bg-muted/30"
                          >
                            <TableCell>
                              <span className="font-mono font-medium">{order.order_number}</span>
                              {order.customer_reference && (
                                <p className="text-xs text-muted-foreground">
                                  Ref: {order.customer_reference}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>{order.customer?.company_name || "-"}</TableCell>
                            <TableCell>{order.warehouse?.name}</TableCell>
                            <TableCell>
                              {order.required_date ? (
                                <div>
                                  <p className="text-sm">
                                    {format(new Date(order.required_date), "dd MMM yyyy", { locale: nl })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(order.required_date), {
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
                              <Badge variant={order.priority <= 2 ? "destructive" : order.priority <= 3 ? "default" : "secondary"}>
                                P{order.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="uppercase text-xs">
                                {order.picking_strategy}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.color} variant="outline">
                                <span className="mr-1">{status.icon}</span>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {order.status === "pending" && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "allocated")}>
                                      <Package className="h-4 w-4 mr-2" />
                                      Alloceren
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === "allocated" && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "picking")}>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Start Picking
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === "picking" && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "packed")}>
                                      <Package className="h-4 w-4 mr-2" />
                                      Markeer als ingepakt
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === "packed" && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, "shipped")}>
                                      <Truck className="h-4 w-4 mr-2" />
                                      Markeer als verzonden
                                    </DropdownMenuItem>
                                  )}
                                  {!["shipped", "cancelled"].includes(order.status) && (
                                    <DropdownMenuItem 
                                      onClick={() => handleUpdateStatus(order.id, "cancelled")}
                                      className="text-destructive"
                                    >
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
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </WMSGlassCard>
    </DashboardLayout>
  );
}

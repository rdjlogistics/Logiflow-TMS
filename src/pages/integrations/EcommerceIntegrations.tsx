import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  RefreshCw,
  ShoppingCart,
  Package,
  Store,
  Check,
  X,
  Clock,
  AlertCircle,
  ArrowRight,
  Trash2,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  useEcommerceConnections,
  useEcommerceOrders,
  useCreateConnection,
  useDeleteConnection,
  useSyncConnection,
  useConvertOrderToTrip,
  useBulkConvertOrders,
  useUpdateOrderStatus,
  type EcommerceOrder,
} from "@/hooks/useEcommerceIntegrations";

const platformConfig = {
  shopify: {
    name: "Shopify",
    icon: "🛍️",
    color: "bg-green-500",
    description: "Synchroniseer orders van je Shopify webshop",
  },
  woocommerce: {
    name: "WooCommerce",
    icon: "🔌",
    color: "bg-purple-500",
    description: "Importeer orders van je WordPress WooCommerce shop",
  },
  magento: {
    name: "Magento",
    icon: "🧱",
    color: "bg-orange-500",
    description: "Integreer met Adobe Commerce / Magento",
  },
  prestashop: {
    name: "PrestaShop",
    icon: "🎯",
    color: "bg-blue-500",
    description: "Koppel je PrestaShop webwinkel",
  },
};

const EcommerceIntegrations = () => {
  const [selectedTab, setSelectedTab] = useState("connections");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [newConnection, setNewConnection] = useState({
    platform: "shopify" as keyof typeof platformConfig,
    store_name: "",
    store_url: "",
    api_key: "",
    api_secret: "",
  });

  const { data: connections, isLoading: connectionsLoading } = useEcommerceConnections();
  const { data: orders, isLoading: ordersLoading } = useEcommerceOrders(
    undefined,
    statusFilter === "all" ? undefined : statusFilter
  );
  const createConnection = useCreateConnection();
  const deleteConnection = useDeleteConnection();
  const syncConnection = useSyncConnection();
  const convertOrder = useConvertOrderToTrip();
  const bulkConvert = useBulkConvertOrders();
  const updateStatus = useUpdateOrderStatus();

  const handleCreateConnection = async () => {
    await createConnection.mutateAsync({
      platform: newConnection.platform,
      store_name: newConnection.store_name,
      store_url: newConnection.store_url,
      api_key: newConnection.api_key,
      api_secret: newConnection.api_secret,
    });
    setIsAddDialogOpen(false);
    setNewConnection({
      platform: "shopify",
      store_name: "",
      store_url: "",
      api_key: "",
      api_secret: "",
    });
  };

  const handleBulkConvert = async () => {
    if (selectedOrders.length === 0) return;
    await bulkConvert.mutateAsync(selectedOrders);
    setSelectedOrders([]);
  };

  const filteredOrders = orders?.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.external_order_number?.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_email?.toLowerCase().includes(query)
    );
  });

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" />Gesynchroniseerd</Badge>;
      case "syncing":
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Bezig...</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Fout</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />In afwachting</Badge>;
    }
  };

  const getConversionStatusBadge = (status: string) => {
    switch (status) {
      case "converted":
        return <Badge variant="default" className="bg-green-500">Omgezet</Badge>;
      case "skipped":
        return <Badge variant="secondary">Overgeslagen</Badge>;
      case "error":
        return <Badge variant="destructive">Fout</Badge>;
      default:
        return <Badge variant="outline">In afwachting</Badge>;
    }
  };

  return (
    <DashboardLayout title="E-commerce Integraties">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">E-commerce Integraties</h1>
            <p className="text-muted-foreground">
              Importeer orders van Shopify, WooCommerce en andere webshops
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Webshop Koppelen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nieuwe Webshop Koppelen</DialogTitle>
                <DialogDescription>
                  Verbind je e-commerce platform om orders automatisch te importeren
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Platform *</Label>
                  <Select
                    value={newConnection.platform}
                    onValueChange={(v) => setNewConnection({ ...newConnection, platform: v as keyof typeof platformConfig })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(platformConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Winkel Naam *</Label>
                  <Input
                    placeholder="Mijn Webshop"
                    value={newConnection.store_name}
                    onChange={(e) => setNewConnection({ ...newConnection, store_name: e.target.value.slice(0, 100) })}
                    maxLength={100}
                  />
                  {newConnection.store_name.length === 0 && (
                    <p className="text-xs text-muted-foreground">Geef je webshop een herkenbare naam</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Winkel URL *</Label>
                  <Input
                    placeholder="https://mijnwebshop.nl"
                    type="url"
                    value={newConnection.store_url}
                    onChange={(e) => setNewConnection({ ...newConnection, store_url: e.target.value.trim().slice(0, 255) })}
                    maxLength={255}
                  />
                  {newConnection.store_url && !newConnection.store_url.startsWith('https://') && (
                    <p className="text-xs text-amber-500">URL moet beginnen met https://</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="Je API key"
                    value={newConnection.api_key}
                    onChange={(e) => setNewConnection({ ...newConnection, api_key: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Te vinden in je webshop admin panel</p>
                </div>
                <div className="space-y-2">
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    placeholder="Je API secret"
                    value={newConnection.api_secret}
                    onChange={(e) => setNewConnection({ ...newConnection, api_secret: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button
                  onClick={handleCreateConnection}
                  disabled={
                    !newConnection.store_name.trim() || 
                    !newConnection.store_url.trim() ||
                    !newConnection.store_url.startsWith('https://') ||
                    createConnection.isPending
                  }
                >
                  {createConnection.isPending ? "Bezig..." : "Koppelen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{connections?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Gekoppelde Shops</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <ShoppingCart className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {orders?.filter((o) => o.conversion_status === "pending").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Te Verwerken</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Package className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {orders?.filter((o) => o.conversion_status === "converted").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Omgezet</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <RefreshCw className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{orders?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Totaal Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="connections">Koppelingen</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-4">
            {connectionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : connections?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Store className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Geen Webshops Gekoppeld</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Koppel je eerste webshop om orders automatisch te importeren
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Webshop Koppelen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections?.map((connection) => {
                  const config = platformConfig[connection.platform as keyof typeof platformConfig];
                  return (
                    <Card key={connection.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.color} text-white text-xl`}>
                              {config.icon}
                            </div>
                            <div>
                              <CardTitle className="text-base">{connection.store_name}</CardTitle>
                              <CardDescription className="text-xs">{config.name}</CardDescription>
                            </div>
                          </div>
                          {getSyncStatusBadge(connection.sync_status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <a
                          href={connection.store_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {connection.store_url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {connection.last_sync_at && (
                          <p className="text-xs text-muted-foreground">
                            Laatste sync: {format(new Date(connection.last_sync_at), "dd MMM yyyy HH:mm", { locale: nl })}
                          </p>
                        )}
                        {connection.sync_error && (
                          <p className="text-xs text-destructive">{connection.sync_error}</p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => syncConnection.mutate(connection.id)}
                            disabled={syncConnection.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${syncConnection.isPending ? "animate-spin" : ""}`} />
                            Sync
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConnection.mutate(connection.id)}
                            disabled={deleteConnection.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op ordernummer, klant..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="pending">Te verwerken</SelectItem>
                  <SelectItem value="converted">Omgezet</SelectItem>
                  <SelectItem value="skipped">Overgeslagen</SelectItem>
                </SelectContent>
              </Select>
              {selectedOrders.length > 0 && (
                <Button onClick={handleBulkConvert} disabled={bulkConvert.isPending}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {selectedOrders.length} Omzetten naar Ritten
                </Button>
              )}
            </div>

            {/* Orders Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          (filteredOrders?.length ?? 0) > 0 &&
                          filteredOrders!.filter((o) => o.conversion_status === "pending").every((o) =>
                            selectedOrders.includes(o.id)
                          )
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders(
                              filteredOrders?.filter((o) => o.conversion_status === "pending").map((o) => o.id) || []
                            );
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Bezorgadres</TableHead>
                    <TableHead className="text-right">Bedrag</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Geen orders gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => {
                      const config = platformConfig[order.platform as keyof typeof platformConfig];
                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.includes(order.id)}
                              disabled={order.conversion_status !== "pending"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedOrders([...selectedOrders, order.id]);
                                } else {
                                  setSelectedOrders(selectedOrders.filter((id) => id !== order.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.external_order_number || order.external_order_id}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <span>{config?.icon}</span>
                              <span className="text-sm">{config?.name}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.shipping_address_json && (
                              <div className="text-sm">
                                <p>{order.shipping_address_json.address1}</p>
                                <p className="text-muted-foreground">
                                  {order.shipping_address_json.postal_code} {order.shipping_address_json.city}
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            €{order.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(order.order_date), "dd MMM yyyy", { locale: nl })}
                          </TableCell>
                          <TableCell>{getConversionStatusBadge(order.conversion_status)}</TableCell>
                          <TableCell>
                            {order.conversion_status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => convertOrder.mutate(order.id)}
                                disabled={convertOrder.isPending}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EcommerceIntegrations;

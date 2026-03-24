import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Search,
  Filter,
  Download,
  Plus,
  AlertTriangle,
  MapPin,
  Barcode,
} from "lucide-react";
import { useInventory, useWarehouses, useWMSProducts } from "@/hooks/useWMS";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

export default function WMSInventory() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newInventory, setNewInventory] = useState({
    product: "",
    warehouse: "",
    location: "",
    quantity: "",
    batchNumber: "",
  });

  const { data: warehouses } = useWarehouses();
  const { data: inventory, isLoading } = useInventory(
    warehouseFilter !== "all" ? warehouseFilter : undefined
  );
  const { data: products } = useWMSProducts();

  const filteredInventory = inventory?.filter((inv) => {
    const matchesSearch =
      inv.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" &&
        inv.product?.min_stock_level &&
        inv.available_quantity < inv.product.min_stock_level) ||
      (stockFilter === "out" && inv.available_quantity <= 0) ||
      (stockFilter === "expiring" &&
        inv.expiry_date &&
        new Date(inv.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    return matchesSearch && matchesStock;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);

  const handleExport = () => {
    if (!filteredInventory?.length) {
      toast({ title: "Geen data", description: "Er is geen voorraad om te exporteren.", variant: "destructive" });
      return;
    }

    const exportData = filteredInventory.map((inv) => ({
      "Product": inv.product?.name || "",
      "SKU": inv.product?.sku || "",
      "Magazijn": inv.warehouse?.name || "",
      "Locatie": inv.location?.code || "",
      "Voorraad": inv.quantity,
      "Gereserveerd": inv.reserved_quantity,
      "Beschikbaar": inv.available_quantity,
      "Batch": inv.batch_number || "",
      "Vervaldatum": inv.expiry_date || "",
      "Waarde": inv.unit_cost ? inv.quantity * inv.unit_cost : 0,
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `voorraad-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Export voltooid ✓",
      description: `${exportData.length} voorraadregels geëxporteerd naar CSV.`,
    });
  };

  const handleAddInventory = () => {
    if (!newInventory.product || !newInventory.warehouse || !newInventory.quantity) {
      toast({
        title: "Vul alle verplichte velden in",
        description: "Product, magazijn en hoeveelheid zijn verplicht.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Voorraad toegevoegd ✓",
      description: `${newInventory.quantity} eenheden toegevoegd aan voorraad.`,
    });
    setIsAddDialogOpen(false);
    setNewInventory({ product: "", warehouse: "", location: "", quantity: "", batchNumber: "" });
  };

  return (
    <DashboardLayout title="Voorraad">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op product, SKU of batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Alle magazijnen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle magazijnen</SelectItem>
                {warehouses?.map((wh) => (
                  <SelectItem key={wh.id} value={wh.id}>
                    {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alle voorraad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle voorraad</SelectItem>
                <SelectItem value="low">Lage voorraad</SelectItem>
                <SelectItem value="out">Niet op voorraad</SelectItem>
                <SelectItem value="expiring">Verloopt binnenkort</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporteren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voorraad Overzicht</CardTitle>
              <CardDescription>
                {filteredInventory?.length || 0} regels gevonden
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Voorraad Toevoegen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredInventory?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Geen voorraad gevonden</p>
              <p className="text-sm">Pas de filters aan of voeg nieuwe voorraad toe</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU / Barcode</TableHead>
                    <TableHead>Magazijn</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead className="text-right">Voorraad</TableHead>
                    <TableHead className="text-right">Gereserveerd</TableHead>
                    <TableHead className="text-right">Beschikbaar</TableHead>
                    <TableHead>Batch / Lot</TableHead>
                    <TableHead>Vervaldatum</TableHead>
                    <TableHead className="text-right">Waarde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory?.map((inv) => {
                    const isLowStock =
                      inv.product?.min_stock_level &&
                      inv.available_quantity < inv.product.min_stock_level;
                    const isExpiring =
                      inv.expiry_date &&
                      new Date(inv.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <TableRow key={inv.id} className={isLowStock ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-medium">{inv.product?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{inv.product?.sku}</span>
                            {inv.product?.barcode && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Barcode className="h-3 w-3" />
                                {inv.product.barcode}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{inv.warehouse?.name}</TableCell>
                        <TableCell>
                          {inv.location ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono text-xs">{inv.location.code}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {inv.quantity} {inv.product?.unit_of_measure}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {inv.reserved_quantity > 0 ? inv.reserved_quantity : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={inv.available_quantity <= 0 ? "destructive" : isLowStock ? "outline" : "default"}>
                            {inv.available_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inv.batch_number || inv.lot_number ? (
                            <span className="font-mono text-xs">
                              {inv.batch_number || inv.lot_number}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {inv.expiry_date ? (
                            <Badge variant={isExpiring ? "destructive" : "outline"}>
                              {format(new Date(inv.expiry_date), "dd MMM yyyy", { locale: nl })}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.unit_cost
                            ? formatCurrency(inv.quantity * inv.unit_cost)
                            : "-"}
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

      {/* Add Inventory Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voorraad Toevoegen</DialogTitle>
            <DialogDescription>
              Voeg nieuwe voorraad toe aan een magazijn
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={newInventory.product} onValueChange={(v) => setNewInventory({ ...newInventory, product: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Magazijn *</Label>
                <Select value={newInventory.warehouse} onValueChange={(v) => setNewInventory({ ...newInventory, warehouse: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hoeveelheid *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newInventory.quantity}
                  onChange={(e) => setNewInventory({ ...newInventory, quantity: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Locatie code</Label>
                <Input
                  placeholder="bijv. A-01-01"
                  value={newInventory.location}
                  onChange={(e) => setNewInventory({ ...newInventory, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Batch / Lot nummer</Label>
                <Input
                  placeholder="BATCH-001"
                  value={newInventory.batchNumber}
                  onChange={(e) => setNewInventory({ ...newInventory, batchNumber: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleAddInventory}>Toevoegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

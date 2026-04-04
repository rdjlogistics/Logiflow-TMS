import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Package,
  Search,
  Plus,
  Barcode,
  Ruler,
  Thermometer,
  AlertTriangle,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWMSProducts, useCreateWMSProduct } from "@/hooks/useWMS";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { WMSGlassCard, WMSCardTitle, WMSStatCard } from "@/components/wms";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";

export default function WMSProducts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: "",
    barcode: "",
    name: "",
    description: "",
    category: "",
    unit_of_measure: "stuk",
    weight_kg: "",
    length_cm: "",
    width_cm: "",
    height_cm: "",
    min_stock_level: "0",
    storage_requirements: "normal",
  });

  const { data: products, isLoading } = useWMSProducts();
  const createProduct = useCreateWMSProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredProducts = products?.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setNewProduct({
      sku: "",
      barcode: "",
      name: "",
      description: "",
      category: "",
      unit_of_measure: "stuk",
      weight_kg: "",
      length_cm: "",
      width_cm: "",
      height_cm: "",
      min_stock_level: "0",
      storage_requirements: "normal",
    });
    setEditingProduct(null);
  };

  const handleCreateProduct = () => {
    createProduct.mutate(
      {
        ...newProduct,
        weight_kg: newProduct.weight_kg ? parseFloat(newProduct.weight_kg) : undefined,
        length_cm: newProduct.length_cm ? parseFloat(newProduct.length_cm) : undefined,
        width_cm: newProduct.width_cm ? parseFloat(newProduct.width_cm) : undefined,
        height_cm: newProduct.height_cm ? parseFloat(newProduct.height_cm) : undefined,
        min_stock_level: parseInt(newProduct.min_stock_level) || 0,
      } as any,
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setNewProduct({
      sku: product.sku || "",
      barcode: product.barcode || "",
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      unit_of_measure: product.unit_of_measure || "stuk",
      weight_kg: product.weight_kg?.toString() || "",
      length_cm: product.length_cm?.toString() || "",
      width_cm: product.width_cm?.toString() || "",
      height_cm: product.height_cm?.toString() || "",
      min_stock_level: product.min_stock_level?.toString() || "0",
      storage_requirements: product.storage_requirements || "normal",
    });
    setIsDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      const { error } = await supabase
        .from("wms_products")
        .update({
          ...newProduct,
          weight_kg: newProduct.weight_kg ? parseFloat(newProduct.weight_kg) : null,
          length_cm: newProduct.length_cm ? parseFloat(newProduct.length_cm) : null,
          width_cm: newProduct.width_cm ? parseFloat(newProduct.width_cm) : null,
          height_cm: newProduct.height_cm ? parseFloat(newProduct.height_cm) : null,
          min_stock_level: parseInt(newProduct.min_stock_level) || 0,
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast({ title: "Product bijgewerkt" });
      queryClient.invalidateQueries({ queryKey: ["wms-products"] });
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProductClick = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProductConfirm = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("wms_products")
        .update({ is_active: false })
        .eq("id", productToDelete);

      if (error) throw error;

      toast({ title: "Product verwijderd" });
      queryClient.invalidateQueries({ queryKey: ["wms-products"] });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleToggleActive = async (product: any) => {
    try {
      const { error } = await supabase
        .from("wms_products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;

      toast({ title: product.is_active ? "Product gedeactiveerd" : "Product geactiveerd" });
      queryClient.invalidateQueries({ queryKey: ["wms-products"] });
    } catch (error: any) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    }
  };

  const storageIcon = (req: string | undefined) => {
    switch (req) {
      case "cold":
        return <Thermometer className="h-3 w-3 text-blue-500" />;
      case "frozen":
        return <Thermometer className="h-3 w-3 text-cyan-500" />;
      case "hazmat":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const activeProducts = products?.filter(p => p.is_active) || [];
  const inactiveProducts = products?.filter(p => !p.is_active) || [];

  return (
    <DashboardLayout title="Producten / SKU's">
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <p className="text-muted-foreground">
            Beheer producten, SKU's en artikeleigenschappen
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuw Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Product Bewerken" : "Nieuw Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct ? "Wijzig de productgegevens" : "Voeg een nieuw product toe aan het WMS"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    placeholder="SKU-001"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, sku: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    placeholder="8710123456789"
                    value={newProduct.barcode}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, barcode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  placeholder="Product naam"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Omschrijving</Label>
                <Input
                  id="description"
                  placeholder="Korte omschrijving"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categorie</Label>
                  <Input
                    id="category"
                    placeholder="Electronica"
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Eenheid</Label>
                  <Select
                    value={newProduct.unit_of_measure}
                    onValueChange={(v) =>
                      setNewProduct({ ...newProduct, unit_of_measure: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stuk">Stuk</SelectItem>
                      <SelectItem value="doos">Doos</SelectItem>
                      <SelectItem value="pallet">Pallet</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Gewicht (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.001"
                    placeholder="0.5"
                    value={newProduct.weight_kg}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, weight_kg: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length">L (cm)</Label>
                  <Input
                    id="length"
                    type="number"
                    placeholder="30"
                    value={newProduct.length_cm}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, length_cm: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width">B (cm)</Label>
                  <Input
                    id="width"
                    type="number"
                    placeholder="20"
                    value={newProduct.width_cm}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, width_cm: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">H (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="10"
                    value={newProduct.height_cm}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, height_cm: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Min. Voorraad</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    placeholder="10"
                    value={newProduct.min_stock_level}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, min_stock_level: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storage">Opslag</Label>
                  <Select
                    value={newProduct.storage_requirements}
                    onValueChange={(v) =>
                      setNewProduct({ ...newProduct, storage_requirements: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normaal</SelectItem>
                      <SelectItem value="cold">Gekoeld</SelectItem>
                      <SelectItem value="frozen">Diepvries</SelectItem>
                      <SelectItem value="hazmat">Gevaarlijke stoffen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}>
                Annuleren
              </Button>
              <Button
                onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
                disabled={createProduct.isPending || !newProduct.sku || !newProduct.name}
              >
                {createProduct.isPending ? "Bezig..." : editingProduct ? "Opslaan" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <WMSStatCard
          title="Totaal Producten"
          value={products?.length || 0}
          icon={<Package className="h-full w-full" />}
          variant="primary"
        />
        <WMSStatCard
          title="Actief"
          value={activeProducts.length}
          icon={<Package className="h-full w-full" />}
          variant="success"
        />
        <WMSStatCard
          title="Inactief"
          value={inactiveProducts.length}
          icon={<Package className="h-full w-full" />}
          variant="default"
        />
        <WMSStatCard
          title="Met Barcode"
          value={products?.filter(p => p.barcode).length || 0}
          icon={<Barcode className="h-full w-full" />}
          variant="gold"
        />
      </div>

      {/* Products Table */}
      <WMSGlassCard
        header={
          <WMSCardTitle subtitle={`${filteredProducts?.length || 0} producten gevonden`}>
            Producten
          </WMSCardTitle>
        }
        actions={
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, SKU, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        }
        noPadding
      >
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Geen producten gevonden</p>
              <p className="text-sm mb-4">Voeg een nieuw product toe om te beginnen</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuw Product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU / Barcode</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Afmetingen</TableHead>
                    <TableHead>Eenheid</TableHead>
                    <TableHead>Min. Voorraad</TableHead>
                    <TableHead>Opslag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts?.map((product, index) => (
                    <tr
                      key={product.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-mono text-xs">{product.sku}</p>
                          {product.barcode && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Barcode className="h-3 w-3" />
                              {product.barcode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell>
                        {product.length_cm && product.width_cm && product.height_cm ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Ruler className="h-3 w-3 text-muted-foreground" />
                            {product.length_cm}×{product.width_cm}×{product.height_cm} cm
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{product.unit_of_measure}</TableCell>
                      <TableCell>{product.min_stock_level}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {storageIcon(product.storage_requirements)}
                          <span className="text-xs capitalize">
                            {product.storage_requirements || "Normaal"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={product.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleActive(product)}
                        >
                          {product.is_active ? "Actief" : "Inactief"}
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
                            <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Bewerken
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                              {product.is_active ? "Deactiveren" : "Activeren"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteProductClick(product.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </WMSGlassCard>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Product verwijderen"
        description="Weet je zeker dat je dit WMS-product wilt deactiveren? Deze actie kan niet ongedaan worden gemaakt."
        onConfirm={handleDeleteProductConfirm}
        isLoading={deleting}
      />
    </DashboardLayout>
  );
}

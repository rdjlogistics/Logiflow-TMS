import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

type PricingModel = 'per_km' | 'per_ride' | 'per_stop' | 'per_hour' | 'per_wait_minute' | 'percentage' | 'fixed';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sales_pricing_model: PricingModel;
  sales_rate: number;
  purchase_pricing_model: PricingModel;
  purchase_rate: number;
  vat_percentage: number;
  is_active: boolean;
  sort_order: number;
  vehicle_type: string | null;
  min_price: number | null;
}

const pricingModels = [
  { value: 'per_km' as PricingModel, label: 'Per kilometer' },
  { value: 'per_ride' as PricingModel, label: 'Per rit' },
  { value: 'per_stop' as PricingModel, label: 'Per stop' },
  { value: 'per_hour' as PricingModel, label: 'Per uur' },
  { value: 'per_wait_minute' as PricingModel, label: 'Per wachtminuut' },
  { value: 'percentage' as PricingModel, label: 'Percentage' },
  { value: 'fixed' as PricingModel, label: 'Vast bedrag' },
];

const emptyProduct: Omit<Product, 'id'> = {
  name: '',
  description: null,
  sales_pricing_model: 'per_km',
  sales_rate: 0,
  purchase_pricing_model: 'per_km',
  purchase_rate: 0,
  vat_percentage: 21,
  is_active: true,
  sort_order: 0,
  vehicle_type: null,
  min_price: null,
};

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { canDelete } = usePermissions();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (error) {
      toast({ title: "Fout bij ophalen producten", variant: "destructive" });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(formData)
        .eq('id', editingProduct.id);
      
      if (error) {
        toast({ title: "Fout bij bijwerken product", variant: "destructive" });
      } else {
        toast({ title: "Product bijgewerkt" });
        fetchProducts();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([formData]);
      
      if (error) {
        toast({ title: "Fout bij aanmaken product", variant: "destructive" });
      } else {
        toast({ title: "Product aangemaakt" });
        fetchProducts();
        setDialogOpen(false);
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      sales_pricing_model: product.sales_pricing_model,
      sales_rate: product.sales_rate,
      purchase_pricing_model: product.purchase_pricing_model,
      purchase_rate: product.purchase_rate,
      vat_percentage: product.vat_percentage,
      is_active: product.is_active,
      sort_order: product.sort_order,
      vehicle_type: product.vehicle_type,
      min_price: product.min_price,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('products').delete().eq('id', productToDelete);
    if (error) {
      toast({ title: "Fout bij verwijderen product", variant: "destructive" });
    } else {
      toast({ title: "Product verwijderd" });
      fetchProducts();
    }
    setDeleting(false);
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setDialogOpen(true);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPricingModelLabel = (value: string) => {
    return pricingModels.find(m => m.value === value)?.label || value;
  };

  return (
    <DashboardLayout title="Producten & Tarieven" description="Beheer je producten en prijsberekeningen">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Nieuw product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Product bewerken' : 'Nieuw product'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Naam *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="bijv. Bus (L) - Sprinter Formaat"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Omschrijving</Label>
                    <Input
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optionele omschrijving"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-lg mb-3 text-primary">Verkoop tarieven</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="sales_pricing_model">Prijsmodel verkoop</Label>
                        <Select
                          value={formData.sales_pricing_model}
                          onValueChange={(value) => setFormData({ ...formData, sales_pricing_model: value as PricingModel })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pricingModels.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sales_rate">Verkooptarief (€)</Label>
                        <Input
                          id="sales_rate"
                          type="number"
                          step="0.01"
                          value={formData.sales_rate}
                          onChange={(e) => setFormData({ ...formData, sales_rate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="font-semibold text-lg mb-3 text-primary">Inkoop tarieven</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="purchase_pricing_model">Prijsmodel inkoop</Label>
                        <Select
                          value={formData.purchase_pricing_model}
                          onValueChange={(value) => setFormData({ ...formData, purchase_pricing_model: value as PricingModel })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pricingModels.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="purchase_rate">Inkooptarief (€)</Label>
                        <Input
                          id="purchase_rate"
                          type="number"
                          step="0.01"
                          value={formData.purchase_rate}
                          onChange={(e) => setFormData({ ...formData, purchase_rate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vat_percentage">BTW percentage (%)</Label>
                    <Input
                      id="vat_percentage"
                      type="number"
                      value={formData.vat_percentage}
                      onChange={(e) => setFormData({ ...formData, vat_percentage: parseFloat(e.target.value) || 21 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_price">Minimumprijs (€)</Label>
                    <Input
                      id="min_price"
                      type="number"
                      step="0.01"
                      value={formData.min_price || ''}
                      onChange={(e) => setFormData({ ...formData, min_price: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Optioneel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Voertuigtype</Label>
                    <Input
                      id="vehicle_type"
                      value={formData.vehicle_type || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      placeholder="bijv. Sprinter, Vito"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Sorteervolgorde</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Actief</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button type="submit">
                    {editingProduct ? 'Bijwerken' : 'Aanmaken'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek producten..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Producten ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Geen producten gevonden' : 'Nog geen producten. Maak je eerste product aan.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Verkoop model</TableHead>
                    <TableHead className="text-right">Verkoop tarief</TableHead>
                    <TableHead>Inkoop model</TableHead>
                    <TableHead className="text-right">Inkoop tarief</TableHead>
                    <TableHead className="text-right">BTW %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{getPricingModelLabel(product.sales_pricing_model)}</TableCell>
                      <TableCell className="text-right">€ {product.sales_rate.toFixed(2)}</TableCell>
                      <TableCell>{getPricingModelLabel(product.purchase_pricing_model)}</TableCell>
                      <TableCell className="text-right">€ {product.purchase_rate.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.vat_percentage}%</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {product.is_active ? 'Actief' : 'Inactief'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(product.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Product verwijderen"
          description="Weet je zeker dat je dit product wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
          onConfirm={handleDeleteConfirm}
          isLoading={deleting}
        />
      </div>
    </DashboardLayout>
  );
};

export default Products;

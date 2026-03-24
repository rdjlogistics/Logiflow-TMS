import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package } from "lucide-react";
import { useOrderGoods, OrderGoodsLine, GoodsLineInput } from "@/hooks/useOrderGoods";
import { DestinationData } from "@/components/orders/DestinationCard";

interface OrderGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
  destinations: DestinationData[];
}

const PACKAGING_TYPES = ['Colli', 'Pallet', 'Doos', 'Container', 'Stuk', 'Rol', 'Bundel'];

const OrderGoodsDialog = ({ open, onOpenChange, tripId, destinations }: OrderGoodsDialogProps) => {
  const { goods, loading, fetchGoods, addGoodsLine, updateGoodsLine, deleteGoodsLine } = useOrderGoods(tripId);

  useEffect(() => {
    if (open && tripId) {
      fetchGoods();
    }
  }, [open, tripId, fetchGoods]);

  const handleAddLine = async () => {
    await addGoodsLine({
      quantity: 1,
      packaging_type: 'Colli',
      line_number: goods.length + 1,
    });
  };

  const handleFieldChange = useCallback(async (id: string, field: keyof GoodsLineInput, value: any) => {
    // Auto-calculate derived fields
    const line = goods.find(g => g.id === id);
    if (!line) return;

    const updates: Partial<GoodsLineInput> = { [field]: value };

    // Auto-calculate total_weight
    if (field === 'quantity' || field === 'weight_per_unit') {
      const qty = field === 'quantity' ? Number(value) : line.quantity;
      const wpu = field === 'weight_per_unit' ? Number(value) : line.weight_per_unit;
      if (qty && wpu) updates.total_weight = Number((qty * wpu).toFixed(2));
    }

    // Auto-calculate volume
    if (field === 'length_cm' || field === 'width_cm' || field === 'height_cm') {
      const l = field === 'length_cm' ? Number(value) : (line.length_cm || 0);
      const w = field === 'width_cm' ? Number(value) : (line.width_cm || 0);
      const h = field === 'height_cm' ? Number(value) : (line.height_cm || 0);
      if (l && w && h) {
        const vol = (l * w * h) / 1000000;
        updates.volume_m3 = Number(vol.toFixed(3));
        updates.loading_meters = Number((vol / 2.4).toFixed(2)); // Standard trailer height ~2.4m
      }
    }

    await updateGoodsLine(id, updates);
  }, [goods, updateGoodsLine]);

  // Totals
  const totalWeight = goods.reduce((sum, g) => sum + (g.total_weight || 0), 0);
  const totalVolume = goods.reduce((sum, g) => sum + (g.volume_m3 || 0), 0);
  const totalLdm = goods.reduce((sum, g) => sum + (g.loading_meters || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="sheet"
        className="h-[min(88dvh,calc(100dvh-1rem))] sm:h-auto sm:max-h-[min(90dvh,calc(100dvh-3rem))] sm:max-w-[95vw] xl:sm:max-w-6xl flex flex-col"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Te vervoeren goederen
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Regel</TableHead>
                <TableHead className="w-16">Aantal</TableHead>
                <TableHead className="w-24">Verpakking</TableHead>
                <TableHead className="w-24">Gewicht/eenheid</TableHead>
                <TableHead className="w-24">Totaal gewicht</TableHead>
                <TableHead className="w-20">L (cm)</TableHead>
                <TableHead className="w-20">B (cm)</TableHead>
                <TableHead className="w-20">H (cm)</TableHead>
                <TableHead className="w-24">Volume m³</TableHead>
                <TableHead className="w-24">Laadmeter</TableHead>
                <TableHead className="min-w-[120px]">Omschrijving</TableHead>
                <TableHead className="w-36">Ophaalbestemming</TableHead>
                <TableHead className="w-36">Afleverbestemming</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goods.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {line.line_number}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => handleFieldChange(line.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-8 text-sm w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={line.packaging_type ?? ''} onValueChange={(v) => handleFieldChange(line.id, 'packaging_type', v)}>
                      <SelectTrigger className="h-8 text-sm w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGING_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.weight_per_unit ?? ''}
                      onChange={(e) => handleFieldChange(line.id, 'weight_per_unit', e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 text-sm w-24"
                      placeholder="kg"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{line.total_weight ? `${line.total_weight} kg` : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={line.length_cm ?? ''}
                      onChange={(e) => handleFieldChange(line.id, 'length_cm', e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 text-sm w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={line.width_cm ?? ''}
                      onChange={(e) => handleFieldChange(line.id, 'width_cm', e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 text-sm w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={line.height_cm ?? ''}
                      onChange={(e) => handleFieldChange(line.id, 'height_cm', e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 text-sm w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{line.volume_m3 ? `${line.volume_m3} m³` : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{line.loading_meters ? `${line.loading_meters} ldm` : '-'}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.description ?? ''}
                      onChange={(e) => handleFieldChange(line.id, 'description', e.target.value || null)}
                      className="h-8 text-sm"
                      placeholder="Omschrijving"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.pickup_stop_id || 'none'}
                      onValueChange={(v) => handleFieldChange(line.id, 'pickup_stop_id', v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-sm w-36">
                        <SelectValue placeholder="Kies..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        {destinations.filter(d => d.stop_type === 'pickup' || d.stop_type === 'both').map((d, i) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.company_name || d.city || `Stop ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.delivery_stop_id || 'none'}
                      onValueChange={(v) => handleFieldChange(line.id, 'delivery_stop_id', v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-sm w-36">
                        <SelectValue placeholder="Kies..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        {destinations.filter(d => d.stop_type === 'delivery' || d.stop_type === 'both').map((d, i) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.company_name || d.city || `Stop ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteGoodsLine(line.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {goods.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                    Nog geen goederen toegevoegd
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <Button onClick={handleAddLine} variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Regel toevoegen
          </Button>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-muted-foreground">
              Totaal gewicht: <strong className="text-foreground">{totalWeight.toFixed(2)} kg</strong>
            </span>
            <span className="text-muted-foreground">
              Totaal volume: <strong className="text-foreground">{totalVolume.toFixed(3)} m³</strong>
            </span>
            <span className="text-muted-foreground">
              Laadmeters: <strong className="text-foreground">{totalLdm.toFixed(2)} ldm</strong>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderGoodsDialog;

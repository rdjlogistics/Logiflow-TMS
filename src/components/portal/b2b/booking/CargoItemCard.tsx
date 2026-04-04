import { 
  Trash2, 
  Package, 
  Ruler, 
  Weight,
  AlertTriangle,
  Snowflake,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CargoItem, TEMPERATURE_OPTIONS } from './types';
import { cn } from '@/lib/utils';

interface CargoItemCardProps {
  item: CargoItem;
  index: number;
  onUpdate: (updates: Partial<CargoItem>) => void;
  onRemove: () => void;
}

export const CargoItemCard = ({ item, index, onUpdate, onRemove }: CargoItemCardProps) => {
  const volumeM3 = (item.length * item.width * item.height) / 1000000;
  const totalWeight = item.weight * item.quantity;
  const totalVolume = volumeM3 * item.quantity;

  return (
    <div
      className="p-3 sm:p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3 sm:space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-3 w-3 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Description & Quantity */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-[10px] text-muted-foreground">Omschrijving</Label>
          <Input
            placeholder="Bijv. pallets, dozen, apparatuur..."
            value={item.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            className="h-8 sm:h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Aantal</Label>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => {
              const raw = e.target.value;
              onUpdate({ quantity: raw === '' ? ('' as any) : parseInt(raw) || 0 });
            }}
            onBlur={() => {
              if (!item.quantity || item.quantity < 1) onUpdate({ quantity: 1 });
            }}
            className="h-8 sm:h-9 text-sm"
          />
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Ruler className="h-3 w-3" /> Afmetingen (cm)
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            placeholder="L"
            value={item.length || ''}
            onChange={(e) => onUpdate({ length: parseFloat(e.target.value) || 0 })}
            className="h-8 sm:h-9 text-sm text-center"
          />
          <Input
            type="number"
            placeholder="B"
            value={item.width || ''}
            onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 0 })}
            className="h-8 sm:h-9 text-sm text-center"
          />
          <Input
            type="number"
            placeholder="H"
            value={item.height || ''}
            onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 0 })}
            className="h-8 sm:h-9 text-sm text-center"
          />
        </div>
      </div>

      {/* Weight & Reference */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Weight className="h-3 w-3" /> Gewicht (kg)
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={item.weight || ''}
            onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 0 })}
            className="h-8 sm:h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Referentie</Label>
          <Input
            placeholder="SKU / Artikel nr."
            value={item.reference}
            onChange={(e) => onUpdate({ reference: e.target.value })}
            className="h-8 sm:h-9 text-sm"
          />
        </div>
      </div>

      {/* Properties */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/50">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={item.stackable}
            onCheckedChange={(checked) => onUpdate({ stackable: checked })}
            className="scale-75"
          />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Layers className="h-3 w-3" /> Stapelbaar
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={item.fragile}
            onCheckedChange={(checked) => onUpdate({ fragile: checked })}
            className="scale-75"
          />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Breekbaar
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={item.hazmat}
            onCheckedChange={(checked) => onUpdate({ hazmat: checked })}
            className="scale-75"
          />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            ☢️ ADR
          </span>
        </label>
      </div>

      {/* Temperature */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Snowflake className="h-3 w-3" /> Temperatuur
        </Label>
        <Select 
          value={item.temperature || 'ambient'} 
          onValueChange={(v) => onUpdate({ temperature: v as CargoItem['temperature'] })}
        >
          <SelectTrigger className="h-8 sm:h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPERATURE_OPTIONS.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.icon} {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calculated totals */}
      {(totalVolume > 0 || totalWeight > 0) && (
        <div className="flex gap-3 pt-2 border-t border-border/50">
          {totalVolume > 0 && (
            <div className="px-2 py-1 rounded bg-primary/10 text-xs font-medium text-primary">
              📦 {totalVolume.toFixed(2)} m³
            </div>
          )}
          {totalWeight > 0 && (
            <div className="px-2 py-1 rounded bg-gold/10 text-xs font-medium text-gold">
              ⚖️ {totalWeight.toFixed(0)} kg
            </div>
          )}
        </div>
      )}
    </div>
  );
};

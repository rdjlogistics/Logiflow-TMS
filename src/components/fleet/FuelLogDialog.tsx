import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Fuel, Loader2, Euro, Gauge } from 'lucide-react';

interface FuelLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehiclePlate: string;
  tripId?: string;
  tenantId?: string;
  onSuccess?: () => void;
}

export function FuelLogDialog({
  open,
  onOpenChange,
  vehicleId,
  vehiclePlate,
  tripId,
  tenantId,
  onSuccess,
}: FuelLogDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    liters: '',
    price_per_liter: '',
    mileage_at_fill: '',
    station_name: '',
    station_location: '',
    fuel_card_number: '',
    notes: '',
  });

  const totalCost = formData.liters && formData.price_per_liter
    ? (parseFloat(formData.liters) * parseFloat(formData.price_per_liter)).toFixed(2)
    : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.liters || parseFloat(formData.liters) <= 0) {
      toast({ title: 'Voer een geldige hoeveelheid liters in', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('fuel_logs').insert({
        vehicle_id: vehicleId,
        driver_id: user?.id || null,
        trip_id: tripId || null,
        tenant_id: tenantId || null,
        liters: parseFloat(formData.liters),
        price_per_liter: formData.price_per_liter ? parseFloat(formData.price_per_liter) : null,
        total_cost: formData.liters && formData.price_per_liter 
          ? parseFloat(formData.liters) * parseFloat(formData.price_per_liter) 
          : null,
        mileage_at_fill: formData.mileage_at_fill ? parseInt(formData.mileage_at_fill) : null,
        station_name: formData.station_name || null,
        station_location: formData.station_location || null,
        fuel_card_number: formData.fuel_card_number || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast({ title: 'Tankbeurt geregistreerd' });
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        liters: '',
        price_per_liter: '',
        mileage_at_fill: '',
        station_name: '',
        station_location: '',
        fuel_card_number: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error logging fuel:', error);
      toast({ title: 'Fout bij registreren tankbeurt', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            Tankbeurt registreren
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Voertuig: <span className="font-mono font-semibold">{vehiclePlate}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Liters */}
            <div className="space-y-2">
              <Label htmlFor="liters">Liters *</Label>
              <Input
                id="liters"
                type="number"
                step="0.01"
                placeholder="45.00"
                value={formData.liters}
                onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                required
              />
            </div>

            {/* Price per liter */}
            <div className="space-y-2">
              <Label htmlFor="price">Prijs/liter</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  placeholder="1.899"
                  value={formData.price_per_liter}
                  onChange={(e) => setFormData({ ...formData, price_per_liter: e.target.value })}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Total cost display */}
          {formData.liters && formData.price_per_liter && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">Totaal</span>
              <span className="text-lg font-bold text-primary">€{totalCost}</span>
            </div>
          )}

          {/* Mileage */}
          <div className="space-y-2">
            <Label htmlFor="mileage" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Kilometerstand
            </Label>
            <Input
              id="mileage"
              type="number"
              placeholder="125000"
              value={formData.mileage_at_fill}
              onChange={(e) => setFormData({ ...formData, mileage_at_fill: e.target.value })}
            />
          </div>

          {/* Station */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="station">Tankstation</Label>
              <Input
                id="station"
                placeholder="Shell, BP..."
                value={formData.station_name}
                onChange={(e) => setFormData({ ...formData, station_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Locatie</Label>
              <Input
                id="location"
                placeholder="Amsterdam"
                value={formData.station_location}
                onChange={(e) => setFormData({ ...formData, station_location: e.target.value })}
              />
            </div>
          </div>

          {/* Fuel card */}
          <div className="space-y-2">
            <Label htmlFor="fuelcard">Tankpas nummer</Label>
            <Input
              id="fuelcard"
              placeholder="**** **** **** 1234"
              value={formData.fuel_card_number}
              onChange={(e) => setFormData({ ...formData, fuel_card_number: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notities</Label>
            <Textarea
              id="notes"
              placeholder="Eventuele opmerkingen..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Fuel className="mr-2 h-4 w-4" />
              )}
              Opslaan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
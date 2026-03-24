import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gauge, Loader2 } from 'lucide-react';
import { useUpdateVehicle } from '@/hooks/useFleetManagement';
import { useToast } from '@/hooks/use-toast';

interface FleetBulkMileageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onComplete: () => void;
}

export function FleetBulkMileageDialog({
  open,
  onOpenChange,
  selectedIds,
  onComplete,
}: FleetBulkMileageDialogProps) {
  const [mileage, setMileage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateVehicle = useUpdateVehicle();
  const { toast } = useToast();

  const handleSubmit = async () => {
    const km = parseInt(mileage, 10);
    if (isNaN(km) || km < 0) {
      toast({ title: 'Voer een geldige kilometerstand in', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          new Promise<void>((resolve, reject) => {
            updateVehicle.mutate(
              { id, mileage_km: km },
              { onSuccess: () => resolve(), onError: reject },
            );
          })
        )
      );
      toast({ title: `KM-stand bijgewerkt voor ${selectedIds.length} voertuig(en)` });
      setMileage('');
      onComplete();
      onOpenChange(false);
    } catch {
      toast({ title: 'Fout bij bijwerken KM-stand', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            KM-stand bijwerken
          </DialogTitle>
          <DialogDescription>
            Stel de kilometerstand in voor {selectedIds.length} geselecteerde voertuig{selectedIds.length !== 1 ? 'en' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="bulk-mileage">Nieuwe KM-stand</Label>
          <Input
            id="bulk-mileage"
            type="number"
            min={0}
            placeholder="bijv. 125000"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            icon={Gauge}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !mileage}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Bijwerken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { format, addYears } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { MaintenanceRecord } from "@/hooks/useFleetManagement";

interface AddMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  onAdd: (record: Omit<MaintenanceRecord, "id" | "created_at" | "updated_at">) => void;
}

const MAINTENANCE_TYPES = [
  "Grote beurt",
  "Kleine beurt",
  "Olie verversen",
  "Banden",
  "Remmen",
  "Distributieriem",
  "Airco",
  "APK",
  "Schade reparatie",
  "Overig",
];

export function AddMaintenanceDialog({ open, onOpenChange, vehicleId, onAdd }: AddMaintenanceDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    maintenance_type: "",
    description: "",
    performed_at: format(new Date(), "yyyy-MM-dd"),
    performed_by: "",
    cost: "",
    mileage_at_service: "",
    next_maintenance_date: "",
    next_maintenance_km: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maintenance_type) return;

    setSaving(true);
    try {
      onAdd({
        vehicle_id: vehicleId,
        maintenance_type: formData.maintenance_type,
        description: formData.description || null,
        performed_at: formData.performed_at,
        performed_by: formData.performed_by || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        mileage_at_service: formData.mileage_at_service ? parseInt(formData.mileage_at_service) : null,
        next_maintenance_date: formData.next_maintenance_date || null,
        next_maintenance_km: formData.next_maintenance_km ? parseInt(formData.next_maintenance_km) : null,
        notes: formData.notes || null,
        documents: null,
      });
      onOpenChange(false);
      setFormData({
        maintenance_type: "",
        description: "",
        performed_at: format(new Date(), "yyyy-MM-dd"),
        performed_by: "",
        cost: "",
        mileage_at_service: "",
        next_maintenance_date: "",
        next_maintenance_km: "",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Onderhoud Toevoegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Type onderhoud *</Label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(v) => setFormData({ ...formData, maintenance_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer type" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Datum uitgevoerd *</Label>
              <Input
                type="date"
                value={formData.performed_at}
                onChange={(e) => setFormData({ ...formData, performed_at: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Kilometerstand</Label>
              <Input
                type="number"
                placeholder="123456"
                value={formData.mileage_at_service}
                onChange={(e) => setFormData({ ...formData, mileage_at_service: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Kosten (€)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Uitgevoerd door</Label>
              <Input
                placeholder="Garage naam"
                value={formData.performed_by}
                onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Omschrijving</Label>
              <Input
                placeholder="Korte omschrijving"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Volgend onderhoud datum</Label>
              <Input
                type="date"
                value={formData.next_maintenance_date}
                onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Volgend onderhoud km</Label>
              <Input
                type="number"
                placeholder="150000"
                value={formData.next_maintenance_km}
                onChange={(e) => setFormData({ ...formData, next_maintenance_km: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Notities</Label>
              <Textarea
                placeholder="Extra opmerkingen..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={saving || !formData.maintenance_type}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opslaan...
                </>
              ) : (
                "Opslaan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

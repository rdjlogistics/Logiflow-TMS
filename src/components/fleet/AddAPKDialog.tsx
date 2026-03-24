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
import { APKRecord } from "@/hooks/useFleetManagement";

interface AddAPKDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  onAdd: (record: Omit<APKRecord, "id" | "created_at">) => void;
}

export function AddAPKDialog({ open, onOpenChange, vehicleId, onAdd }: AddAPKDialogProps) {
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const nextYear = format(addYears(new Date(), 1), "yyyy-MM-dd");
  
  const [formData, setFormData] = useState({
    apk_date: today,
    expiry_date: nextYear,
    result: "approved" as "approved" | "rejected" | "conditional",
    inspector: "",
    station_name: "",
    mileage_at_apk: "",
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.apk_date || !formData.expiry_date) return;

    setSaving(true);
    try {
      onAdd({
        vehicle_id: vehicleId,
        apk_date: formData.apk_date,
        expiry_date: formData.expiry_date,
        result: formData.result,
        inspector: formData.inspector || null,
        station_name: formData.station_name || null,
        mileage_at_apk: formData.mileage_at_apk ? parseInt(formData.mileage_at_apk) : null,
        remarks: formData.remarks || null,
        defects: null,
      });
      onOpenChange(false);
      setFormData({
        apk_date: today,
        expiry_date: nextYear,
        result: "approved",
        inspector: "",
        station_name: "",
        mileage_at_apk: "",
        remarks: "",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>APK Registratie Toevoegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Keuring datum *</Label>
              <Input
                type="date"
                value={formData.apk_date}
                onChange={(e) => setFormData({ ...formData, apk_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Geldig tot *</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Resultaat *</Label>
              <Select
                value={formData.result}
                onValueChange={(v: "approved" | "rejected" | "conditional") => 
                  setFormData({ ...formData, result: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Goedgekeurd</SelectItem>
                  <SelectItem value="conditional">Voorwaardelijk goedgekeurd</SelectItem>
                  <SelectItem value="rejected">Afgekeurd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kilometerstand</Label>
              <Input
                type="number"
                placeholder="123456"
                value={formData.mileage_at_apk}
                onChange={(e) => setFormData({ ...formData, mileage_at_apk: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Keurstation</Label>
              <Input
                placeholder="Naam keurstation"
                value={formData.station_name}
                onChange={(e) => setFormData({ ...formData, station_name: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Keurmeester</Label>
              <Input
                placeholder="Naam keurmeester"
                value={formData.inspector}
                onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Opmerkingen / Gebreken</Label>
              <Textarea
                placeholder="Eventuele gebreken of aandachtspunten..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={saving}>
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

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Phone, Bell, Truck } from "lucide-react";

interface DeliveryOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: {
    safe_drop_allowed: boolean;
    neighbor_allowed: boolean;
    access_code: string;
    call_before_arrival: boolean;
    instructions: string;
  };
  onSave: (options: {
    safe_drop_allowed: boolean;
    neighbor_allowed: boolean;
    access_code: string;
    call_before_arrival: boolean;
    instructions: string;
  }) => Promise<void>;
}

export const DeliveryOptionsDialog = ({
  open,
  onOpenChange,
  options,
  onSave,
}: DeliveryOptionsDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(options);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Afleveropties
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Safe drop */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium">Safe drop</Label>
                <p className="text-xs text-muted-foreground">
                  Mag zonder handtekening worden afgeleverd
                </p>
              </div>
            </div>
            <Switch
              checked={formData.safe_drop_allowed}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, safe_drop_allowed: checked }))
              }
            />
          </div>

          {/* Neighbor allowed */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.neighbor_allowed}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, neighbor_allowed: checked === true }))
                }
              />
              <div>
                <Label className="font-medium">Buren toegestaan</Label>
                <p className="text-xs text-muted-foreground">
                  Mag bij buren worden afgeleverd
                </p>
              </div>
            </div>
          </div>

          {/* Call before arrival */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium">Bel voor aankomst</Label>
                <p className="text-xs text-muted-foreground">
                  Chauffeur belt voor aflevering
                </p>
              </div>
            </div>
            <Switch
              checked={formData.call_before_arrival}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, call_before_arrival: checked }))
              }
            />
          </div>

          {/* Access code */}
          <div className="space-y-2">
            <Label htmlFor="access_code">Toegangscode / Poortcode</Label>
            <Input
              id="access_code"
              value={formData.access_code}
              onChange={(e) => setFormData(prev => ({ ...prev, access_code: e.target.value }))}
              placeholder="bijv. #1234"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Extra instructies</Label>
            <Input
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="bijv. Achterdeur, loods links"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving} className="btn-premium">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

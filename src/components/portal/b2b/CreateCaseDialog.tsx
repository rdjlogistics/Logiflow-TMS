import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalCases } from "@/hooks/usePortalCases";
import { Shipment } from "@/components/portal/shared/types";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipments: Shipment[];
  onSuccess?: () => void;
}

export function CreateCaseDialog({ open, onOpenChange, shipments, onSuccess }: CreateCaseDialogProps) {
  const { createCase, loading } = usePortalCases();
  const [formData, setFormData] = useState({
    shipmentId: '',
    type: 'damage' as 'damage' | 'delay' | 'shortage' | 'other',
    description: '',
    claimedAmount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.shipmentId || !formData.description) {
      toast.error("Vul alle verplichte velden in");
      return;
    }

    const result = await createCase({
      shipmentId: formData.shipmentId,
      type: formData.type,
      description: formData.description,
      claimedAmount: formData.claimedAmount ? parseFloat(formData.claimedAmount) : undefined,
    });

    if (result.error) {
      toast.error(`Fout: ${result.error}`);
    } else {
      toast.success("Case succesvol aangemaakt");
      setFormData({ shipmentId: '', type: 'damage', description: '', claimedAmount: '' });
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nieuwe Case Aanmaken</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shipment">Zending *</Label>
            <Select
              value={formData.shipmentId}
              onValueChange={(v) => setFormData(prev => ({ ...prev, shipmentId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een zending" />
              </SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.referenceNumber} - {s.fromCity} → {s.toCity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type probleem *</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="damage">Schade</SelectItem>
                <SelectItem value="delay">Vertraging</SelectItem>
                <SelectItem value="shortage">Tekort / Verloren</SelectItem>
                <SelectItem value="other">Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving *</Label>
            <Textarea
              id="description"
              placeholder="Beschrijf het probleem..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Schadebedrag (optioneel)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.claimedAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, claimedAmount: e.target.value }))}
                className="pl-8"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading} className="bg-gold hover:bg-gold/90 text-gold-foreground">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Case Indienen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

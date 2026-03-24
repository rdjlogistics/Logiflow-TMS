import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin } from "lucide-react";
import { CustomerLocation, CreateLocationInput } from "@/hooks/useCustomerLocations";
import { usePostcodeLookup } from "@/hooks/usePostcodeLookup";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: CustomerLocation;
  onSave: (data: CreateLocationInput) => Promise<CustomerLocation | null>;
  onUpdate?: (id: string, data: Partial<CreateLocationInput>) => Promise<boolean>;
  tenantId: string;
  customerId: string;
}

export const LocationFormDialog = ({
  open,
  onOpenChange,
  location,
  onSave,
  onUpdate,
  tenantId,
  customerId,
}: LocationFormDialogProps) => {
  const [saving, setSaving] = useState(false);
  const { lookupPostcode, loading: lookupLoading } = usePostcodeLookup();
  
  const [formData, setFormData] = useState({
    label: location?.label || "",
    company_name: location?.company_name || "",
    contact_name: location?.contact_name || "",
    contact_phone: location?.contact_phone || "",
    contact_email: location?.contact_email || "",
    postcode: location?.postcode || "",
    house_number: location?.house_number || "",
    address_line: location?.address_line || "",
    city: location?.city || "",
    country: location?.country || "NL",
    access_notes: location?.access_notes || "",
    default_instructions: location?.default_instructions || "",
    is_favorite: location?.is_favorite || false,
  });

  const handlePostcodeLookup = async () => {
    if (!formData.postcode || !formData.house_number) return;
    
    const result = await lookupPostcode(formData.postcode, formData.house_number);
    if (result) {
      setFormData(prev => ({
        ...prev,
        address_line: result.street || "",
        city: result.city || "",
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.label || !formData.postcode || !formData.city) return;

    setSaving(true);
    try {
      const data: CreateLocationInput = {
        tenant_id: tenantId,
        customer_id: customerId,
        label: formData.label,
        company_name: formData.company_name || undefined,
        contact_name: formData.contact_name || undefined,
        contact_phone: formData.contact_phone || undefined,
        contact_email: formData.contact_email || undefined,
        postcode: formData.postcode,
        house_number: formData.house_number || undefined,
        address_line: formData.address_line,
        city: formData.city,
        country: formData.country,
        access_notes: formData.access_notes || undefined,
        default_instructions: formData.default_instructions || undefined,
        is_favorite: formData.is_favorite,
      };

      if (location && onUpdate) {
        await onUpdate(location.id, data);
      } else {
        await onSave(data);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {location ? "Locatie bewerken" : "Nieuwe locatie"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Naam / Label *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              placeholder="bijv. DC Tilburg, Hoofdkantoor"
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Bedrijfsnaam</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            />
          </div>

          {/* Postcode + Huisnummer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value.toUpperCase() }))}
                placeholder="1234 AB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="house_number">Huisnummer</Label>
              <div className="flex gap-2">
                <Input
                  id="house_number"
                  value={formData.house_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, house_number: e.target.value }))}
                  placeholder="123"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handlePostcodeLookup}
                  disabled={lookupLoading || !formData.postcode}
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Straat + Stad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="address_line">Straat *</Label>
              <Input
                id="address_line"
                value={formData.address_line}
                onChange={(e) => setFormData(prev => ({ ...prev, address_line: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Plaats *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contactpersoon</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Telefoonnummer</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Access notes */}
          <div className="space-y-2">
            <Label htmlFor="access_notes">Toegangsnotities</Label>
            <Textarea
              id="access_notes"
              value={formData.access_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, access_notes: e.target.value }))}
              placeholder="Poortcode, laadplaats, parkeren..."
              rows={2}
            />
          </div>

          {/* Default instructions */}
          <div className="space-y-2">
            <Label htmlFor="default_instructions">Standaard instructies</Label>
            <Textarea
              id="default_instructions"
              value={formData.default_instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, default_instructions: e.target.value }))}
              placeholder="Standaard aflevering instructies..."
              rows={2}
            />
          </div>

          {/* Favorite */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
            <div>
              <Label>Favoriet</Label>
              <p className="text-xs text-muted-foreground">Toon bovenaan in locatielijst</p>
            </div>
            <Switch
              checked={formData.is_favorite}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_favorite: checked }))}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !formData.label || !formData.postcode || !formData.city}
            className="btn-premium"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {location ? "Opslaan" : "Toevoegen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

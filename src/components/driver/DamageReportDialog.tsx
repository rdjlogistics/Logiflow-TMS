import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Camera, 
  MapPin, 
  Loader2,
  Car,
  Package,
  Building2,
  User,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DamageReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId?: string;
  vehicleId?: string;
  tenantId?: string;
}

const damageTypes = [
  { value: 'cargo', label: 'Lading', icon: Package, color: 'text-amber-500' },
  { value: 'vehicle', label: 'Voertuig', icon: Car, color: 'text-blue-500' },
  { value: 'property', label: 'Eigendom derden', icon: Building2, color: 'text-purple-500' },
  { value: 'injury', label: 'Letsel', icon: User, color: 'text-red-500' },
];

const severityLevels = [
  { value: 'minor', label: 'Licht', description: 'Kleine schade, geen belemmeringen' },
  { value: 'moderate', label: 'Matig', description: 'Reparatie nodig, doorrijden mogelijk' },
  { value: 'major', label: 'Ernstig', description: 'Grote schade, hulp nodig' },
];

export function DamageReportDialog({
  open,
  onOpenChange,
  tripId,
  vehicleId,
  tenantId,
}: DamageReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(tenantId || null);

  // Auto-resolve tenant_id from user's company if not provided as prop
  useEffect(() => {
    if (tenantId) {
      setResolvedTenantId(tenantId);
      return;
    }
    if (!user) return;

    const fetchTenant = async () => {
      const { data } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();
      if (data?.company_id) {
        setResolvedTenantId(data.company_id);
      }
    };
    fetchTenant();
  }, [user, tenantId]);

  const [formData, setFormData] = useState({
    damage_type: 'cargo',
    severity: 'minor',
    description: '',
    location_address: '',
    third_party_involved: false,
    third_party_details: '',
    police_report_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resolvedTenantId) {
      toast({ title: 'Bedrijf kon niet worden bepaald', description: 'Probeer het later opnieuw.', variant: 'destructive' });
      return;
    }

    if (!formData.description.trim()) {
      toast({ title: 'Beschrijving is verplicht', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('damage_reports').insert({
        driver_id: user?.id ?? '',
        trip_id: tripId || null,
        vehicle_id: vehicleId || null,
        tenant_id: resolvedTenantId,
        damage_type: formData.damage_type,
        severity: formData.severity,
        description: formData.description,
        location_address: formData.location_address || null,
        third_party_involved: formData.third_party_involved,
        third_party_details: formData.third_party_details || null,
        police_report_number: formData.police_report_number || null,
      });

      if (error) throw error;

      toast({ title: 'Schademelding verstuurd' });
      onOpenChange(false);
      
      // Reset form
      setFormData({
        damage_type: 'cargo',
        severity: 'minor',
        description: '',
        location_address: '',
        third_party_involved: false,
        third_party_details: '',
        police_report_number: '',
      });
    } catch (error) {
      console.error('Error submitting damage report:', error);
      toast({ title: 'Fout bij versturen melding', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Schademelding
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Damage Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Type schade</Label>
            <div className="grid grid-cols-2 gap-3">
              {damageTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, damage_type: type.value })}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    formData.damage_type === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <type.icon className={cn("h-5 w-5", type.color)} />
                  <span className="font-medium text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Ernst</Label>
            <RadioGroup
              value={formData.severity}
              onValueChange={(value) => setFormData({ ...formData, severity: value })}
              className="space-y-2"
            >
              {severityLevels.map((level) => (
                <label
                  key={level.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                    formData.severity === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={level.value} />
                  <div>
                    <p className="font-medium text-sm">{level.label}</p>
                    <p className="text-xs text-muted-foreground">{level.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving *</Label>
            <Textarea
              id="description"
              placeholder="Beschrijf wat er is gebeurd..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locatie
            </Label>
            <Input
              id="location"
              placeholder="Adres of omschrijving locatie"
              value={formData.location_address}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
            />
          </div>

          {/* Third Party */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.third_party_involved}
                onChange={(e) => setFormData({ ...formData, third_party_involved: e.target.checked })}
                className="w-5 h-5 rounded border-border"
              />
              <span className="text-sm font-medium">Derde partij betrokken</span>
            </label>

            {formData.third_party_involved && (
              <div
                className="space-y-3 pl-8"
              >
                <Input
                  placeholder="Gegevens derde partij"
                  value={formData.third_party_details}
                  onChange={(e) => setFormData({ ...formData, third_party_details: e.target.value })}
                />
                <Input
                  placeholder="Politie proces-verbaal nummer (optioneel)"
                  value={formData.police_report_number}
                  onChange={(e) => setFormData({ ...formData, police_report_number: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Photo hint */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Foto's kunnen later worden toegevoegd via het schadedossier.
            </p>
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
            <Button type="submit" className="flex-1" disabled={saving || !resolvedTenantId}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Versturen...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Melding versturen
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
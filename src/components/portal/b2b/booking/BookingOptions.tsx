import { useState } from 'react';
import { 
  Zap, 
  Clock, 
  Truck, 
  Shield, 
  Camera, 
  PenTool, 
  Bell,
  FileText,
  Building2,
  Bookmark,
  AlertTriangle,
  Repeat,
  CheckCircle2,
  Loader2,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookingFormData, SERVICE_LEVELS, PRIORITY_OPTIONS } from './types';
import type { PortalOrderTemplate } from '@/hooks/usePortalOrderTemplates';

interface BookingOptionsProps {
  formData: BookingFormData;
  onUpdate: (updates: Partial<BookingFormData>) => void;
  onSaveAsRecurring?: (name: string) => Promise<boolean>;
  existingTemplates?: PortalOrderTemplate[];
  templatesLoading?: boolean;
}

export const BookingOptions = ({ formData, onUpdate, onSaveAsRecurring, existingTemplates = [], templatesLoading }: BookingOptionsProps) => {
  const [recurringName, setRecurringName] = useState('');
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringSaved, setRecurringSaved] = useState(false);

  const handleSaveRecurring = async () => {
    if (!onSaveAsRecurring || !recurringName.trim()) return;
    setRecurringSaving(true);
    const success = await onSaveAsRecurring(recurringName.trim());
    setRecurringSaving(false);
    if (success) {
      setRecurringSaved(true);
      setTimeout(() => setRecurringSaved(false), 3000);
    }
  };
  return (
    <div className="space-y-6">
      {/* Service Level */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/50 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Service Niveau
          </h3>
        </div>
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {SERVICE_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => onUpdate({ serviceLevel: level.id })}
                className={cn(
                  "p-3 sm:p-4 rounded-xl border text-left transition-all touch-manipulation",
                  formData.serviceLevel === level.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 hover:border-border hover:bg-muted/30"
                )}
              >
                <div className="text-sm font-medium">{level.label}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{level.description}</div>
                {level.id === 'dedicated' && (
                  <div className="mt-2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gold/10 text-gold inline-block">
                    Premium
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/50 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Prioriteit
          </h3>
        </div>
        <div className="p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3">
            {PRIORITY_OPTIONS.map((priority) => (
              <button
                key={priority.id}
                onClick={() => onUpdate({ priority: priority.id })}
                className={cn(
                  "flex-1 p-3 rounded-xl border text-center transition-all touch-manipulation",
                  formData.priority === priority.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 hover:border-border hover:bg-muted/30"
                )}
              >
                <span className={cn("text-sm font-medium", priority.color)}>{priority.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Delivery Options */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/50 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Bezorgopties
          </h3>
        </div>
        <div className="p-3 sm:p-4 space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <PenTool className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Handtekening vereist</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Ontvanger moet tekenen voor ontvangst</p>
              </div>
            </div>
            <Switch
              checked={formData.requiresSignature}
              onCheckedChange={(checked) => onUpdate({ requiresSignature: checked })}
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Foto bewijs</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Chauffeur maakt foto bij aflevering</p>
              </div>
            </div>
            <Switch
              checked={formData.requiresPhoto}
              onCheckedChange={(checked) => onUpdate({ requiresPhoto: checked })}
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tracking notificaties</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Real-time updates via email/SMS</p>
              </div>
            </div>
            <Switch
              checked={formData.trackingNotifications}
              onCheckedChange={(checked) => onUpdate({ trackingNotifications: checked })}
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Verzekering</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Extra dekking voor waardevolle goederen</p>
              </div>
            </div>
            <Switch
              checked={formData.insurance}
              onCheckedChange={(checked) => onUpdate({ insurance: checked })}
            />
          </label>

          {formData.insurance && (
            <div
              className="pl-11"
            >
              <Label className="text-xs text-muted-foreground">Verzekerde waarde (€)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.insuranceValue || ''}
                onChange={(e) => onUpdate({ insuranceValue: parseFloat(e.target.value) || undefined })}
                className="h-9 mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* References */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/50 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Referenties
          </h3>
        </div>
        <div className="p-3 sm:p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Uw referentie</Label>
              <Input
                placeholder="REF-12345"
                value={formData.customerReference}
                onChange={(e) => onUpdate({ customerReference: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PO Nummer</Label>
              <Input
                placeholder="PO-12345"
                value={formData.poNumber}
                onChange={(e) => onUpdate({ poNumber: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kostenplaats</Label>
              <Input
                placeholder="Afdeling / Project"
                value={formData.costCenter}
                onChange={(e) => onUpdate({ costCenter: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Projectcode</Label>
              <Input
                placeholder="PRJ-001"
                value={formData.projectCode}
                onChange={(e) => onUpdate({ projectCode: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border/50 bg-muted/30">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Notities
          </h3>
        </div>
        <div className="p-3 sm:p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Algemene instructies</Label>
            <Textarea
              placeholder="Speciale instructies voor deze zending..."
              value={formData.generalNotes}
              onChange={(e) => onUpdate({ generalNotes: e.target.value })}
              className="min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Interne notities (alleen zichtbaar voor u)</Label>
            <Textarea
              placeholder="Interne opmerkingen..."
              value={formData.internalNotes}
              onChange={(e) => onUpdate({ internalNotes: e.target.value })}
              className="min-h-[60px] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Save as Template */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-3 sm:p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Bookmark className="h-4 w-4 text-gold" />
              <div>
                <p className="text-sm font-medium">Opslaan als template</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Hergebruik deze boeking in de toekomst</p>
              </div>
            </div>
            <Switch
              checked={formData.saveAsTemplate}
              onCheckedChange={(checked) => onUpdate({ saveAsTemplate: checked })}
            />
          </label>

          {formData.saveAsTemplate && (
            <div
              className="mt-3 pt-3 border-t border-border/50"
            >
              <Label className="text-xs">Template naam</Label>
              <Input
                placeholder="Bijv. Wekelijkse levering Amsterdam"
                value={formData.templateName}
                onChange={(e) => onUpdate({ templateName: e.target.value })}
                className="h-9 mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save as Recurring Order */}
      {onSaveAsRecurring && (
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-3 mb-3">
              <Repeat className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Opslaan als herhaalorder</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Sla deze route op en plan hem later herhalend in</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Naam herhaalorder, bijv. Daglevering Utrecht"
                value={recurringName}
                onChange={(e) => setRecurringName(e.target.value)}
                className="h-9 flex-1"
                disabled={recurringSaving || recurringSaved}
              />
              <Button
                size="sm"
                onClick={handleSaveRecurring}
                disabled={!recurringName.trim() || recurringSaving || recurringSaved}
                className="h-9 touch-manipulation active:scale-[0.97]"
              >
                {recurringSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : recurringSaved ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  'Opslaan'
                )}
              </Button>
            </div>
            {recurringSaved && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Herhaalorder opgeslagen — beheer in Herhaalorders
              </p>
            )}
          </div>
        </div>
      )}

      {/* Existing Recurring Orders */}
      {existingTemplates.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Uw herhaalorders ({existingTemplates.length})
              </h3>
              <a
                href="/portal/b2b/recurring"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Beheren <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="p-3 sm:p-4 space-y-2 max-h-[240px] overflow-y-auto">
            {existingTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{tpl.name}</p>
                  <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {tpl.pickup_city && tpl.delivery_city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tpl.pickup_city} → {tpl.delivery_city}
                      </span>
                    )}
                    {tpl.recurrence_type && tpl.recurrence_type !== 'once' && (
                      <span className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {tpl.recurrence_type}
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                  tpl.is_active
                    ? "bg-green-500/10 text-green-600"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tpl.is_active ? 'Actief' : 'Inactief'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

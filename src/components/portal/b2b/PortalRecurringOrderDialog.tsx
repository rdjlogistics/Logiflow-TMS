import { useState } from 'react';
import { Repeat, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePortalOrderTemplates } from '@/hooks/usePortalOrderTemplates';

interface PortalRecurringOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  tenantId: string;
  onCreated: () => void;
}

const RECURRENCE_OPTIONS = [
  { id: 'once', label: 'Eenmalig' },
  { id: 'daily', label: 'Dagelijks' },
  { id: 'weekly', label: 'Wekelijks' },
  { id: 'monthly', label: 'Maandelijks' },
];

const DAY_OPTIONS = [
  { id: 1, label: 'Ma' },
  { id: 2, label: 'Di' },
  { id: 3, label: 'Wo' },
  { id: 4, label: 'Do' },
  { id: 5, label: 'Vr' },
  { id: 6, label: 'Za' },
  { id: 0, label: 'Zo' },
];

export const PortalRecurringOrderDialog = ({
  open,
  onOpenChange,
  customerId,
  tenantId,
  onCreated,
}: PortalRecurringOrderDialogProps) => {
  const { createTemplate } = usePortalOrderTemplates(customerId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    recurrence_type: 'weekly',
    recurrence_days: [1, 3, 5] as number[],
    recurrence_day_of_month: 1,
    next_run_date: '',
    pickup_city: '',
    pickup_address: '',
    pickup_postal_code: '',
    delivery_city: '',
    delivery_address: '',
    delivery_postal_code: '',
    cargo_description: '',
    weight_kg: '',
  });

  const toggleDay = (day: number) => {
    setForm(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day].sort(),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !customerId || !tenantId) return;
    setSaving(true);
    try {
      await createTemplate({
        name: form.name,
        customer_id: customerId,
        company_id: tenantId,
        recurrence_type: form.recurrence_type,
        recurrence_days: form.recurrence_type === 'weekly' ? form.recurrence_days : undefined,
        recurrence_day_of_month: form.recurrence_type === 'monthly' ? form.recurrence_day_of_month : undefined,
        next_run_date: form.next_run_date || undefined,
        pickup_city: form.pickup_city || undefined,
        pickup_address: form.pickup_address || undefined,
        pickup_postal_code: form.pickup_postal_code || undefined,
        delivery_city: form.delivery_city || undefined,
        delivery_address: form.delivery_address || undefined,
        delivery_postal_code: form.delivery_postal_code || undefined,
        cargo_description: form.cargo_description || undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        is_active: true,
      });
      onCreated();
      onOpenChange(false);
      // Reset
      setForm({
        name: '', recurrence_type: 'weekly', recurrence_days: [1, 3, 5],
        recurrence_day_of_month: 1, next_run_date: '', pickup_city: '', pickup_address: '',
        pickup_postal_code: '', delivery_city: '', delivery_address: '',
        delivery_postal_code: '', cargo_description: '', weight_kg: '',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/30 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Repeat className="h-5 w-5 text-primary" />
            Nieuwe Herhaalorder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Naam *</Label>
            <Input placeholder="Bijv. Wekelijkse levering Amsterdam" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-base" />
          </div>

          {/* Recurrence Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Herhaling</Label>
            <div className="grid grid-cols-4 gap-2">
              {RECURRENCE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setForm(p => ({ ...p, recurrence_type: opt.id }))}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation active:scale-[0.97]",
                    form.recurrence_type === opt.id
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly day selector */}
          {form.recurrence_type === 'weekly' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Dagen</Label>
              <div className="flex gap-1.5">
                {DAY_OPTIONS.map(day => (
                  <button
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={cn(
                      "w-9 h-9 rounded-lg text-xs font-medium transition-all touch-manipulation active:scale-[0.95]",
                      form.recurrence_days.includes(day.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly day */}
          {form.recurrence_type === 'monthly' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Dag van de maand</Label>
              <Input type="number" min={1} max={28} value={form.recurrence_day_of_month} onChange={e => setForm(p => ({ ...p, recurrence_day_of_month: parseInt(e.target.value) || 1 }))} className="h-9 w-24 text-base" />
            </div>
          )}

          {/* Next run date */}
          <div className="space-y-1.5">
            <Label className="text-xs">Startdatum</Label>
            <Input type="date" value={form.next_run_date} onChange={e => setForm(p => ({ ...p, next_run_date: e.target.value }))} className="h-9 text-base" />
          </div>

          {/* Route */}
          <div className="rounded-xl border border-border/50 p-3 space-y-3 bg-muted/20">
            <Label className="text-xs font-semibold">Route</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Ophaal stad</Label>
                <Input placeholder="Amsterdam" value={form.pickup_city} onChange={e => setForm(p => ({ ...p, pickup_city: e.target.value }))} className="h-8 text-xs text-base" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">Aflever stad</Label>
                <Input placeholder="Rotterdam" value={form.delivery_city} onChange={e => setForm(p => ({ ...p, delivery_city: e.target.value }))} className="h-8 text-xs text-base" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Ophaal postcode" value={form.pickup_postal_code} onChange={e => setForm(p => ({ ...p, pickup_postal_code: e.target.value }))} className="h-8 text-xs text-base" />
              <Input placeholder="Aflever postcode" value={form.delivery_postal_code} onChange={e => setForm(p => ({ ...p, delivery_postal_code: e.target.value }))} className="h-8 text-xs text-base" />
            </div>
          </div>

          {/* Cargo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Lading omschrijving</Label>
              <Input placeholder="Pallets, dozen..." value={form.cargo_description} onChange={e => setForm(p => ({ ...p, cargo_description: e.target.value }))} className="h-9 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gewicht (kg)</Label>
              <Input type="number" placeholder="500" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} className="h-9 text-base" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={saving || !form.name} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Repeat className="h-4 w-4 mr-2" />}
            Herhaalorder Aanmaken
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

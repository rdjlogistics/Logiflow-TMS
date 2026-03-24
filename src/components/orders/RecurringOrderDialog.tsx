import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Repeat, Truck, Package, Save, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface RecurringOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: {
    id: string;
    name: string;
    description?: string | null;
    recurrence_type?: string | null;
    recurrence_days?: number[] | null;
    recurrence_day_of_month?: number | null;
    next_run_date?: string | null;
    pickup_address?: string | null;
    pickup_city?: string | null;
    delivery_address?: string | null;
    delivery_city?: string | null;
    cargo_description?: string | null;
    customer_id?: string | null;
    sales_total?: number | null;
    purchase_total?: number | null;
  } | null;
  sourceOrder?: {
    pickup_address?: string;
    pickup_city?: string;
    delivery_address?: string;
    delivery_city?: string;
    cargo_description?: string;
    customer_id?: string;
    sales_total?: number;
    purchase_total?: number;
  };
}

const WEEKDAYS = [
  { value: 1, label: 'Maandag' },
  { value: 2, label: 'Dinsdag' },
  { value: 3, label: 'Woensdag' },
  { value: 4, label: 'Donderdag' },
  { value: 5, label: 'Vrijdag' },
  { value: 6, label: 'Zaterdag' },
  { value: 7, label: 'Zondag' },
];

const defaultForm = (source?: RecurringOrderDialogProps['sourceOrder']) => ({
  name: '',
  description: '',
  recurrence_type: 'weekly',
  recurrence_days: [1, 3, 5] as number[],
  recurrence_day_of_month: 1,
  next_run_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  pickup_address: source?.pickup_address || '',
  pickup_city: source?.pickup_city || '',
  delivery_address: source?.delivery_address || '',
  delivery_city: source?.delivery_city || '',
  cargo_description: source?.cargo_description || '',
  customer_id: source?.customer_id || '',
  sales_total: source?.sales_total || 0,
  purchase_total: source?.purchase_total || 0,
});

export const RecurringOrderDialog: React.FC<RecurringOrderDialogProps> = ({
  open, onOpenChange, template, sourceOrder,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompany();
  const isEdit = !!template?.id;

  const [formData, setFormData] = useState(defaultForm(sourceOrder));

  // Pre-fill form when template changes (edit mode)
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        recurrence_type: template.recurrence_type || 'weekly',
        recurrence_days: template.recurrence_days || [1, 3, 5],
        recurrence_day_of_month: template.recurrence_day_of_month || 1,
        next_run_date: template.next_run_date || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        pickup_address: template.pickup_address || '',
        pickup_city: template.pickup_city || '',
        delivery_address: template.delivery_address || '',
        delivery_city: template.delivery_city || '',
        cargo_description: template.cargo_description || '',
        customer_id: template.customer_id || '',
        sales_total: template.sales_total || 0,
        purchase_total: template.purchase_total || 0,
      });
    } else {
      setFormData(defaultForm(sourceOrder));
    }
  }, [template, sourceOrder, open]);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-dropdown'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, company_name')
        .eq('is_active', true)
        .order('company_name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Geen bedrijf gevonden');

      const payload = {
        name: formData.name,
        description: formData.description,
        recurrence_type: formData.recurrence_type,
        recurrence_days: formData.recurrence_type === 'weekly' ? formData.recurrence_days : null,
        recurrence_day_of_month: formData.recurrence_type === 'monthly' ? formData.recurrence_day_of_month : null,
        next_run_date: formData.next_run_date,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city,
        delivery_address: formData.delivery_address,
        delivery_city: formData.delivery_city,
        cargo_description: formData.cargo_description,
        customer_id: formData.customer_id || null,
        sales_total: formData.sales_total,
        purchase_total: formData.purchase_total,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('order_templates')
          .update(payload)
          .eq('id', template!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('order_templates')
          .insert({
            ...payload,
            is_active: true,
            company_id: company.id,
            created_by: user?.id || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: isEdit ? 'Template bijgewerkt' : 'Herhaalorder aangemaakt' });
      queryClient.invalidateQueries({ queryKey: ['order-templates'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error saving recurring order:', error);
      toast({ title: 'Fout bij opslaan', description: error?.message || 'Onbekende fout', variant: 'destructive' });
    },
  });

  const handleWeekdayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day].sort(),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            {isEdit ? 'Template Bewerken' : 'Herhaalorder Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Naam *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="bijv. Dagelijkse route Amsterdam"
                />
              </div>
              <div className="space-y-2">
                <Label>Klant</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={v => setFormData({ ...formData, customer_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer klant" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Beschrijving</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionele beschrijving..."
                rows={2}
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Planning</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Herhaling</Label>
                <Select
                  value={formData.recurrence_type}
                  onValueChange={v => setFormData({ ...formData, recurrence_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Dagelijks</SelectItem>
                    <SelectItem value="weekly">Wekelijks</SelectItem>
                    <SelectItem value="monthly">Maandelijks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Eerste datum</Label>
                <Input
                  type="date"
                  value={formData.next_run_date}
                  onChange={e => setFormData({ ...formData, next_run_date: e.target.value })}
                />
              </div>
            </div>
            {formData.recurrence_type === 'weekly' && (
              <div className="space-y-2">
                <Label>Dagen</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => (
                    <Button
                      key={day.value} type="button" size="sm"
                      variant={formData.recurrence_days.includes(day.value) ? 'default' : 'outline'}
                      onClick={() => handleWeekdayToggle(day.value)}
                    >
                      {day.label.slice(0, 2)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {formData.recurrence_type === 'monthly' && (
              <div className="space-y-2">
                <Label>Dag van de maand</Label>
                <Select
                  value={String(formData.recurrence_day_of_month)}
                  onValueChange={v => setFormData({ ...formData, recurrence_day_of_month: Number(v) })}
                >
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Route */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Route</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ophaaladres</Label>
                <Input value={formData.pickup_address} onChange={e => setFormData({ ...formData, pickup_address: e.target.value })} placeholder="Straat en huisnummer" />
              </div>
              <div className="space-y-2">
                <Label>Ophaalplaats</Label>
                <Input value={formData.pickup_city} onChange={e => setFormData({ ...formData, pickup_city: e.target.value })} placeholder="Stad" />
              </div>
              <div className="space-y-2">
                <Label>Afleveradres</Label>
                <Input value={formData.delivery_address} onChange={e => setFormData({ ...formData, delivery_address: e.target.value })} placeholder="Straat en huisnummer" />
              </div>
              <div className="space-y-2">
                <Label>Afleverplaats</Label>
                <Input value={formData.delivery_city} onChange={e => setFormData({ ...formData, delivery_city: e.target.value })} placeholder="Stad" />
              </div>
            </div>
          </div>

          {/* Cargo & Pricing */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-xl border">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <Label className="text-base font-semibold">Lading & Prijs</Label>
            </div>
            <div className="space-y-2">
              <Label>Lading beschrijving</Label>
              <Textarea value={formData.cargo_description} onChange={e => setFormData({ ...formData, cargo_description: e.target.value })} placeholder="Beschrijving van de lading..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Verkoopprijs (€)</Label>
                <Input type="number" step="0.01" value={formData.sales_total} onChange={e => setFormData({ ...formData, sales_total: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Inkoopprijs (€)</Label>
                <Input type="number" step="0.01" value={formData.purchase_total} onChange={e => setFormData({ ...formData, purchase_total: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEdit ? 'Opslaan' : 'Template Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecurringOrderDialog;

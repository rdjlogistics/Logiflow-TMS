import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';

interface QuickEditPopoverProps {
  tripId: string;
  field: 'status' | 'pickup_city' | 'delivery_city' | 'sales_total' | 'purchase_total';
  currentValue: string | number | null;
  onUpdate: () => void;
  children?: React.ReactNode;
}

const statusOptions = [
  { value: 'offerte', label: 'Offerte' },
  { value: 'aanvraag', label: 'Aanvraag' },
  { value: 'draft', label: 'Concept' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'geladen', label: 'Geladen' },
  { value: 'onderweg', label: 'Onderweg' },
  { value: 'afgeleverd', label: 'Afgeleverd' },
  { value: 'afgerond', label: 'Afgemeld' },
  { value: 'gecontroleerd', label: 'Gecontroleerd' },
  { value: 'gefactureerd', label: 'Gefactureerd' },
  { value: 'geannuleerd', label: 'Geannuleerd' },
];

export function QuickEditPopover({
  tripId,
  field,
  currentValue,
  onUpdate,
  children,
}: QuickEditPopoverProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentValue || ''));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      let updateValue: string | number | null = value;
      
      if (field === 'sales_total' || field === 'purchase_total') {
        updateValue = value ? parseFloat(value) : null;
      }

      // For price fields, recalculate margin
      if (field === 'sales_total' || field === 'purchase_total') {
        // Fetch current trip to get the other price
        const { data: trip } = await supabase
          .from('trips')
          .select('sales_total, purchase_total')
          .eq('id', tripId)
          .single();

        const newSales = field === 'sales_total' ? (updateValue as number ?? 0) : (trip?.sales_total ?? 0);
        const newPurchase = field === 'purchase_total' ? (updateValue as number ?? 0) : (trip?.purchase_total ?? 0);
        const grossProfit = newSales - newPurchase;
        const marginPct = newSales > 0 ? (grossProfit / newSales) * 100 : 0;

        const { error } = await supabase
          .from('trips')
          .update({
            [field]: updateValue,
            gross_profit: grossProfit,
            profit_margin_pct: Math.round(marginPct * 100) / 100,
          })
          .eq('id', tripId);

        if (error) throw error;
      } else if (field === 'status') {
        // Build metadata payload based on target status
        const statusPayload: Record<string, any> = { status: updateValue };
        const newStatus = updateValue as string;
        const now = new Date().toISOString();

        if (newStatus === 'onderweg') {
          statusPayload.actual_departure = now;
        }
        if (['afgeleverd', 'afgerond'].includes(newStatus)) {
          statusPayload.actual_arrival = now;
        }
        if (newStatus === 'afgerond') {
          statusPayload.checkout_completed_at = now;
          const userId = (await supabase.auth.getUser()).data.user?.id;
          if (userId) statusPayload.checkout_completed_by = userId;
        }

        const { error } = await supabase
          .from('trips')
          .update(statusPayload)
          .eq('id', tripId);

        if (error) throw error;

        // Fetch trip for customer notification context
        const { data: tripData } = await supabase
          .from('trips')
          .select('customer_id, order_number')
          .eq('id', tripId)
          .single();

        // B2B notification (non-blocking)
        notifyCustomerStatusChange(tripData?.customer_id, tripId, newStatus, tripData?.order_number);

        // Auto-send vrachtbrief for terminal statuses (non-blocking, respects tenant setting)
        if (['afgerond', 'afgeleverd'].includes(newStatus)) {
          const { data: tSettings } = await supabase.from('tenant_settings').select('auto_send_pod_email').limit(1).maybeSingle();
          if (tSettings?.auto_send_pod_email) {
            supabase.functions.invoke('auto-send-vrachtbrief', { body: { tripId } }).catch((e) => console.warn('Vrachtbrief verzenden mislukt:', e));
          }
        }

        // Send delivery confirmation for afgeleverd (non-blocking)
        if (newStatus === 'afgeleverd') {
          supabase.functions.invoke('send-delivery-confirmation', { body: { tripId } }).catch((e) => console.warn('Leverbevestiging verzenden mislukt:', e));
        }
      } else {
        const { error } = await supabase
          .from('trips')
          .update({ [field]: updateValue })
          .eq('id', tripId);

        if (error) throw error;
      }

      // Log status change as order_event (non-blocking, consistent with bulk actions)
      if (field === 'status') {
        try {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          await supabase.from('order_events').insert({
            order_id: tripId,
            event_type: 'STATUS_UPDATED',
            payload: { old_value: String(currentValue || ''), new_value: updateValue, source: 'quick_edit' },
            actor_user_id: userId,
          });
        } catch {
          // Silent - event logging should not block the update
        }
      }

      toast({ title: 'Opgeslagen' });
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Quick edit error:', error);
      toast({ title: 'Fout bij opslaan', description: (error as any)?.message || 'Onbekende fout', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const renderInput = () => {
    if (field === 'status') {
      return (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field === 'sales_total' || field === 'purchase_total') {
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
          <Input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-7 h-9"
            autoFocus
          />
        </div>
      );
    }

    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-9"
        autoFocus
      />
    );
  };

  const fieldLabels: Record<string, string> = {
    status: 'Status',
    pickup_city: 'Ophaallocatie',
    delivery_city: 'Afleverlocatie',
    sales_total: 'Verkoopprijs',
    purchase_total: 'Inkoopprijs',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">
            {fieldLabels[field]}
          </Label>
          
          {renderInput()}
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8"
              onClick={() => setOpen(false)}
            >
              <X className="h-3 w-3 mr-1" />
              Annuleren
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Opslaan
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
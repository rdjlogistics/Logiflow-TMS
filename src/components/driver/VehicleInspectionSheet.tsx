import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  useVehicleInspection, 
  DEFAULT_INSPECTION_ITEMS, 
  type InspectionItem 
} from '@/hooks/useVehicleInspection';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  ClipboardCheck,
  Check,
  X,
  Minus,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleInspectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  tripId?: string;
  onCompleted?: (passed: boolean) => void;
}

type ItemStatus = 'ok' | 'nok' | 'na';

const statusConfig: Record<ItemStatus, { icon: typeof Check; label: string; color: string; bg: string }> = {
  ok: { icon: Check, label: 'OK', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  nok: { icon: X, label: 'NOK', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' },
  na: { icon: Minus, label: 'N.v.t.', color: 'text-muted-foreground', bg: 'bg-muted/50 border-border/50' },
};

export function VehicleInspectionSheet({
  open,
  onOpenChange,
  vehicleId,
  tripId,
  onCompleted,
}: VehicleInspectionSheetProps) {
  const { submitInspection } = useVehicleInspection();
  const [items, setItems] = useState<InspectionItem[]>(
    DEFAULT_INSPECTION_ITEMS.map(i => ({ ...i }))
  );
  const [notes, setNotes] = useState('');
  const [itemNotes, setItemNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const updateItemStatus = useCallback((index: number, status: ItemStatus) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, status } : item
    ));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);

    // Merge item notes
    const finalItems = items.map((item, i) => ({
      ...item,
      notes: itemNotes[i] || undefined,
    }));

    const hasCriticalFailure = finalItems.some(i => i.critical && i.status === 'nok');

    const success = await submitInspection({
      vehicleId,
      tripId,
      items: finalItems,
      notes: notes || undefined,
    });

    setSubmitting(false);

    if (success) {
      if (hasCriticalFailure) {
        toast({
          title: '⚠️ Kritiek defect gemeld',
          description: 'De planner is op de hoogte gesteld. Rit kan niet starten.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '✅ Inspectie voltooid',
          description: 'Voertuig is goedgekeurd. Je kunt de rit starten.',
        });
      }
      onCompleted?.(!hasCriticalFailure);
      onOpenChange(false);
    } else {
      toast({
        title: 'Fout',
        description: 'Inspectie kon niet worden opgeslagen.',
        variant: 'destructive',
      });
    }
  };

  const failedCriticalCount = items.filter(i => i.critical && i.status === 'nok').length;
  const allChecked = items.every(i => i.status !== 'ok' || true); // All have a deliberate status

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Voertuiginspectie
          </SheetTitle>
          <SheetDescription>
            Controleer alle items voor vertrek
          </SheetDescription>
        </SheetHeader>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium text-sm">{item.name}</span>
                  {item.critical && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-500">
                      Kritiek
                    </Badge>
                  )}
                </div>

                {/* Status toggles */}
                <div className="flex gap-1.5">
                  {(['ok', 'nok', 'na'] as ItemStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const isActive = item.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateItemStatus(index, status)}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all",
                          isActive ? config.bg : "border-transparent bg-muted/30 text-muted-foreground"
                        )}
                      >
                        <config.icon className={cn("h-3.5 w-3.5", isActive && config.color)} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes for NOK items */}
              {item.status === 'nok' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pl-2"
                >
                  <Textarea
                    placeholder="Beschrijf het defect..."
                    value={itemNotes[index] || ''}
                    onChange={(e) => setItemNotes(prev => ({ ...prev, [index]: e.target.value }))}
                    className="min-h-[60px] text-sm"
                  />
                </motion.div>
              )}
            </motion.div>
          ))}

          {/* Overall notes */}
          <div className="pt-4 border-t border-border/50">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Algemene opmerkingen (optioneel)
            </label>
            <Textarea
              placeholder="Overige opmerkingen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t border-border/50 space-y-3">
          {failedCriticalCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-500 font-medium">
                {failedCriticalCount} kritiek item afgekeurd — rit kan niet starten
              </p>
            </div>
          )}

          <Button
            className="w-full h-12"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-5 w-5 mr-2" />
            )}
            Inspectie indienen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

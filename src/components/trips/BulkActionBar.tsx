import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X, CheckCircle2, UserRound, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TripStatus = "offerte" | "aanvraag" | "draft" | "gepland" | "geladen" | "onderweg" | "afgeleverd" | "afgerond" | "gecontroleerd" | "gefactureerd" | "geannuleerd";

const ALL_STATUSES: { value: TripStatus; label: string }[] = [
  { value: 'offerte', label: 'Offerte' },
  { value: 'aanvraag', label: 'Aanvraag' },
  { value: 'draft', label: 'Draft' },
  { value: 'gepland', label: 'Gepland' },
  { value: 'geladen', label: 'Geladen' },
  { value: 'onderweg', label: 'Onderweg' },
  { value: 'afgeleverd', label: 'Afgeleverd' },
  { value: 'afgerond', label: 'Afgerond' },
  { value: 'gecontroleerd', label: 'Gecontroleerd' },
  { value: 'gefactureerd', label: 'Gefactureerd' },
  { value: 'geannuleerd', label: 'Geannuleerd' },
];

interface Driver {
  id: string;
  name: string;
}

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onComplete: () => void;
}

export function BulkActionBar({ selectedIds, onClear, onComplete }: BulkActionBarProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from('drivers')
      .select('id, name')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => setDrivers(data ?? []));
  }, []);

  const handleStatusChange = async (status: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status } as any)
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: `${selectedIds.size} rit(ten) gewijzigd naar ${status}` });
      onClear();
      onComplete();
    } catch {
      toast({ title: 'Bulk status update mislukt', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDriverAssign = async (driverId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ driver_id: driverId })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      const driver = drivers.find(d => d.id === driverId);
      toast({ title: `${selectedIds.size} rit(ten) toegewezen aan ${driver?.name ?? 'chauffeur'}` });
      onClear();
      onComplete();
    } catch {
      toast({ title: 'Bulk chauffeur toewijzing mislukt', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const count = selectedIds.size;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-2xl"
        >
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl px-5 py-3.5">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {count} geselecteerd
            </span>

            <div className="flex-1" />

            <Select onValueChange={handleStatusChange} disabled={loading}>
              <SelectTrigger className="w-[160px] h-9">
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status wijzigen" />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={handleDriverAssign} disabled={loading || drivers.length === 0}>
              <SelectTrigger className="w-[180px] h-9">
                <UserRound className="h-4 w-4 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Chauffeur toewijzen" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={onClear} disabled={loading} className="h-9 w-9">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Coffee, 
  Play, 
  Square, 
  Clock,
  Moon,
  PauseCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreakTimerCardProps {
  tripId?: string;
  tenantId?: string;
}

type BreakType = 'pauze' | 'rust' | 'wachttijd';

interface ActiveBreak {
  id: string;
  break_start: string;
  break_type: BreakType;
}

const breakTypes: { value: BreakType; label: string; icon: typeof Coffee; color: string }[] = [
  { value: 'pauze', label: 'Pauze', icon: Coffee, color: 'text-amber-500' },
  { value: 'rust', label: 'Rust', icon: Moon, color: 'text-blue-500' },
  { value: 'wachttijd', label: 'Wachttijd', icon: PauseCircle, color: 'text-purple-500' },
];

export function BreakTimerCard({ tripId, tenantId }: BreakTimerCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<BreakType>('pauze');

  // Check for active break on mount
  useEffect(() => {
    const checkActiveBreak = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('driver_breaks')
        .select('id, break_start, break_type')
        .eq('driver_id', user.id)
        .is('break_end', null)
        .order('break_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveBreak({
          id: data.id,
          break_start: data.break_start,
          break_type: data.break_type as BreakType,
        });
      }
    };

    checkActiveBreak();
  }, [user?.id]);

  // Timer effect
  useEffect(() => {
    if (!activeBreak) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(activeBreak.break_start).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [activeBreak]);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const startBreak = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_breaks')
        .insert({
          driver_id: user.id,
          trip_id: tripId || null,
          tenant_id: tenantId || null,
          break_type: selectedType,
          break_start: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveBreak({
        id: data.id,
        break_start: data.break_start,
        break_type: data.break_type as BreakType,
      });

      const typeLabel = breakTypes.find(t => t.value === selectedType)?.label;
      toast({ title: `${typeLabel} gestart` });
    } catch (error) {
      console.error('Error starting break:', error);
      toast({ title: 'Fout bij starten pauze', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const endBreak = async () => {
    if (!activeBreak) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('driver_breaks')
        .update({ break_end: new Date().toISOString() })
        .eq('id', activeBreak.id);

      if (error) throw error;

      const mins = Math.floor(elapsedSeconds / 60);
      toast({ title: `Pauze beëindigd (${mins} min)` });
      setActiveBreak(null);
    } catch (error) {
      console.error('Error ending break:', error);
      toast({ title: 'Fout bij stoppen pauze', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const activeType = breakTypes.find(t => t.value === activeBreak?.break_type);

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardContent className="p-4">
          {activeBreak ? (
            <div
              key="active"
              className="space-y-4"
            >
              {/* Active break display */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      activeType?.value === 'pauze' && "bg-amber-500/10",
                      activeType?.value === 'rust' && "bg-blue-500/10",
                      activeType?.value === 'wachttijd' && "bg-purple-500/10"
                    )}
                  >
                    {activeType && <activeType.icon className={cn("h-6 w-6", activeType.color)} />}
                  </div>
                  <div>
                    <p className="font-semibold">{activeType?.label} actief</p>
                    <p className="text-sm text-muted-foreground">Sinds {new Date(activeBreak.break_start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                  {formatTime(elapsedSeconds)}
                </Badge>
              </div>

              {/* Timer progress */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    activeType?.value === 'pauze' && "bg-amber-500",
                    activeType?.value === 'rust' && "bg-blue-500",
                    activeType?.value === 'wachttijd' && "bg-purple-500"
                  )}}
                />
              </div>

              {/* Stop button */}
              <div>
                <Button
                  variant="destructive"
                  className="w-full h-12"
                  onClick={endBreak}
                  disabled={loading}
                >
                  <Square className="mr-2 h-5 w-5" />
                  Stop {activeType?.label?.toLowerCase()}
                </Button>
              </div>
            </div>
          ) : (
            <div
              key="idle"
              className="space-y-4"
            >
              {/* Break type selection */}
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Pauze registreren</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {breakTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      selectedType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <type.icon className={cn("h-5 w-5", type.color)} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Start button */}
              <div>
                <Button
                  className="w-full h-12"
                  onClick={startBreak}
                  disabled={loading}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start {breakTypes.find(t => t.value === selectedType)?.label?.toLowerCase()}
                </Button>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
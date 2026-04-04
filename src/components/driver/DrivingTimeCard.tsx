import { memo } from 'react';
import { useDrivingTime } from '@/hooks/useDrivingTime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  Play, 
  Square, 
  Coffee, 
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_CONTINUOUS = 270; // 4h30

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}u ${m.toString().padStart(2, '0')}m` : `${m}m`;
}

export const DrivingTimeCard = memo(function DrivingTimeCard() {
  const {
    activeLog,
    dailyDrivingMinutes,
    weeklyDrivingMinutes,
    continuousDrivingMinutes,
    dailyBreakMinutes,
    warnings,
    loading,
    startDriving,
    stopDriving,
    startBreak,
    stopBreak,
  } = useDrivingTime();

  if (loading) return null;

  const isDriving = activeLog?.log_type === 'driving';
  const isOnBreak = activeLog?.log_type === 'break';
  const remaining = MAX_CONTINUOUS - continuousDrivingMinutes;
  const progress = Math.min(continuousDrivingMinutes / MAX_CONTINUOUS, 1);

  // Color based on continuous driving
  const progressColor = continuousDrivingMinutes < 240
    ? 'from-emerald-500 to-emerald-400'
    : continuousDrivingMinutes < 255
      ? 'from-amber-500 to-orange-400'
      : 'from-red-500 to-red-400';

  const criticalWarning = warnings.find(w => w.severity === 'critical');

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isDriving ? "bg-emerald-500/10" : isOnBreak ? "bg-amber-500/10" : "bg-muted/50"
              )}
              animate={isDriving ? { scale: [1, 1.05, 1] } : {}}
            >
              {isDriving ? (
                <Timer className="h-5 w-5 text-emerald-500" />
              ) : isOnBreak ? (
                <Coffee className="h-5 w-5 text-amber-500" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {isDriving ? 'Rijden' : isOnBreak ? 'Pauze actief' : 'Rij- & rusttijden'}
              </p>
              <p className="text-xs text-muted-foreground">EU 561/2006</p>
            </div>
          </div>
          {isDriving && (
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono",
                remaining <= 15 ? "border-red-500/50 text-red-500" : 
                remaining <= 30 ? "border-amber-500/50 text-amber-500" : 
                "border-emerald-500/50 text-emerald-500"
              )}
            >
              -{formatMinutes(Math.max(0, remaining))}
            </Badge>
          )}
        </div>

        {/* Critical warning */}
          {criticalWarning && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs font-medium text-red-500">{criticalWarning.message}</p>
            </div>
          )}
        {/* Progress bar - continuous driving */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Continu rijden</span>
            <span>{formatMinutes(continuousDrivingMinutes)} / 4u30</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r", progressColor)}
              animate={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-xl bg-white/5 border border-border/30">
            <p className="text-sm font-bold text-foreground">{formatMinutes(dailyDrivingMinutes)}</p>
            <p className="text-[10px] text-muted-foreground">Vandaag</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/5 border border-border/30">
            <p className="text-sm font-bold text-foreground">{formatMinutes(weeklyDrivingMinutes)}</p>
            <p className="text-[10px] text-muted-foreground">Deze week</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/5 border border-border/30">
            <p className="text-sm font-bold text-foreground">{formatMinutes(dailyBreakMinutes)}</p>
            <p className="text-[10px] text-muted-foreground">Pauze</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isDriving ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 h-10"
                onClick={stopDriving}
              >
                <Square className="h-4 w-4 mr-1.5" />
                Stop rijden
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10"
                onClick={startBreak}
              >
                <Coffee className="h-4 w-4 mr-1.5" />
                Pauze
              </Button>
            </>
          ) : isOnBreak ? (
            <Button
              size="sm"
              className="flex-1 h-10"
              onClick={stopBreak}
            >
              <Play className="h-4 w-4 mr-1.5" />
              Hervat rijden
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 h-10"
              onClick={() => startDriving()}
            >
              <Play className="h-4 w-4 mr-1.5" />
              Start rijden
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

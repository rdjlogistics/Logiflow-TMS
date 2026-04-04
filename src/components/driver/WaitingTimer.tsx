import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  Play, 
  StopCircle, 
  Euro,
  AlertTriangle
} from 'lucide-react';
import { useWaitingTimer } from '@/hooks/useWaitingTimer';
import { cn } from '@/lib/utils';

interface WaitingTimerProps {
  stopId: string;
  stopName: string;
  tripId?: string;
  onComplete?: (minutes: number, surcharge: number) => void;
}

export const WaitingTimer = ({ stopId, stopName, tripId, onComplete }: WaitingTimerProps) => {
  const {
    isRunning,
    elapsedMinutes,
    billableMinutes,
    currentAmount,
    config,
    isWithinGrace,
    gracePeriodRemaining,
    startTimer,
    stopTimer,
    formatElapsedTime,
  } = useWaitingTimer(stopId, tripId);

  const handleStop = () => {
    stopTimer();
    if (onComplete) {
      onComplete(billableMinutes, currentAmount);
    }
  };

  const progressPercent = Math.min((elapsedMinutes / 60) * 100, 100);

  return (
    <div>
      <Card className={cn(
        "overflow-hidden border-2 transition-colors",
        isRunning ? (isWithinGrace ? "border-warning/50 bg-warning/5" : "border-destructive/50 bg-destructive/5") : "border-border/40"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl", isRunning ? (isWithinGrace ? "bg-warning/20" : "bg-destructive/20") : "bg-muted")}>
                <Timer className={cn("h-5 w-5", isRunning ? (isWithinGrace ? "text-warning" : "text-destructive") : "text-muted-foreground")} />
              </div>
              <div>
                <p className="font-semibold">Wachttijd</p>
                <p className="text-xs text-muted-foreground">{stopName}</p>
              </div>
            </div>
              {isRunning && (
                <div>
                  <Badge variant={isWithinGrace ? "warning" : "destructive"} className="gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                    </span>
                    {isWithinGrace ? 'Gratis periode' : 'Factureerbaar'}
                  </Badge>
                </div>
              )}
          </div>

          <div className="relative bg-muted/50 rounded-2xl p-6 mb-4">
            <div className="text-center">
              <p 
                className={cn("text-5xl font-mono font-bold tracking-tight", isRunning && !isWithinGrace && "text-destructive")}}
              >
                {formatElapsedTime()}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {isWithinGrace ? `Nog ${gracePeriodRemaining} min gratis` : `${billableMinutes} min factureerbaar`}
              </p>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full", isWithinGrace ? "bg-warning" : "bg-destructive")}} />
            </div>
          </div>
            {billableMinutes > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">Toeslag</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-500">€{currentAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          <div className="flex gap-2">
            {!isRunning ? (
              <Button variant="premium" className="flex-1 h-12" onClick={startTimer}>
                <Play className="h-5 w-5 mr-2" />
                Start timer
              </Button>
            ) : (
              <Button variant="destructive" className="flex-1 h-12" onClick={handleStop}>
                <StopCircle className="h-5 w-5 mr-2" />
                Stop
              </Button>
            )}
          </div>

          {isRunning && !isWithinGrace && (
            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Wachttijd wordt doorberekend aan klant</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

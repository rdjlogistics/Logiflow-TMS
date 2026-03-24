import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Clock,
  Play,
  Square,
  CheckCircle,
  Timer,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStopEvents } from '@/hooks/useStopEvents';

interface WaitingTimeControlsProps {
  stopId: string;
  tripId: string;
  stopStatus: string;
  waitingStartedAt: string | null;
  waitingEndedAt: string | null;
  waitingMinutes: number;
  actualArrival: string | null;
  onEventRecorded?: () => void;
  onStartCheckout?: () => void;
}

export const WaitingTimeControls = ({
  stopId,
  tripId,
  stopStatus,
  waitingStartedAt,
  waitingEndedAt,
  waitingMinutes,
  actualArrival,
  onEventRecorded,
  onStartCheckout,
}: WaitingTimeControlsProps) => {
  const { markArrival, startWaiting, stopWaiting } = useStopEvents();
  const [loading, setLoading] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);

  // Determine current state
  const hasArrived = !!actualArrival;
  const isWaiting = !!waitingStartedAt && !waitingEndedAt;
  const waitingCompleted = !!waitingStartedAt && !!waitingEndedAt;
  const isCompleted = stopStatus === 'completed';

  // Get current position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition(pos),
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Timer logic - count elapsed waiting time
  useEffect(() => {
    if (!isWaiting || !waitingStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(waitingStartedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isWaiting, waitingStartedAt]);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleArrival = async () => {
    setLoading('arrival');
    try {
      await markArrival(stopId, tripId, position || undefined);
      onEventRecorded?.();
    } finally {
      setLoading(null);
    }
  };

  const handleStartWaiting = async () => {
    setLoading('start');
    try {
      await startWaiting(stopId, tripId, position || undefined);
      onEventRecorded?.();
    } finally {
      setLoading(null);
    }
  };

  const handleStopWaiting = async () => {
    setLoading('stop');
    try {
      await stopWaiting(stopId, tripId, position || undefined);
      onEventRecorded?.();
    } finally {
      setLoading(null);
    }
  };

  // Don't show if stop is completed
  if (isCompleted) {
    return waitingMinutes > 0 ? (
      <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Wachttijd geregistreerd
            </span>
          </div>
          <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
            {waitingMinutes} min
          </span>
        </div>
      </div>
    ) : null;
  }

  // Compact view after waiting is completed - show summary + CTA to proceed
  if (waitingCompleted) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Wachttijd geregistreerd
              </span>
            </div>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {waitingMinutes} min
            </span>
          </div>
        </div>
        {onStartCheckout && (
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            onClick={onStartCheckout}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Ga door naar afmelden
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Timer className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold">Wachttijd</span>
          </div>
          
          {isWaiting && (
            <Badge 
              variant="destructive" 
              className="animate-pulse bg-red-500 text-white font-mono text-lg px-3 py-1"
            >
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(elapsedSeconds)}
            </Badge>
          )}
          
          {waitingCompleted && (
            <Badge variant="secondary" className="font-medium">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              {waitingMinutes} min
            </Badge>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-sm">
          {!hasArrived && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              Nog niet aangekomen
            </div>
          )}
          {hasArrived && !isWaiting && !waitingCompleted && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Aangekomen om {new Date(actualArrival!).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {isWaiting && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Wachttijd loopt sinds {new Date(waitingStartedAt!).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {waitingCompleted && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Wachttijd afgerond
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2">
          {/* Step 1: Arrival */}
          {!hasArrived && (
            <>
              <Button
                size="lg"
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                onClick={handleArrival}
                disabled={!!loading}
              >
                {loading === 'arrival' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <MapPin className="w-5 h-5 mr-2" />
                )}
                Ik ben aangekomen
              </Button>
              {onStartCheckout && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={onStartCheckout}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Direct afmelden zonder wachttijd
                </Button>
              )}
            </>
          )}

          {/* Step 2: Start Waiting or Skip */}
          {hasArrived && !isWaiting && !waitingCompleted && (
            <>
              <Button
                size="lg"
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                onClick={handleStartWaiting}
                disabled={!!loading}
              >
                {loading === 'start' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 mr-2" />
                )}
                Start wachttijd
              </Button>
              {onStartCheckout && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={onStartCheckout}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Geen wachttijd, ga door naar afmelden
                </Button>
              )}
            </>
          )}

          {/* Step 3: Stop Waiting */}
          {isWaiting && (
            <Button
              size="lg"
              variant="destructive"
              className="w-full h-14 text-base font-semibold"
              onClick={handleStopWaiting}
              disabled={!!loading}
            >
              {loading === 'stop' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Square className="w-5 h-5 mr-2" />
              )}
              Stop wachttijd
            </Button>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground text-center">
          {!hasArrived && 'Druk op "Ik ben aangekomen" wanneer je op locatie bent'}
          {hasArrived && !isWaiting && !waitingCompleted && 'Start de wachttijd als je moet wachten op laden/lossen'}
          {isWaiting && 'De timer loopt. Stop de wachttijd wanneer je kunt beginnen'}
          {waitingCompleted && 'Wachttijd is geregistreerd en wordt meegenomen in de factuur'}
        </p>
      </CardContent>
    </Card>
  );
};

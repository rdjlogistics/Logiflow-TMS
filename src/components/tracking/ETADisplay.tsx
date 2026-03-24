import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Truck, MapPin, Navigation, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/hooks/useParallaxEffect';

interface ETADisplayProps {
  distanceKm: number | null;
  estimatedArrival?: string | null;
  averageSpeedKmh?: number;
  className?: string;
  liveEtaMinutes?: number | null;
  routeDistanceKm?: number | null;
  isCalculating?: boolean;
}

export const ETADisplay = ({
  distanceKm,
  estimatedArrival,
  averageSpeedKmh = 50,
  className,
  liveEtaMinutes,
  routeDistanceKm,
  isCalculating,
}: ETADisplayProps) => {
  const { ref, isVisible } = useScrollReveal(0.1);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Use live ETA if available, otherwise fall back to existing logic
  const effectiveDistanceKm = routeDistanceKm ?? distanceKm;

  const eta = useMemo(() => {
    // Priority 1: live route-based ETA
    if (liveEtaMinutes != null) {
      const arrival = new Date(Date.now() + liveEtaMinutes * 60000);
      return {
        minutes: liveEtaMinutes,
        time: arrival.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      };
    }

    if (estimatedArrival) {
      const arrivalTime = new Date(estimatedArrival);
      const now = new Date();
      const diffMs = arrivalTime.getTime() - now.getTime();
      const diffMins = Math.max(0, Math.round(diffMs / 60000));
      
      return {
        minutes: diffMins,
        time: arrivalTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      };
    }
    
    if (distanceKm !== null) {
      const hoursRemaining = distanceKm / averageSpeedKmh;
      const minutesRemaining = Math.round(hoursRemaining * 60);
      const arrivalTime = new Date(Date.now() + minutesRemaining * 60000);
      
      return {
        minutes: minutesRemaining,
        time: arrivalTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
      };
    }
    
    return null;
  }, [distanceKm, estimatedArrival, averageSpeedKmh, liveEtaMinutes]);

  const progressPercent = useMemo(() => {
    const d = effectiveDistanceKm;
    if (d === null || d === undefined) return 0;
    return Math.min(100, Math.max(0, ((30 - d) / 30) * 100));
  }, [effectiveDistanceKm]);

  // Animate progress on mount
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progressPercent);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, progressPercent]);

  if (!eta || (distanceKm === null && effectiveDistanceKm === null)) {
    return null;
  }

  const displayDistance = effectiveDistanceKm ?? distanceKm ?? 0;
  const isClose = displayDistance < 5;
  const isVeryClose = displayDistance < 1;

  return (
    <div ref={ref}>
      <Card 
        className={cn(
          'overflow-hidden border-2 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          isVeryClose 
            ? 'bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-green-500/20 border-green-500/50 shadow-xl shadow-green-500/20'
            : isClose 
            ? 'bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border-primary/40 shadow-lg shadow-primary/10'
            : 'bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20',
          className
        )}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isVeryClose && (
            <>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-green-400/30"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${30 + (i % 2) * 40}%`,
                    animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </>
          )}
        </div>

        <CardContent className="p-5 relative">
          {/* Arrival badge for very close */}
          {isVeryClose && (
            <div className="absolute -top-1 -right-1 bg-green-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-bold flex items-center gap-1 animate-pulse">
              <Zap className="w-3 h-3" />
              Bijna daar!
            </div>
          )}

          {/* ETA Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500',
                isVeryClose 
                  ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/40' 
                  : 'bg-gradient-to-br from-primary/20 to-primary/10'
              )}>
                <Clock className={cn(
                  'w-7 h-7 transition-colors',
                  isVeryClose ? 'text-white' : 'text-primary'
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Geschatte aankomst</p>
                <p className={cn(
                  'text-3xl font-bold tracking-tight transition-colors',
                  isVeryClose ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                )}>
                  {eta.time}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Nog</p>
              <p className={cn(
                'text-xl font-bold transition-colors',
                isVeryClose 
                  ? 'text-green-600 dark:text-green-400' 
                  : isClose 
                  ? 'text-primary' 
                  : 'text-primary/80'
              )}>
                {eta.minutes < 60 
                  ? `${eta.minutes} min`
                  : `${Math.floor(eta.minutes / 60)}u ${eta.minutes % 60}m`
                }
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  isVeryClose ? 'bg-green-500/20' : 'bg-primary/10'
                )}>
                  <Truck className={cn(
                    'w-3.5 h-3.5',
                    isVeryClose ? 'text-green-600' : 'text-primary'
                  )} />
                </div>
                <span className="font-medium">Chauffeur</span>
              </div>
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold',
                isVeryClose 
                  ? 'bg-green-500/20 text-green-600' 
                  : 'bg-primary/10 text-primary'
              )}>
                <Navigation className="w-3.5 h-3.5" />
                <span>{isCalculating ? '...' : displayDistance < 1 ? `${Math.round(displayDistance * 1000)}m` : `${displayDistance.toFixed(1)} km`}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Bestemming</span>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  'bg-accent/20'
                )}>
                  <MapPin className="w-3.5 h-3.5 text-accent-foreground" />
                </div>
              </div>
            </div>
            
            {/* Animated progress track */}
            <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
              {/* Animated background shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              
              {/* Progress fill */}
              <div 
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out',
                  isVeryClose 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                    : 'bg-gradient-to-r from-primary to-primary-glow'
                )}
                style={{ width: `${animatedProgress}%` }}
              />
              
              {/* Truck indicator */}
              <div 
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-background shadow-xl transition-all duration-1000 ease-out flex items-center justify-center',
                  isVeryClose 
                    ? 'bg-gradient-to-br from-green-400 to-green-600' 
                    : 'bg-gradient-to-br from-primary to-primary-glow'
                )}
                style={{ left: `calc(${animatedProgress}% - 12px)` }}
              >
                <Truck className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

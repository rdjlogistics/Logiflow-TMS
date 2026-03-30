import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useDriverTrips } from '@/hooks/useDriverTrips';
import { useDriverPortalData } from '@/hooks/useDriverPortalData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DriverSmartTipsCard } from '@/components/driver/DriverSmartTipsCard';
import { DrivingTimeCard } from '@/components/driver/DrivingTimeCard';
import { 
  MapPin, 
  Clock, 
  ChevronRight,
  Navigation,
  Calendar,
  Route,
  Truck,
  Play,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lightweight skeleton for instant perceived loading
const HomeTabSkeleton = memo(() => (
  <div className="flex-1 p-4 space-y-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 bg-white/5" />
        <Skeleton className="h-4 w-24 bg-white/5" />
      </div>
      <Skeleton className="h-8 w-20 rounded-full bg-white/5" />
    </div>
    <Skeleton className="h-40 w-full rounded-2xl bg-white/5" />
    <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
    <div className="grid grid-cols-3 gap-3">
      <Skeleton className="h-20 rounded-2xl bg-white/5" />
      <Skeleton className="h-20 rounded-2xl bg-white/5" />
      <Skeleton className="h-20 rounded-2xl bg-white/5" />
    </div>
  </div>
));

interface DriverHomeTabProps {
  onNavigateToRooster: () => void;
  onNavigateToRoutes: () => void;
  onStartRoute: (tripId: string) => void;
  gpsPermissionStatus?: PermissionState | null;
  onRequestGPSPermission?: () => Promise<boolean>;
}

export function DriverHomeTab({ 
  onNavigateToRooster, 
  onNavigateToRoutes,
  onStartRoute,
  gpsPermissionStatus,
  onRequestGPSPermission,
}: DriverHomeTabProps) {
  const { trips, loading, startTrip } = useDriverTrips();
  const { stats } = useDriverPortalData();

  const permissionStatus = gpsPermissionStatus ?? null;
  const requestPermission = onRequestGPSPermission ?? (async () => false);
  const locationPermission = permissionStatus === 'granted';
  const gpsEnabled = locationPermission;

  // greeting removed - now in DriverPortal header

  const activeRoute = useMemo(() => {
    return trips.find(t => t.status === 'onderweg');
  }, [trips]);

  const nextRoute = useMemo(() => {
    if (activeRoute) return null;
    return trips.find(t => t.status === 'gepland');
  }, [trips, activeRoute]);

  const handleStartRoute = async () => {
    if (!nextRoute) return;
    if (!gpsEnabled) {
      // Try to request permission but don't block
      requestPermission();
    }
    await startTrip(nextRoute.id);
    onStartRoute(nextRoute.id);
  };

  const handleContinueRoute = () => {
    if (activeRoute) {
      onStartRoute(activeRoute.id);
    }
  };

  const primaryState = useMemo(() => {
    if (activeRoute) {
      const stops = activeRoute.route_stops || [];
      const doneStops = stops.filter(s => s.status === 'completed').length;
      return {
        type: 'active_route' as const,
        title: 'Actieve rit',
        subtitle: `${activeRoute.order_number} • ${doneStops}/${stops.length} stops`,
        cta: 'Ga naar rit',
        action: handleContinueRoute,
      };
    }
    if (stats.upcomingShifts > 0 && stats.nextShift) {
      const shift = stats.nextShift;
      const startFormatted = shift.start_time?.slice(0, 5) || '—';
      const endFormatted = shift.end_time?.slice(0, 5) || '—';
      const isToday = shift.trip_date === new Date().toISOString().split('T')[0];
      return {
        type: 'next_shift' as const,
        title: 'Volgende dienst',
        subtitle: `${isToday ? 'Vandaag' : shift.trip_date} ${startFormatted} - ${endFormatted}`,
        badge: 'Toegekend',
        cta: 'Bekijk details',
        action: onNavigateToRooster,
        vehicleType: shift.vehicle_type,
        shiftStart: startFormatted,
        shiftEnd: endFormatted,
      };
    }
    if (nextRoute) {
      return {
        type: 'next_route' as const,
        title: 'Volgende rit',
        subtitle: `#${nextRoute.order_number} • ${nextRoute.pickup_city} → ${nextRoute.delivery_city}`,
        badge: 'Gepland',
        cta: 'Start rit',
        action: handleStartRoute,
      };
    }
    return {
      type: 'no_shift' as const,
      title: 'Geen dienst gepland',
      subtitle: 'Bekijk het rooster voor beschikbare diensten.',
      cta: 'Bekijk rooster',
      action: onNavigateToRooster,
    };
  }, [activeRoute, stats.upcomingShifts, nextRoute, onNavigateToRooster, handleStartRoute]);
  const itemVariants = {};


  if (loading) {
    return <HomeTabSkeleton />;
  }

  return (
    <ScrollArea className="flex-1 scroll-smooth-touch">
      <div className="px-4 pb-28 pt-6 space-y-5 bottom-nav-safe">
        {/* Premium Badge */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-pink-500/20 border border-white/10">
            <Sparkles className="w-3 h-3 text-pink-400" />
            <span className="text-xs text-white/60 font-medium">Premium</span>
          </div>
        </div>

        {/* Premium GPS Status Banner */}
        {!locationPermission && (
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-white/90">Locatie-toegang vereist</p>
                  <p className="text-xs text-white/50">
                    Sta locatie toe om ritten te starten.
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={requestPermission}
                className="h-9 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
              >
                Toestaan
              </Button>
            </div>
          </div>
        )}

        {/* Premium Primary Work Card */}
        <div>
          <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl">
              <CardContent className="p-5">
                {primaryState.type === 'no_shift' ? (
                  <div className="flex flex-col items-center text-center py-4">
                    <motion.div 
                      className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Calendar className="h-7 w-7 text-muted-foreground/50" />
                    </motion.div>
                    <p className="font-semibold mb-1">{primaryState.title}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {primaryState.subtitle}
                    </p>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={primaryState.action}>
                        {primaryState.cta}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            primaryState.type === 'active_route' 
                              ? "bg-blue-500/10" 
                              : primaryState.type === 'next_route'
                                ? "bg-primary/10"
                                : "bg-primary/10"
                          )}
                          animate={primaryState.type === 'active_route' ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          {primaryState.type === 'active_route' ? (
                            <Route className="h-6 w-6 text-blue-500" />
                          ) : primaryState.type === 'next_route' ? (
                            <Play className="h-6 w-6 text-primary" />
                          ) : (
                            <Calendar className="h-6 w-6 text-primary" />
                          )}
                        </motion.div>
                        <div>
                          <p className="font-semibold">{primaryState.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {primaryState.subtitle}
                          </p>
                        </div>
                      </div>
                      {primaryState.badge && (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {primaryState.badge}
                        </Badge>
                      )}
                    </div>

                    {primaryState.type === 'next_shift' && (
                      <motion.div 
                        className="flex items-center gap-4 text-sm text-muted-foreground"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{primaryState.shiftStart} - {primaryState.shiftEnd}</span>
                        </div>
                        {primaryState.vehicleType && (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            <span>{primaryState.vehicleType}</span>
                          </div>
                        )}
                      </motion.div>
                    )}

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button 
                        className="w-full h-11" 
                        onClick={primaryState.action}
                      >
                        {primaryState.cta}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </motion.div>
                  </div>
                )}
              </CardContent>
            </div>
          </motion.div>
        </div>

        {/* D) Next Route Card (only if exists and not active) */}
        {nextRoute && !activeRoute && (
          <motion.div>
            <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Card className="border-border/40 overflow-hidden">
                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                          whileHover={{ rotate: 10 }}
                        >
                          <Route className="h-6 w-6 text-primary" />
                        </motion.div>
                        <div>
                          <p className="font-semibold">Volgende rit</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            #{nextRoute.order_number}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">Gepland</Badge>
                    </div>
                    
                    <div className="bg-muted/30 rounded-xl p-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {nextRoute.pickup_city} → {nextRoute.delivery_city}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(nextRoute.route_stops || []).length} stops
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Button 
                          className="w-full h-11" 
                          onClick={handleStartRoute}
                          disabled={!gpsEnabled}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start rit
                        </Button>
                      </motion.div>
                      {!gpsEnabled && (
                        <p className="text-xs text-center text-muted-foreground">
                          Activeer locatie om te starten
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* EU 561/2006 Rij- en rusttijden */}
        <DrivingTimeCard />

        {/* Prestaties vandaag - Motivational card */}
        {(stats.completedStops > 0 || activeRoute) && (
          <motion.div variants={itemVariants}>
            <Card className="border-border/40 overflow-hidden bg-gradient-to-br from-emerald-500/5 to-cyan-500/5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Prestaties vandaag</p>
                    <p className="text-xs text-muted-foreground">Je doet het geweldig! 💪</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-xl bg-white/5">
                    <p className="text-lg font-bold text-emerald-400">{stats.completedStops}</p>
                    <p className="text-[10px] text-muted-foreground">Stops klaar</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/5">
                    <p className="text-lg font-bold text-blue-400">{stats.todayRoutes}</p>
                    <p className="text-[10px] text-muted-foreground">Ritten</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-white/5">
                    <p className="text-lg font-bold text-amber-400">{stats.onTimePercent != null ? `${stats.onTimePercent}%` : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">On-time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Smart Tips */}
        <motion.div variants={itemVariants}>
          <DriverSmartTipsCard />
        </motion.div>

        {/* E) Mini Stats Row */}
        <motion.div className="grid grid-cols-3 gap-3" variants={itemVariants}>
          {[
            { value: stats.todayRoutes, label: 'Ritten' },
            { value: stats.pendingStops, label: 'Stops' },
            { value: stats.completedStops, label: 'Voltooid', color: 'text-green-500' },
          ].map((stat, i) => (
            <motion.div 
              key={stat.label}
              className="bg-card border border-border/40 rounded-[18px] p-3 text-center"
              whileHover={{ scale: 1.03, y: -2 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <motion.p 
                className={cn("text-2xl font-bold", stat.color)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.5 + i * 0.1 }}
              >
                {stat.value}
              </motion.p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </ScrollArea>
  );
}
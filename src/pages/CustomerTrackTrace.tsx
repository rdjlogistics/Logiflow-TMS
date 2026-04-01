import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TrackingMap from "@/components/tracking/TrackingMap";
import { GPSQualityIndicator } from "@/components/tracking/GPSQualityIndicator";
import { ETADisplay } from "@/components/tracking/ETADisplay";
import { DeliveryProgress } from "@/components/tracking/TrackingTimeline";
import { AnimatedBackground } from "@/components/tracking/AnimatedBackground";
import { AnimatedCard } from "@/components/tracking/AnimatedCard";
import { useRealtimeDriverLocation } from "@/hooks/useRealtimeDriverLocation";
import { useLiveETA } from "@/hooks/useLiveETA";
import { useTrackingNotifications } from "@/hooks/useTrackingNotifications";
import { useParallaxEffect, useScrollReveal } from "@/hooks/useParallaxEffect";
import { calculateDistance } from "@/utils/geocoding";
import {
  Truck,
  MapPin,
  Clock,
  Package,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Navigation,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const VISIBILITY_RADIUS_KM = 30;

const CustomerTrackTrace = () => {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = pathToken || searchParams.get("token");
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, []);

  const { mousePosition, scrollPosition } = useParallaxEffect();

  // Fetch tracking info by token using secure RPC function
  const { data: trackingData, isLoading, error } = useQuery({
    queryKey: ["tracking", token],
    queryFn: async () => {
      if (!token) throw new Error("Geen tracking token");

      // Use secure RPC function that validates token server-side
      const { data: result, error: rpcError } = await supabase
        .rpc('get_tracking_by_token', { p_token: token });

      if (rpcError) {
        console.error('Tracking RPC error:', rpcError);
        throw new Error("Er is een fout opgetreden bij het laden van de tracking");
      }

      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw new Error("Ongeldige of verlopen tracking link");
      }

      // Cast the result to the expected format
      const trackingResult = result as {
        id: string;
        token: string;
        trip_id: string;
        expires_at: string;
        is_active: boolean;
        access_count: number;
        trip: {
          id: string;
          status: string;
          pickup_address: string;
          pickup_city: string;
          pickup_postal_code: string;
          pickup_latitude: number;
          pickup_longitude: number;
          delivery_address: string;
          delivery_city: string;
          delivery_postal_code: string;
          delivery_latitude: number;
          delivery_longitude: number;
          trip_date: string;
          estimated_arrival: string | null;
          actual_arrival: string | null;
          cargo_description: string | null;
          customer: {
            company_name: string;
            contact_name: string;
          } | null;
          vehicle: {
            brand: string;
            model: string;
            license_plate: string;
          } | null;
        };
      };

      return trackingResult;
    },
    enabled: !!token,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const trip = trackingData?.trip;

  // Get realtime driver location with accuracy
  const { location: driverLocation, loading: locationLoading } =
    useRealtimeDriverLocation(trip?.id);

  // Calculate distance when location updates
  useEffect(() => {
    if (
      driverLocation &&
      trip?.delivery_latitude &&
      trip?.delivery_longitude
    ) {
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        trip.delivery_latitude,
        trip.delivery_longitude
      );
      setCurrentDistance(distance);
      setIsWithinRadius(distance <= VISIBILITY_RADIUS_KM);
    }
  }, [driverLocation, trip]);

  // Live route-based ETA
  const liveDestination = trip?.delivery_latitude && trip?.delivery_longitude
    ? { lat: trip.delivery_latitude, lng: trip.delivery_longitude }
    : null;
  const { etaMinutes: liveEtaMinutes, routeDistanceKm, isCalculating: etaCalculating } = useLiveETA(
    isWithinRadius && driverLocation ? driverLocation : null,
    liveDestination
  );

  // Tracking notifications
  const { requestNotificationPermission, notificationPermission } = useTrackingNotifications({
    currentDistance,
    etaMinutes: liveEtaMinutes,
    isActive: isWithinRadius,
    customerName: 'De chauffeur',
  });

  const statusInfo = useMemo(() => ({
    gepland: { label: "Gepland", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: Clock },
    onderweg: { label: "Onderweg", color: "bg-amber-500/20 text-amber-600 border-amber-500/30", icon: Truck },
    geladen: { label: "Geladen", color: "bg-purple-500/20 text-purple-600 border-purple-500/30", icon: Package },
    afgeleverd: { label: "Afgeleverd", color: "bg-green-500/20 text-green-600 border-green-500/30", icon: CheckCircle },
    afgerond: { label: "Afgerond", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30", icon: CheckCircle },
    geannuleerd: { label: "Geannuleerd", color: "bg-red-500/20 text-red-600 border-red-500/30", icon: AlertCircle },
  }), []);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 relative overflow-hidden">
        <AnimatedBackground variant="tracking" />
        <Card className="max-w-md w-full shadow-2xl relative z-10 animate-scale-in">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Geen tracking token</h2>
            <p className="text-muted-foreground">
              Je hebt een geldige tracking link nodig om je zending te volgen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted relative overflow-hidden">
        <AnimatedBackground variant="tracking" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
            {/* Spinning ring */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            {/* Inner truck icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Truck className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center animate-fade-in">
            <p className="font-semibold text-lg">Even geduld</p>
            <p className="text-sm text-muted-foreground">Tracking informatie laden...</p>
          </div>
          {/* Floating particles */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/30"
              style={{
                left: `${30 + i * 20}%`,
                top: `${40 + (i % 2) * 20}%`,
                animation: `float ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4 relative overflow-hidden">
        <AnimatedBackground variant="tracking" />
        <Card className="max-w-md w-full shadow-2xl relative z-10 animate-scale-in">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-destructive animate-bounce-subtle" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Tracking niet beschikbaar</h2>
            <p className="text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Er is een fout opgetreden bij het laden van de tracking informatie."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusInfo[trip?.status as keyof typeof statusInfo] || statusInfo.gepland;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground variant="tracking" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3"
              style={{
                transform: `translate3d(${mousePosition.normalizedX * 5}px, ${mousePosition.normalizedY * 3}px, 0)`,
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow relative overflow-hidden">
                <Truck className="h-6 w-6 text-primary-foreground relative z-10" />
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg flex items-center gap-2">
                  LogiFlow
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </h1>
                <p className="text-xs text-muted-foreground">
                  Live Track & Trace
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Copy tracking link button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                title="Kopieer tracking link"
                className={cn(
                  'transition-all duration-300',
                  linkCopied
                    ? 'text-emerald-500 hover:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {linkCopied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>

              {/* Notification permission button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={requestNotificationPermission}
                className={cn(
                  'transition-all duration-300',
                  notificationPermission === 'granted'
                    ? 'text-primary hover:text-primary/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {notificationPermission === 'granted' ? (
                  <Bell className="h-5 w-5 animate-bounce-subtle" />
                ) : (
                  <BellOff className="h-5 w-5" />
                )}
              </Button>
              <Badge
                variant="outline"
                className={cn(
                  status.color,
                  'animate-fade-in'
                )}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-24 relative z-10">
        {/* ETA Display - Show when within radius */}
        {isWithinRadius && currentDistance !== null && (
          <div className="animate-fade-in-up">
            <ETADisplay
              distanceKm={currentDistance}
              estimatedArrival={trip?.estimated_arrival}
              liveEtaMinutes={liveEtaMinutes}
              routeDistanceKm={routeDistanceKm}
              isCalculating={etaCalculating}
            />
          </div>
        )}

        {/* Map */}
        <Card 
          className={cn(
            'overflow-hidden shadow-xl border-0 transition-all duration-500',
            'animate-fade-in'
          )}
          style={{
            transform: `translate3d(${mousePosition.normalizedX * 3}px, ${mousePosition.normalizedY * 3}px, 0)`,
          }}
        >
          <div className="relative">
            <TrackingMap
              driverLocation={
                isWithinRadius && driverLocation
                  ? {
                      latitude: driverLocation.latitude,
                      longitude: driverLocation.longitude,
                      heading: driverLocation.heading || undefined,
                      speed: driverLocation.speed || undefined,
                    }
                  : undefined
              }
              deliveryLocation={
                trip?.delivery_latitude && trip?.delivery_longitude
                  ? {
                      latitude: trip.delivery_latitude,
                      longitude: trip.delivery_longitude,
                      address: `${trip.delivery_address}, ${trip.delivery_city}`,
                    }
                  : undefined
              }
              pickupLocation={
                isWithinRadius && trip?.pickup_latitude && trip?.pickup_longitude
                  ? {
                      latitude: trip.pickup_latitude,
                      longitude: trip.pickup_longitude,
                      address: `${trip.pickup_address}, ${trip.pickup_city}`,
                    }
                  : undefined
              }
              showDriverMarker={isWithinRadius}
              showRoute={isWithinRadius}
              className="h-[350px] md:h-[450px]"
            />
            
            {/* GPS Quality Indicator Overlay */}
            {isWithinRadius && driverLocation && (
              <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border/50 animate-fade-in">
                <GPSQualityIndicator
                  accuracy={(driverLocation as any).accuracy}
                  lastUpdate={driverLocation.recorded_at}
                />
              </div>
            )}

            {/* Distance Badge Overlay */}
            {isWithinRadius && currentDistance !== null && (
              <div className="absolute bottom-4 left-4 right-4 flex justify-center animate-fade-in-up">
                <div className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 border border-primary-foreground/20">
                  <Navigation className="h-4 w-4 animate-pulse" />
                  <span className="font-bold">
                    {currentDistance < 1 
                      ? `${Math.round(currentDistance * 1000)}m` 
                      : `${currentDistance.toFixed(1)} km`
                    } verwijderd
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Driver visibility notice */}
        <AnimatedCard
          delay={100}
          variant={isWithinRadius ? 'glow' : 'default'}
          className={cn(
            'transition-all duration-500',
            isWithinRadius
              ? "bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-green-500/10 border-green-500/30"
              : "bg-muted/30"
          )}
        >
          <div className="flex items-center gap-4">
            {isWithinRadius ? (
              <>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 relative">
                  <Eye className="h-7 w-7 text-white" />
                  {/* Pulse rings */}
                  <span className="absolute inset-0 rounded-xl bg-green-500/30 animate-ping" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-green-600 dark:text-green-400 text-lg">
                    Chauffeur is live zichtbaar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Volg de chauffeur in real-time op de kaart
                  </p>
                </div>
                {currentDistance !== null && (
                  <Badge 
                    variant="outline" 
                    className="bg-green-500/20 text-green-600 border-green-500/30 font-bold text-base px-4 py-2"
                  >
                    {currentDistance.toFixed(1)} km
                  </Badge>
                )}
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-muted/80 flex items-center justify-center">
                  <EyeOff className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">Chauffeur nog niet zichtbaar</p>
                  <p className="text-sm text-muted-foreground">
                    De live tracking wordt actief zodra de chauffeur binnen 30 km is
                  </p>
                </div>
              </>
            )}
          </div>
        </AnimatedCard>

        {/* Delivery Progress Timeline */}
        <AnimatedCard
          delay={200}
          title="Bezorgvoortgang"
          icon={<Package className="h-4 w-4 text-primary" />}
        >
          <DeliveryProgress
            status={trip?.status || 'gepland'}
            distanceKm={currentDistance}
            isWithinRadius={isWithinRadius}
          />
        </AnimatedCard>

        {/* Shipment details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatedCard
            delay={300}
            title={
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <MapPin className="h-3 w-3 text-white" />
                </div>
                Ophaaladres
              </div>
            }
            className="bg-gradient-to-br from-card to-card/80"
          >
            <p className="font-semibold">{trip?.pickup_address}</p>
            <p className="text-sm text-muted-foreground">
              {trip?.pickup_postal_code} {trip?.pickup_city}
            </p>
          </AnimatedCard>

          <AnimatedCard
            delay={400}
            title={
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-glow flex items-center justify-center">
                  <MapPin className="h-3 w-3 text-accent-foreground" />
                </div>
                Afleveradres
              </div>
            }
            className="bg-gradient-to-br from-card to-card/80"
          >
            <p className="font-semibold">{trip?.delivery_address}</p>
            <p className="text-sm text-muted-foreground">
              {trip?.delivery_postal_code} {trip?.delivery_city}
            </p>
          </AnimatedCard>
        </div>

        {/* Trip info */}
        <AnimatedCard
          delay={500}
          title="Zending Details"
          icon={<Truck className="h-4 w-4 text-primary" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Datum</p>
              <p className="font-semibold">
                {trip?.trip_date
                  ? format(new Date(trip.trip_date), "d MMMM yyyy", { locale: nl })
                  : "-"}
              </p>
            </div>
            {trip?.cargo_description && (
              <div>
                <p className="text-xs text-muted-foreground">Lading</p>
                <p className="font-semibold">{trip.cargo_description}</p>
              </div>
            )}
            {trip?.vehicle && (
              <div>
                <p className="text-xs text-muted-foreground">Voertuig</p>
                <p className="font-semibold">
                  {trip.vehicle.brand} {trip.vehicle.model}
                </p>
              </div>
            )}
            {trip?.estimated_arrival && (
              <div>
                <p className="text-xs text-muted-foreground">Geschatte aankomst</p>
                <p className="font-semibold">
                  {format(new Date(trip.estimated_arrival), "HH:mm", { locale: nl })}
                </p>
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Last update */}
        {driverLocation && isWithinRadius && (
          <p className="text-center text-xs text-muted-foreground animate-fade-in">
            Laatste update:{" "}
            <span className="font-medium">
              {format(new Date(driverLocation.recorded_at), "HH:mm:ss", { locale: nl })}
            </span>
          </p>
        )}
      </main>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CustomerTrackTrace;

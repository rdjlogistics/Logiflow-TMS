import { useParams, Link } from "react-router-dom";
import B2BLayout from "@/components/portal/b2b/B2BLayout";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useShipmentById } from "@/components/portal/shared/usePortalData";
import { statusConfig } from "@/components/portal/shared/types";
import { LoadingState } from "@/components/portal/shared/LoadingState";
import { B2BLiveTrackingCard } from "@/components/portal/b2b/B2BLiveTrackingCard";
import { ETADisplay } from "@/components/tracking/ETADisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  ArrowLeft, MapPin, Package, Truck, Calendar, Euro, Hash,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25 } },
};

const timelineSteps = [
  { key: "pending", label: "Aangevraagd", icon: Clock },
  { key: "confirmed", label: "Bevestigd", icon: CheckCircle2 },
  { key: "pickup_scheduled", label: "Ophalen gepland", icon: Calendar },
  { key: "picked_up", label: "Opgehaald", icon: Package },
  { key: "in_transit", label: "Onderweg", icon: Truck },
  { key: "out_for_delivery", label: "Bezorging", icon: Navigation },
  { key: "delivered", label: "Afgeleverd", icon: CheckCircle2 },
];

const statusOrder: Record<string, number> = {
  pending: 0, confirmed: 1, pickup_scheduled: 2, picked_up: 3,
  in_transit: 4, out_for_delivery: 5, delivered: 6,
  failed: -1, cancelled: -1,
};

const B2BShipmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { customer } = usePortalAuth();
  const { shipment, loading } = useShipmentById(id || "");
  const [driverNearby, setDriverNearby] = useState(false);
  const [liveEta, setLiveEta] = useState<{ minutes: number | null; distanceKm: number | null; calculating: boolean }>({ minutes: null, distanceKm: null, calculating: false });

  const handleProximityChange = useCallback((isWithin: boolean) => {
    setDriverNearby(isWithin);
  }, []);

  const handleETAUpdate = useCallback((etaMinutes: number | null, routeDistanceKm: number | null, isCalculating: boolean) => {
    setLiveEta({ minutes: etaMinutes, distanceKm: routeDistanceKm, calculating: isCalculating });
  }, []);

  if (loading) {
    return (
      <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"}>
        <LoadingState message="Zending laden..." />
      </B2BLayout>
    );
  }

  if (!shipment) {
    return (
      <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"}>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Zending niet gevonden</h2>
          <p className="text-muted-foreground mb-6">Deze zending bestaat niet of je hebt geen toegang.</p>
          <Button asChild><Link to="/portal/b2b/shipments">Terug naar zendingen</Link></Button>
        </div>
      </B2BLayout>
    );
  }

  const status = statusConfig[shipment.status];
  const effectiveStep = driverNearby && shipment.status === 'in_transit' ? statusOrder['out_for_delivery'] : (statusOrder[shipment.status] ?? -1);
  const currentStep = effectiveStep;

  return (
    <B2BLayout companyName={customer?.companyName || "Mijn Bedrijf"}>
      <div className="space-y-6">
        {/* Back + Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/portal/b2b/shipments"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">{shipment.referenceNumber}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn(status.bgColor, status.color, "border-0 text-xs")}>
                  {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Aangemaakt {format(new Date(shipment.createdAt), "d MMM yyyy", { locale: nl })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/b2b/cases">Case aanmaken</Link>
            </Button>
            {shipment.status === "delivered" && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/portal/b2b/deliveries">Afleveringsbewijs</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Route Card */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Ophaaladres</p>
                  <p className="font-semibold">{shipment.fromCity}</p>
                  <p className="text-sm text-muted-foreground">{shipment.fromAddress}</p>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Afleveradres</p>
                  <p className="font-semibold">{shipment.toCity}</p>
                  <p className="text-sm text-muted-foreground">{shipment.toAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Tracking (only for in_transit with tripId) */}
        {shipment.status === 'in_transit' && shipment.tripId && (
          <>
            <B2BLiveTrackingCard
              tripId={shipment.tripId}
              deliveryCity={shipment.toCity}
              deliveryAddress={shipment.toAddress}
              customerId={shipment.customer?.id}
              onProximityChange={handleProximityChange}
              onETAUpdate={handleETAUpdate}
            />
            {liveEta.minutes != null && (
              <div>
                <ETADisplay
                  distanceKm={liveEta.distanceKm}
                  liveEtaMinutes={liveEta.minutes}
                  routeDistanceKm={liveEta.distanceKm}
                  isCalculating={liveEta.calculating}
                />
              </div>
            )}
          </>
        )}
        {/* Tracking Code */}
        {shipment.trackingCode && (
          <div>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Hash className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Tracking Code</p>
                  <p className="font-mono font-semibold text-sm">{shipment.trackingCode}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Package, label: "Colli", value: shipment.parcels },
            { icon: Hash, label: "Gewicht", value: shipment.weight ? `${shipment.weight} kg` : "-" },
            { icon: Euro, label: "Prijs", value: shipment.price ? `€${shipment.price.toFixed(2)}` : "-" },
            { icon: Calendar, label: "Verwachte levering", value: shipment.estimatedDelivery ? format(new Date(shipment.estimatedDelivery), "d MMM yyyy", { locale: nl }) : "-" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <p className="font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Timeline */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipment.status === "cancelled" || shipment.status === "failed" ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    {shipment.status === "cancelled" ? "Zending geannuleerd" : "Bezorging mislukt"}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-0 overflow-x-auto pb-2">
                  {timelineSteps.map((step, i) => {
                    const stepIdx = statusOrder[step.key] ?? i;
                    const isCompleted = currentStep >= stepIdx;
                    const isCurrent = currentStep === stepIdx;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.key} className="flex items-center flex-shrink-0">
                        <div
                          className={cn(
                            "flex flex-col items-center gap-1 px-2",
                            isCurrent && "scale-110"
                          )}}}}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                            isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <span className={cn(
                            "text-[10px] whitespace-nowrap",
                            isCompleted ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </span>
                        </div>
                        {i < timelineSteps.length - 1 && (
                          <div className={cn(
                            "w-8 h-0.5 flex-shrink-0",
                            currentStep > stepIdx ? "bg-primary" : "bg-muted"
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </B2BLayout>
  );
};

export default B2BShipmentDetail;

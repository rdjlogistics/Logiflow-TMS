import { useParams } from "react-router-dom";
import { B2CLayout } from "@/components/portal/b2c/B2CLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Package, 
  MapPin, 
  Clock, 
  Truck, 
  CheckCircle2, 
  Phone, 
  MessageSquare,
  Navigation,
  Calendar,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useShipmentTracking } from "@/hooks/usePortalShipments";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'In afwachting', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  approved: { label: 'Goedgekeurd', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  rejected: { label: 'Afgewezen', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  in_transit: { label: 'Onderweg', color: 'text-primary', bgColor: 'bg-primary/20' },
  delivered: { label: 'Afgeleverd', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
};

const B2CTrack = () => {
  const { id } = useParams<{ id: string }>();
  const { shipment, driverLocation, loading, error } = useShipmentTracking(id || '');

  if (loading) {
    return (
      <B2CLayout>
        <div className="p-4 space-y-4 pb-24">
          <div className="text-center py-4">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </B2CLayout>
    );
  }

  if (error || !shipment) {
    return (
      <B2CLayout>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Zending niet gevonden</h2>
              <p className="text-muted-foreground">
                {error || `De zending met ID ${id} kon niet worden gevonden.`}
              </p>
            </CardContent>
          </Card>
        </div>
      </B2CLayout>
    );
  }

  const status = statusConfig[shipment.status] || statusConfig.pending;

  const getProgressWidth = () => {
    switch (shipment.status) {
      case 'pending': return '10%';
      case 'approved': return '35%';
      case 'in_transit': return '65%';
      case 'delivered': return '100%';
      case 'rejected': return '0%';
      default: return '25%';
    }
  };

  const timelineEvents = [
    { 
      time: format(new Date(shipment.createdAt), 'HH:mm', { locale: nl }), 
      date: format(new Date(shipment.createdAt), 'dd MMM', { locale: nl }), 
      title: "Aanvraag ingediend", 
      completed: true 
    },
    { 
      time: "-", 
      date: "-", 
      title: "Goedgekeurd", 
      completed: shipment.status !== 'pending' && shipment.status !== 'rejected'
    },
    { 
      time: "-", 
      date: "-", 
      title: "Onderweg", 
      completed: shipment.status === 'in_transit' || shipment.status === 'delivered'
    },
    { 
      time: shipment.deliveredAt ? format(new Date(shipment.deliveredAt), 'HH:mm', { locale: nl }) : "-", 
      date: shipment.deliveredAt ? format(new Date(shipment.deliveredAt), 'dd MMM', { locale: nl }) : "-", 
      title: "Afgeleverd", 
      completed: shipment.status === 'delivered'
    },
  ];

  return (
    <B2CLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold mb-2">Track & Trace</h1>
          <p className="text-muted-foreground text-sm">Zending #{shipment.referenceNumber}</p>
        </div>

        {/* Status Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Badge className={`${status.bgColor} ${status.color}`}>
                {status.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {shipment.estimatedDelivery 
                  ? `ETA: ${format(new Date(shipment.estimatedDelivery), 'dd MMM', { locale: nl })}`
                  : "ETA: Onbekend"
                }
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-4">
              <div 
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                style={{ width: getProgressWidth() }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Aanvraag</span>
              <span>Goedgekeurd</span>
              <span>Onderweg</span>
              <span>Afgeleverd</span>
            </div>
          </CardContent>
        </Card>

        {/* Live Location (if available) */}
        {driverLocation && shipment.status === 'in_transit' && (
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-emerald-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-emerald-400">Live Tracking Actief</p>
                  <p className="text-xs text-muted-foreground">
                    Laatst bijgewerkt: {format(new Date(driverLocation.recordedAt), 'HH:mm:ss', { locale: nl })}
                  </p>
                </div>
                {driverLocation.speed && (
                  <div className="text-right">
                    <p className="text-lg font-bold">{Math.round(driverLocation.speed)} km/u</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Placeholder */}
        <Card className="bg-card/50 backdrop-blur border-border/50 overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-ping" />
              <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-primary rounded-full" />
              <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-emerald-500 rounded-full" />
              <div 
                className="absolute top-1/4 left-1/4 h-0.5 bg-primary/50 origin-left"
                style={{ width: '150px', transform: 'rotate(25deg)' }}
              />
            </div>
            <div className="text-center z-10">
              {driverLocation ? (
                <>
                  <Navigation className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-emerald-400 font-medium">Chauffeur live gevolgd</p>
                </>
              ) : (
                <>
                  <Navigation className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tracking beschikbaar na ophalen</p>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Addresses */}
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ophaaladres</p>
                  <p className="font-medium">{shipment.fromAddress || 'Adres onbekend'}</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.fromPostalCode} {shipment.fromCity}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Afleveradres</p>
                  <p className="font-medium">{shipment.toAddress || 'Adres onbekend'}</p>
                  <p className="text-sm text-muted-foreground">
                    {shipment.toPostalCode} {shipment.toCity}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipment Details */}
        {(shipment.parcels || shipment.weight || shipment.description) && (
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Zendingdetails
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Aantal colli</p>
                  <p className="font-medium">{shipment.parcels}</p>
                </div>
                {shipment.weight && (
                  <div>
                    <p className="text-muted-foreground">Gewicht</p>
                    <p className="font-medium">{shipment.weight} kg</p>
                  </div>
                )}
              </div>
              {shipment.description && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-muted-foreground text-xs mb-1">Omschrijving</p>
                  <p className="text-sm">{shipment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tijdlijn
            </h3>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      event.completed ? 'bg-primary' : 'bg-muted'
                    }`} />
                    {index < timelineEvents.length - 1 && (
                      <div className={`w-0.5 h-8 ${
                        event.completed ? 'bg-primary/50' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className={`font-medium text-sm ${
                      event.completed ? '' : 'text-muted-foreground'
                    }`}>
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.date} • {event.time}
                    </p>
                  </div>
                  {event.completed && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-14 touch-manipulation active:scale-[0.97]"
            onClick={() => {
              if (shipment.driverPhone) {
                window.location.href = `tel:${shipment.driverPhone}`;
              } else {
                toast.info("Telefoonnummer niet beschikbaar", {
                  description: "De chauffeur is nog niet toegewezen aan deze zending."
                });
              }
            }}
          >
            <Phone className="h-4 w-4 mr-2" />
            Bel chauffeur
          </Button>
          <Button 
            variant="outline" 
            className="h-14 touch-manipulation active:scale-[0.97]"
            onClick={() => {
              if (shipment.driverPhone) {
                window.open(`https://wa.me/${shipment.driverPhone.replace(/[^0-9]/g, '')}?text=Hallo, ik heb een vraag over mijn zending ${shipment.referenceNumber}`, '_blank');
              } else {
                toast.info("WhatsApp niet beschikbaar", {
                  description: "De chauffeur is nog niet toegewezen aan deze zending."
                });
              }
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Stuur bericht
          </Button>
        </div>
      </div>
    </B2CLayout>
  );
};

export default B2CTrack;

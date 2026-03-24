import { useState } from 'react';
import { CarrierTrip } from '@/hooks/useCarrierTrips';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StopCheckoutFlow } from '@/components/driver/StopCheckoutFlow';
import {
  RefreshCw,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronRight,
  Navigation,
  Loader2,
  Package,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CarrierTripsTabProps {
  trips: CarrierTrip[];
  loading: boolean;
  carrierId: string;
  portalRole: string;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Concept', color: 'bg-muted/30 text-muted-foreground' },
  gepland: { label: 'Gepland', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  geladen: { label: 'Geladen', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  onderweg: { label: 'Onderweg', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  afgeleverd: { label: 'Afgeleverd', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  afgerond: { label: 'Afgerond', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  gecontroleerd: { label: 'Gecontroleerd', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  gefactureerd: { label: 'Gefactureerd', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400' },
  geannuleerd: { label: 'Geannuleerd', color: 'bg-destructive/10 text-destructive' },
};

const stopStatusIcon = (status: string) => {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'in_progress') return <Clock className="h-4 w-4 text-amber-500" />;
  return <MapPin className="h-4 w-4 text-muted-foreground" />;
};

const CarrierTripsTab = ({ trips, loading, carrierId, portalRole, onRefresh }: CarrierTripsTabProps) => {
  const [selectedTrip, setSelectedTrip] = useState<CarrierTrip | null>(null);
  const [checkoutStop, setCheckoutStop] = useState<any>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Checkout flow
  if (checkoutStop && selectedTrip) {
    return (
      <StopCheckoutFlow
        stop={checkoutStop}
        tripId={selectedTrip.id}
        onComplete={() => {
          setCheckoutStop(null);
          setSelectedTrip(null);
          onRefresh();
        }}
        onCancel={() => setCheckoutStop(null)}
      />
    );
  }

  // Trip detail view
  if (selectedTrip) {
    const config = statusConfig[selectedTrip.status] || { label: selectedTrip.status, color: '' };
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTrip(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="font-bold">Rit {selectedTrip.order_number || selectedTrip.id.slice(0, 8)}</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(selectedTrip.trip_date), 'd MMMM yyyy', { locale: nl })}
            </p>
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>

        {/* Cargo info */}
        {selectedTrip.cargo_description && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">{selectedTrip.cargo_description}</p>
                  <p className="text-muted-foreground">
                    {[
                      selectedTrip.cargo_weight && `${selectedTrip.cargo_weight} kg`,
                      selectedTrip.loading_meters && `${selectedTrip.loading_meters} ldm`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stops */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Stops</h3>
          {selectedTrip.route_stops.map((stop, idx) => {
            const terminalStatuses = ['afgerond', 'afgeleverd', 'gecontroleerd', 'gefactureerd', 'geannuleerd'];
            const canCheckout = portalRole === 'driver' && stop.status !== 'completed' && !terminalStatuses.includes(selectedTrip.status);
            return (
              <Card key={stop.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                      {stopStatusIcon(stop.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {stop.company_name && (
                        <p className="font-medium text-sm truncate">{stop.company_name}</p>
                      )}
                      <p className="text-sm text-muted-foreground truncate">{stop.address}</p>
                      {stop.city && <p className="text-xs text-muted-foreground">{stop.city}</p>}
                      {stop.time_window_start && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {format(new Date(stop.time_window_start), 'HH:mm')}
                          {stop.time_window_end && ` – ${format(new Date(stop.time_window_end), 'HH:mm')}`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {stop.address && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const q = encodeURIComponent(`${stop.address}, ${stop.city || ''}`);
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, '_blank');
                          }}
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                      )}
                      {canCheckout && (
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => setCheckoutStop(stop)}
                        >
                          Afmelden
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Trip list
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Ritten</h2>
        <Button variant="ghost" size="icon" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Geen ritten gevonden</p>
        </div>
      ) : (
        trips.map(trip => {
          const config = statusConfig[trip.status] || { label: trip.status, color: '' };
          return (
            <Card
              key={trip.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedTrip(trip)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">
                      {trip.order_number || trip.id.slice(0, 8)}
                    </span>
                    <Badge className={cn('text-[10px]', config.color)}>{config.label}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(trip.trip_date), 'd MMM', { locale: nl })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{trip.pickup_city || trip.pickup_address}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{trip.delivery_city || trip.delivery_address}</span>
                </div>
                {trip.route_stops.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {trip.route_stops.length} stop{trip.route_stops.length > 1 ? 's' : ''} · 
                    {trip.route_stops.filter(s => s.status === 'completed').length} afgemeld
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default CarrierTripsTab;

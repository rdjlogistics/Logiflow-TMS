import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Package, 
  Clock, 
  ChevronRight,
  Truck,
  CheckCircle,
  Play,
  ArrowRight,
  Route,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DriverTripCardProps {
  trip: {
    id: string;
    trip_date: string;
    pickup_address: string;
    pickup_city: string | null;
    delivery_address: string;
    delivery_city: string | null;
    status: string;
    cargo_description: string | null;
    weight_kg: number | null;
    customer: { company_name: string; contact_name: string | null } | null;
    vehicle: { license_plate: string } | null;
  };
  isActive?: boolean;
  onSelect: () => void;
  onAccept?: () => void;
  onMarkDelivered?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: LucideIcon }> = {
  gepland: { 
    label: 'Gepland', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-500/10 border-blue-500/30', 
    icon: Clock 
  },
  geladen: { 
    label: 'Geladen', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-500/10 border-orange-500/30', 
    icon: Package 
  },
  onderweg: { 
    label: 'Onderweg', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-500/10 border-amber-500/30', 
    icon: Truck 
  },
  afgeleverd: { 
    label: 'Afgeleverd', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-500/10 border-green-500/30', 
    icon: CheckCircle 
  },
  gecontroleerd: { 
    label: 'Gecontroleerd', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-500/10 border-green-500/30', 
    icon: CheckCircle 
  },
  geannuleerd: { 
    label: 'Geannuleerd', 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10 border-destructive/30', 
    icon: Clock 
  },
};

export const DriverTripCard = ({
  trip,
  isActive,
  onSelect,
  onAccept,
  onMarkDelivered,
}: DriverTripCardProps) => {
  const status = statusConfig[trip.status] || statusConfig.gepland;
  const StatusIcon = status.icon;

  return (
    <Card 
      className={cn(
        'transition-all duration-300 cursor-pointer active:scale-[0.98] overflow-hidden group',
        isActive 
          ? 'border-2 border-primary shadow-xl shadow-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent' 
          : 'hover:border-primary/50 hover:shadow-lg'
      )}
      onClick={onSelect}
    >
      {/* Status indicator bar */}
      <div className={cn(
        'h-1.5 w-full',
        trip.status === 'onderweg' && 'bg-gradient-to-r from-amber-500 to-amber-400',
        trip.status === 'geladen' && 'bg-gradient-to-r from-orange-500 to-orange-400',
        trip.status === 'gepland' && 'bg-gradient-to-r from-blue-500 to-blue-400',
        (trip.status === 'afgeleverd' || trip.status === 'gecontroleerd') && 'bg-gradient-to-r from-green-500 to-green-400',
        trip.status === 'geannuleerd' && 'bg-gradient-to-r from-destructive to-destructive/70'
      )} />
      
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {trip.customer?.company_name || 'Onbekende klant'}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(trip.trip_date), 'd MMMM yyyy', { locale: nl })}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs font-semibold px-2.5 py-1 border', 
              status.bgColor, 
              status.color
            )}
          >
            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
            {status.label}
          </Badge>
        </div>

        {/* Route visualization */}
        <div className="relative mb-4">
          {/* Route line background */}
          <div className="absolute left-[15px] top-[26px] w-0.5 h-[calc(100%-52px)] bg-gradient-to-b from-green-500 via-muted to-primary" />
          
          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex items-start gap-3 relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/20 z-10">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5">Ophalen</p>
                <p className="text-sm font-medium line-clamp-1">{trip.pickup_address}</p>
                <p className="text-xs text-muted-foreground">{trip.pickup_city}</p>
              </div>
            </div>

            {/* Delivery */}
            <div className="flex items-start gap-3 relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20 z-10">
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Afleveren</p>
                <p className="text-sm font-medium line-clamp-1">{trip.delivery_address}</p>
                <p className="text-xs text-muted-foreground">{trip.delivery_city}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cargo info */}
        {(trip.cargo_description || trip.weight_kg) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 p-3 bg-muted/30 rounded-xl border border-border/50">
            <Package className="w-4 h-4 text-primary" />
            <span className="line-clamp-1 font-medium">
              {trip.cargo_description || ''} 
              {trip.weight_kg && ` • ${trip.weight_kg} kg`}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {trip.status === 'gepland' && onAccept && (
            <Button 
              size="sm" 
              className="flex-1 h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 shadow-lg shadow-primary/20"
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
            >
              <Play className="w-4 h-4 mr-2" />
              Start rit
            </Button>
          )}
          
          {trip.status === 'onderweg' && onMarkDelivered && (
            <Button 
              size="sm" 
              className="flex-1 h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-500/20"
              onClick={(e) => { e.stopPropagation(); onMarkDelivered(); }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Afgerond
            </Button>
          )}

          <Button 
            size="sm" 
            variant="outline" 
            className="h-12 px-4 rounded-xl border-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            <span className="mr-1.5 text-sm font-medium">Details</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

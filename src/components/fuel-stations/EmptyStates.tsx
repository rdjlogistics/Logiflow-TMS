import { Fuel, MapPin, Wifi, WifiOff, Locate, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  onRetry?: () => void;
  onRequestLocation?: () => void;
}

/**
 * No stations found within radius
 */
export function NoStationsFound({ onRetry }: EmptyStateProps) {
  return (
    <div
      className="text-center py-12 px-4"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
        <Fuel className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-base mb-1">Geen tankstations gevonden</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-[280px] mx-auto">
        Er zijn geen stations in dit gebied. Probeer een grotere zoekradius.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Opnieuw zoeken
        </Button>
      )}
    </div>
  );
}

/**
 * Location permission denied
 */
export function LocationDenied({ onRequestLocation }: EmptyStateProps) {
  return (
    <div
      className="mx-3 mt-3"
    >
      <Card className="bg-amber-500/10 border-amber-500/30 backdrop-blur-lg">
        <div className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Locate className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-0.5">Locatie niet beschikbaar</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sta locatietoegang toe voor tankstations in jouw buurt. We gebruiken je locatie alleen om 
              dichtstbijzijnde stations te tonen.
            </p>
            {onRequestLocation && (
              <Button 
                size="sm" 
                onClick={onRequestLocation}
                className="mt-3 bg-amber-500 hover:bg-amber-600 text-white h-8 px-3 text-xs font-semibold"
              >
                Locatie toestaan
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * API/Network error (prices unavailable)
 */
export function PricesUnavailable({ onRetry }: EmptyStateProps) {
  return (
    <div
      className="mx-3 mt-3"
    >
      <Card className="bg-red-500/10 border-red-500/30 backdrop-blur-lg">
        <div className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <WifiOff className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-0.5">Prijzen tijdelijk niet beschikbaar</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              De prijsgegevens voor Duitsland zijn momenteel niet bereikbaar. 
              We tonen demo-gegevens tot de service hersteld is.
            </p>
            {onRetry && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onRetry}
                className="mt-3 h-8 px-3 text-xs font-semibold gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Opnieuw proberen
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Loading state for station list
 */
export function StationsLoading() {
  return (
    <div className="text-center py-12">
      <div className="relative mx-auto w-14 h-14 mb-4">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        <div className="relative flex items-center justify-center w-full h-full bg-primary/10 rounded-full">
          <Fuel className="h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Tankstations laden...</p>
    </div>
  );
}

/**
 * Mock mode indicator banner
 */
export function MockModeBanner({ message }: { message?: string | null }) {
  return (
    <div
      className="mx-3 mt-3"
    >
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {message || 'Demo-gegevens – live prijzen volgen zodra beschikbaar'}
        </p>
      </div>
    </div>
  );
}

/**
 * Highway station badge
 */
export function HighwayBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-semibold gap-0.5">
      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
      Snelweg
    </span>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Route,
  Truck,
  Plus,
  Upload,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface TripPreview {
  id: string;
  customer_name: string;
  pickup_city: string | null;
  delivery_city: string | null;
  status: string;
  trip_date: string;
}

interface RouteEmptyStateProps {
  todayTrips: TripPreview[];
  onSelectTrip: (tripId: string) => void;
  onNewRoute: () => void;
  onImport: () => void;
  onFocusTripSelect: () => void;
}

const RouteEmptyState: React.FC<RouteEmptyStateProps> = ({
  todayTrips,
  onSelectTrip,
  onNewRoute,
  onImport,
  onFocusTripSelect,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-4 md:px-6 py-8 bg-gradient-to-b from-muted/20 to-muted/40">
      {/* Main empty state */}
      <div className="text-center max-w-md">
        <div className="relative mx-auto mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg">
            <Route className="h-10 w-10 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <MapPin className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold mb-2">
          Kies een rit of maak een nieuwe route
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          Selecteer een bestaande rit om te optimaliseren, of bouw een nieuwe route vanaf nul
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <Button onClick={onFocusTripSelect} className="gap-2">
            <Truck className="h-4 w-4" />
            Selecteer rit
          </Button>
          <Button variant="outline" onClick={onNewRoute} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe route
          </Button>
          <Button variant="ghost" onClick={onImport} className="gap-2">
            <Upload className="h-4 w-4" />
            Import stops
          </Button>
        </div>
      </div>

      {/* Today's trips quick list */}
      {todayTrips.length > 0 && (
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Geplande ritten vandaag
            </span>
            <Badge variant="secondary" className="ml-auto">
              {todayTrips.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {todayTrips.slice(0, 5).map((trip) => (
              <button
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-card/50 hover:bg-card border border-border/50 hover:border-border transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {trip.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {trip.pickup_city || "–"} → {trip.delivery_city || "–"}
                  </p>
                </div>
                <Badge
                  variant={trip.status === "onderweg" ? "default" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {trip.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>

          {todayTrips.length > 5 && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              +{todayTrips.length - 5} meer ritten vandaag
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteEmptyState;

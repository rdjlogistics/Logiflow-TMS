import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Play,
  CheckCircle,
  Clock,
  ArrowDown,
  Package,
  Truck,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { getEtaMinutesStatusColor } from "@/utils/etaColor";

interface RouteStop {
  id: string;
  stop_order: number;
  stop_type: string;
  address: string;
  postal_code: string | null;
  city: string | null;
  company_name: string | null;
  status: string;
  estimated_arrival: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  eta_minutes?: number;
  distance_from_previous?: number;
}

interface RouteStopsListProps {
  stops: RouteStop[];
  onUpdateStatus: (stopId: string, status: string) => void;
  isLoading?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Wachtend", color: "bg-muted text-muted-foreground", icon: Clock },
  en_route: { label: "Onderweg", color: "bg-blue-500/20 text-blue-600", icon: Truck },
  arrived: { label: "Aangekomen", color: "bg-yellow-500/20 text-yellow-600", icon: MapPin },
  completed: { label: "Voltooid", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  skipped: { label: "Overgeslagen", color: "bg-red-500/20 text-red-600", icon: Clock },
};

const stopTypeConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pickup: { label: "Ophalen", color: "bg-primary", icon: Package },
  delivery: { label: "Afleveren", color: "bg-accent", icon: MapPin },
};

const RouteStopsList: React.FC<RouteStopsListProps> = ({
  stops,
  onUpdateStatus,
  isLoading,
}) => {
  const formatETA = (minutes?: number): string => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}u ${mins}m`;
    }
    return `${mins} min`;
  };

  const formatTimeWindow = (start: string | null, end: string | null): string | null => {
    if (!start && !end) return null;
    const startTime = start ? format(new Date(start), "HH:mm") : "--:--";
    const endTime = end ? format(new Date(end), "HH:mm") : "--:--";
    return `${startTime} - ${endTime}`;
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Route Stops
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 bg-muted/30 rounded-xl animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-48 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stops.length === 0) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Route Stops
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Geen stops gevonden. Klik op "Optimaliseer Route" om stops te genereren.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Route Stops ({stops.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {stops.map((stop, index) => {
            const typeConfig = stopTypeConfig[stop.stop_type] || stopTypeConfig.delivery;
            const status = statusConfig[stop.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const TypeIcon = typeConfig.icon;
            const timeWindow = formatTimeWindow(stop.time_window_start, stop.time_window_end);
            const isLast = index === stops.length - 1;
            const isCompleted = stop.status === "completed";

            return (
              <div key={stop.id} className="relative">
                {/* Connection line */}
                {!isLast && (
                  <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-primary/20" />
                )}

                <div
                  className={`relative flex gap-4 p-4 rounded-xl transition-all ${
                    isCompleted
                      ? "bg-green-500/5 border border-green-500/20"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  {/* Stop number and icon */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                        isCompleted ? "bg-green-500" : typeConfig.color
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5 text-white" />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {stop.stop_order}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stop details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {typeConfig.label}
                          </Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        {stop.company_name && (
                          <p className="font-medium text-sm">{stop.company_name}</p>
                        )}
                        <p className="text-sm text-muted-foreground truncate">
                          {stop.address}
                          {stop.city && `, ${stop.city}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {stop.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateStatus(stop.id, "en_route")}
                            className="h-8"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {stop.status === "en_route" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateStatus(stop.id, "arrived")}
                            className="h-8"
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Aangekomen
                          </Button>
                        )}
                        {stop.status === "arrived" && (
                          <Button
                            size="sm"
                            onClick={() => onUpdateStatus(stop.id, "completed")}
                            className="h-8"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Voltooien
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Time info */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {timeWindow && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Tijdvenster: {timeWindow}
                        </span>
                      )}
                      {stop.eta_minutes !== undefined && (
                        <span className={`flex items-center gap-1 ${getEtaMinutesStatusColor(stop.eta_minutes, stop.time_window_end)}`}>
                          <ArrowDown className="h-3 w-3" />
                          ETA: {formatETA(stop.eta_minutes)}
                        </span>
                      )}
                      {stop.distance_from_previous !== undefined && stop.distance_from_previous > 0 && (
                        <span>
                          {stop.distance_from_previous.toFixed(1)} km van vorige
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteStopsList;

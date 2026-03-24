import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Route,
  Clock,
  Navigation2,
  MapPin,
  Fuel,
  AlertTriangle,
  Sparkles,
  Send,
  Share2,
  RefreshCw,
  Euro,
} from "lucide-react";

interface RouteFloatingStatsProps {
  stopsCount: number;
  totalDistance: number; // km
  totalDuration: number; // minutes
  etaFinal?: string;
  timeWindowViolations?: number;
  costEstimate?: number;
  isOptimized?: boolean;
  isOptimizing?: boolean;
  isReady?: boolean;
  onOptimize: () => void;
  onDispatch?: () => void;
  onShare?: () => void;
  className?: string;
}

const RouteFloatingStats: React.FC<RouteFloatingStatsProps> = ({
  stopsCount,
  totalDistance,
  totalDuration,
  etaFinal,
  timeWindowViolations = 0,
  costEstimate,
  isOptimized = false,
  isOptimizing = false,
  isReady = false,
  onOptimize,
  onDispatch,
  onShare,
  className = "",
}) => {
  const formatDuration = (minutes: number): string => {
    if (!minutes || minutes <= 0) return "0 min";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}u ${mins}m`;
    }
    return `${mins} min`;
  };

  const formatDistance = (km: number): string => {
    if (!km || km <= 0) return "0 km";
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };

  return (
    <div
      className={`bg-background/95 backdrop-blur-md border border-border/50 rounded-xl shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Route Stats</span>
        </div>
        {isOptimized && (
          <Badge variant="success" className="text-xs">
            Geoptimaliseerd
          </Badge>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stops</p>
            <p className="font-semibold text-sm">{stopsCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Navigation2 className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Afstand</p>
            <p className="font-semibold text-sm">{formatDistance(totalDistance)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rijtijd</p>
            <p className="font-semibold text-sm">{formatDuration(totalDuration)}</p>
          </div>
        </div>

        {etaFinal && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ETA final</p>
              <p className="font-semibold text-sm">{etaFinal}</p>
            </div>
          </div>
        )}

        {timeWindowViolations > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Violations</p>
              <p className="font-semibold text-sm text-red-500">{timeWindowViolations}</p>
            </div>
          </div>
        )}

        {costEstimate !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Euro className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kosten</p>
              <p className="font-semibold text-sm">€{costEstimate.toFixed(0)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 pt-0">
        <Button
          onClick={onOptimize}
          disabled={isOptimizing || stopsCount < 2}
          className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary-foreground/90 hover:opacity-90"
          size="sm"
        >
          {isOptimizing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Optimaliseren
        </Button>

        {isReady && onDispatch && (
          <Button
            onClick={onDispatch}
            variant="default"
            className="flex-1 gap-2"
            size="sm"
          >
            <Send className="h-4 w-4" />
            Dispatch
          </Button>
        )}

        {onShare && (
          <Button onClick={onShare} variant="ghost" size="icon" className="shrink-0">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default RouteFloatingStats;

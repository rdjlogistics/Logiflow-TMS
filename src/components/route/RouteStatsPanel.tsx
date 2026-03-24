import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Route, 
  Clock, 
  Navigation2, 
  Fuel, 
  TrendingUp,
  MapPin,
  Truck
} from "lucide-react";

interface RouteStats {
  totalDistance: number; // in km
  totalDuration: number; // in minutes
  estimatedFuel: number; // in liters
  numberOfStops: number;
  avgSpeedKmh: number;
}

interface RouteStatsPanelProps {
  stats: RouteStats | null;
  isLoading?: boolean;
}

const RouteStatsPanel: React.FC<RouteStatsPanelProps> = ({ stats, isLoading }) => {
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}u ${mins}m`;
    }
    return `${mins} min`;
  };

  const formatDistance = (km: number): string => {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };

  if (isLoading) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Route Statistieken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 animate-pulse">
                <div className="h-4 w-12 bg-muted rounded mb-2" />
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Route Statistieken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecteer een rit om statistieken te bekijken
          </p>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      icon: Navigation2,
      label: "Afstand",
      value: formatDistance(stats.totalDistance),
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Clock,
      label: "Rijtijd",
      value: formatDuration(stats.totalDuration),
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: MapPin,
      label: "Stops",
      value: stats.numberOfStops.toString(),
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: TrendingUp,
      label: "Gem. snelheid",
      value: `${Math.round(stats.avgSpeedKmh)} km/u`,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Fuel,
      label: "Brandstof (est.)",
      value: `${stats.estimatedFuel.toFixed(1)} L`,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: Truck,
      label: "CO₂ (est.)",
      value: `${(stats.estimatedFuel * 2.68).toFixed(1)} kg`,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          Route Statistieken
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className={`${item.bgColor} rounded-lg p-3 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className="text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteStatsPanel;

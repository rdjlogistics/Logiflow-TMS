import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import {
  Navigation,
  MapPin,
  Gauge,
  Clock,
  AlertCircle,
  Power,
  PowerOff,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface DriverTrackingPanelProps {
  tripId: string;
  className?: string;
}

const DriverTrackingPanel: React.FC<DriverTrackingPanelProps> = ({
  tripId,
  className = "",
}) => {
  const { isTracking, currentLocation, error, startTracking, stopTracking } =
    useDriverLocation(tripId);

  return (
    <Card variant="glass" className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            GPS Tracking
          </CardTitle>
          <Badge
            variant={isTracking ? "default" : "secondary"}
            className={isTracking ? "bg-green-500" : ""}
          >
            {isTracking ? "Actief" : "Inactief"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {currentLocation ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Coördinaten</p>
                <p className="text-sm font-medium">
                  {currentLocation.latitude.toFixed(5)},{" "}
                  {currentLocation.longitude.toFixed(5)}
                </p>
              </div>
            </div>

            {currentLocation.speed !== null && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Snelheid</p>
                  <p className="text-sm font-medium">
                    {Math.round(currentLocation.speed * 3.6)} km/u
                  </p>
                </div>
              </div>
            )}

            {currentLocation.heading !== null && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Richting</p>
                  <p className="text-sm font-medium">
                    {Math.round(currentLocation.heading)}°
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Laatste update</p>
                <p className="text-sm font-medium">
                  {format(new Date(currentLocation.recorded_at), "HH:mm:ss", {
                    locale: nl,
                  })}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Navigation className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Start tracking om je locatie te delen</p>
          </div>
        )}

        <Button
          onClick={isTracking ? stopTracking : startTracking}
          className="w-full"
          variant={isTracking ? "destructive" : "default"}
        >
          {isTracking ? (
            <>
              <PowerOff className="mr-2 h-4 w-4" />
              Stop Tracking
            </>
          ) : (
            <>
              <Power className="mr-2 h-4 w-4" />
              Start Tracking
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DriverTrackingPanel;

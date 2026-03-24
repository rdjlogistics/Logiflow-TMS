import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import TrackingMap from "@/components/tracking/TrackingMap";
import { GPSQualityIndicator } from "@/components/tracking/GPSQualityIndicator";
import { useRealtimeDriverLocation } from "@/hooks/useRealtimeDriverLocation";
import { useLiveETA } from "@/hooks/useLiveETA";
import { ETADisplay } from "@/components/tracking/ETADisplay";
import {
  MapPin,
  Search,
  Eye,
  Copy,
  Link,
  Truck,
  Navigation,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Trip {
  id: string;
  trip_date: string;
  pickup_address: string;
  pickup_city: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_address: string;
  delivery_city: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  status: string;
  customer: { id: string; company_name: string } | null;
  vehicle: { license_plate: string; brand: string; model: string } | null;
}

interface TrackingToken {
  id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted/30 text-muted-foreground",
  aanvraag: "bg-amber-500/20 text-amber-600",
  gepland: "bg-blue-500/20 text-blue-600",
  geladen: "bg-orange-500/20 text-orange-600",
  onderweg: "bg-yellow-500/20 text-yellow-600",
  afgeleverd: "bg-green-500/20 text-green-600",
  afgerond: "bg-emerald-500/20 text-emerald-600",
  gecontroleerd: "bg-purple-500/20 text-purple-600",
  gefactureerd: "bg-gray-500/20 text-gray-600",
  geannuleerd: "bg-red-500/20 text-red-600",
};

const InternalTrackTrace = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showMapDialog, setShowMapDialog] = useState(false);

  // Fetch active trips
  const { data: trips, isLoading } = useQuery({
    queryKey: ["active-trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          *,
          customer:customers(id, company_name),
          vehicle:vehicles(license_plate, brand, model)
        `
        )
        .in("status", ["gepland", "onderweg"])
        .order("trip_date", { ascending: true });

      if (error) throw error;
      return data as Trip[];
    },
  });

  // Get driver location for selected trip
  const { location: driverLocation } = useRealtimeDriverLocation(selectedTrip?.id);

  // Live ETA for selected trip
  const internalDestination = selectedTrip?.delivery_latitude && selectedTrip?.delivery_longitude
    ? { lat: selectedTrip.delivery_latitude, lng: selectedTrip.delivery_longitude }
    : null;
  const { etaMinutes: liveEtaMinutes, routeDistanceKm, isCalculating: etaCalculating } = useLiveETA(
    driverLocation, internalDestination
  );

  // Fetch or create tracking token
  const getTrackingToken = async (tripId: string, customerId: string) => {
    // Check for existing token
    let { data: existingToken } = await supabase
      .from("tracking_tokens")
      .select("*")
      .eq("trip_id", tripId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingToken) {
      return existingToken as TrackingToken;
    }

    // Create new token
    const { data: newToken, error } = await supabase
      .from("tracking_tokens")
      .insert({
        trip_id: tripId,
        customer_id: customerId,
      })
      .select()
      .single();

    if (error) throw error;
    return newToken as TrackingToken;
  };

  // Copy tracking link
  const copyTrackingLink = async (trip: Trip) => {
    if (!trip.customer?.id) {
      toast({
        title: "Fout",
        description: "Geen klant gekoppeld aan deze rit",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = await getTrackingToken(trip.id, trip.customer.id);
      const trackingUrl = `${window.location.origin}/track?token=${token.token}`;
      
      await navigator.clipboard.writeText(trackingUrl);
      toast({
        title: "Link gekopieerd",
        description: "De tracking link is naar je klembord gekopieerd",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter trips
  const filteredTrips = trips?.filter(
    (trip) =>
      trip.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.delivery_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.pickup_city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // View trip on map
  const viewOnMap = (trip: Trip) => {
    setSelectedTrip(trip);
    setShowMapDialog(true);
  };

  return (
    <DashboardLayout title="Track & Trace">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actieve Ritten</p>
                  <p className="text-2xl font-bold">{trips?.length || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Onderweg</p>
                  <p className="text-2xl font-bold">
                    {trips?.filter((t) => t.status === "onderweg").length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Navigation className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gepland</p>
                  <p className="text-2xl font-bold">
                    {trips?.filter((t) => t.status === "gepland").length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="stat">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Geladen</p>
                  <p className="text-2xl font-bold">
                    {trips?.filter((t) => t.status === "geladen").length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op klant of locatie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Trips table */}
        <Card variant="premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Actieve Zendingen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Van</TableHead>
                    <TableHead>Naar</TableHead>
                    <TableHead>Voertuig</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredTrips?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Geen actieve ritten gevonden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrips?.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell>
                          {format(new Date(trip.trip_date), "d MMM yyyy", {
                            locale: nl,
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {trip.customer?.company_name || "-"}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {trip.pickup_city || trip.pickup_address}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {trip.delivery_city || trip.delivery_address}
                          </span>
                        </TableCell>
                        <TableCell>
                          {trip.vehicle ? (
                            <span className="text-sm">
                              {trip.vehicle.license_plate}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[trip.status]}>
                            {trip.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewOnMap(trip)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyTrackingLink(trip)}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Map dialog */}
        <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {selectedTrip?.customer?.company_name || "Rit"} -{" "}
                {selectedTrip?.delivery_city || selectedTrip?.delivery_address}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <TrackingMap
                driverLocation={
                  driverLocation
                    ? {
                        latitude: driverLocation.latitude,
                        longitude: driverLocation.longitude,
                        heading: driverLocation.heading || undefined,
                        speed: driverLocation.speed || undefined,
                      }
                    : undefined
                }
                deliveryLocation={
                  selectedTrip?.delivery_latitude &&
                  selectedTrip?.delivery_longitude
                    ? {
                        latitude: selectedTrip.delivery_latitude,
                        longitude: selectedTrip.delivery_longitude,
                        address: selectedTrip.delivery_address,
                      }
                    : undefined
                }
                pickupLocation={
                  selectedTrip?.pickup_latitude && selectedTrip?.pickup_longitude
                    ? {
                        latitude: selectedTrip.pickup_latitude,
                        longitude: selectedTrip.pickup_longitude,
                        address: selectedTrip.pickup_address,
                      }
                    : undefined
                }
                showDriverMarker={true}
                showRoute={true}
                className="h-[400px]"
              />

              {/* GPS Quality Indicator */}
              {driverLocation && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">GPS Status:</span>
                    <GPSQualityIndicator
                      accuracy={driverLocation.accuracy}
                      lastUpdate={driverLocation.recorded_at}
                    />
                  </div>
                  {driverLocation.speed !== null && driverLocation.speed > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {Math.round(driverLocation.speed * 3.6)} km/u
                    </span>
                  )}
                </div>
              )}

              {/* Live ETA */}
              {liveEtaMinutes != null && (
                <ETADisplay
                  distanceKm={routeDistanceKm}
                  liveEtaMinutes={liveEtaMinutes}
                  routeDistanceKm={routeDistanceKm}
                  isCalculating={etaCalculating}
                />
              )}

              {/* Trip info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Ophalen</p>
                  <p className="font-medium">{selectedTrip?.pickup_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrip?.pickup_city}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Afleveren</p>
                  <p className="font-medium">{selectedTrip?.delivery_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrip?.delivery_city}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Badge className={statusColors[selectedTrip?.status || "gepland"]}>
                  {selectedTrip?.status}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => selectedTrip && copyTrackingLink(selectedTrip)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Kopieer klant-link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default InternalTrackTrace;

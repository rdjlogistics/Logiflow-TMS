import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  Check, 
  X, 
  Eye,
  Truck,
  Package,
  Calendar,
  Route,
  Clock,
  ThumbsUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FreightMatch, useUpdateMatchStatus } from "@/hooks/useFreightMarketplace";
import { useToast } from "@/hooks/use-toast";

interface MatchCardProps {
  match: FreightMatch;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  suggested: { label: "Gesuggereerd", color: "bg-purple-500/10 text-purple-600", icon: Sparkles },
  viewed: { label: "Bekeken", color: "bg-blue-500/10 text-blue-600", icon: Eye },
  interested: { label: "Geïnteresseerd", color: "bg-amber-500/10 text-amber-600", icon: ThumbsUp },
  accepted: { label: "Geaccepteerd", color: "bg-green-500/10 text-green-600", icon: Check },
  rejected: { label: "Afgewezen", color: "bg-red-500/10 text-red-600", icon: X },
};

export function MatchCard({ match }: MatchCardProps) {
  const { toast } = useToast();
  const updateMatchStatus = useUpdateMatchStatus();

  const capacityListing = match.capacity_listing;
  const loadListing = match.load_listing;

  if (!capacityListing || !loadListing) {
    return null;
  }

  const status = statusConfig[match.status] || statusConfig.suggested;
  const StatusIcon = status.icon;

  const handleAccept = async () => {
    await updateMatchStatus.mutateAsync({ id: match.id, status: "interested" });
  };

  const handleReject = async () => {
    await updateMatchStatus.mutateAsync({ id: match.id, status: "rejected" });
    toast({
      title: "Match afgewezen",
      description: "Deze match wordt niet meer getoond.",
    });
  };

  const handleView = () => {
    if (match.status === "suggested") {
      updateMatchStatus.mutate({ id: match.id, status: "viewed" });
    }
    toast({
      title: "Match details",
      description: "Details worden geladen...",
    });
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Match Score */}
          <div className="w-full lg:w-32 p-4 bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-border/50">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center border-4 border-primary">
                <span className="text-2xl font-bold text-primary">{match.match_score}</span>
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">AI Score</p>
          </div>

          {/* Match Details */}
          <div className="flex-1 p-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={status.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                {match.detour_km !== null && (
                  <Badge variant="outline" className="bg-muted/50">
                    <Route className="h-3 w-3 mr-1" />
                    {Math.round(match.detour_km)} km omweg
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(match.created_at), "d MMM HH:mm", { locale: nl })}
              </p>
            </div>

            {/* Two Listings Side by Side */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Capacity Listing */}
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Capaciteit</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3 text-green-500" />
                  <span className="truncate">{capacityListing.origin_city}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <MapPin className="h-3 w-3 text-red-500" />
                  <span className="truncate">{capacityListing.destination_city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(capacityListing.pickup_date), "d MMM", { locale: nl })}
                  {capacityListing.vehicle_type && (
                    <>
                      <span>•</span>
                      {capacityListing.vehicle_type}
                    </>
                  )}
                </div>
              </div>

              {/* Load Listing */}
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Lading</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3 text-green-500" />
                  <span className="truncate">{loadListing.origin_city}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <MapPin className="h-3 w-3 text-red-500" />
                  <span className="truncate">{loadListing.destination_city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(loadListing.pickup_date), "d MMM", { locale: nl })}
                  {loadListing.weight_kg && (
                    <>
                      <span>•</span>
                      {loadListing.weight_kg.toLocaleString()} kg
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* AI Reasons */}
            {match.match_reasons && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">AI Analyse</p>
                <div className="flex flex-wrap gap-2">
                  {match.match_reasons.route_overlap && (
                    <Badge variant="secondary" className="text-xs">
                      <Route className="h-3 w-3 mr-1" />
                      {match.match_reasons.route_overlap}
                    </Badge>
                  )}
                  {match.match_reasons.time_match && (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {match.match_reasons.time_match}
                    </Badge>
                  )}
                  {match.match_reasons.vehicle_match && (
                    <Badge variant="secondary" className="text-xs">
                      <Truck className="h-3 w-3 mr-1" />
                      {match.match_reasons.vehicle_match}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {match.status !== "accepted" && match.status !== "rejected" && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={handleView}
                >
                  <Eye className="h-3 w-3" />
                  Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleReject}
                >
                  <X className="h-3 w-3" />
                  Afwijzen
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={handleAccept}
                >
                  <ThumbsUp className="h-3 w-3" />
                  Interesse
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

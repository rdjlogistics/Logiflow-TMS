import React from "react";
import { useNavigate } from "react-router-dom";
import { BackhaulSuggestion } from "@/hooks/useBackhaulSuggestions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PackageCheck,
  MapPin,
  ChevronDown,
  ExternalLink,
  UserPlus,
  Loader2,
  PackageX,
  Clock,
  Truck,
} from "lucide-react";

interface BackhaulSuggestionsPanelProps {
  suggestions: BackhaulSuggestion[];
  loading: boolean;
  currentDriverId: string | null;
  onAssignDriver: (tripId: string, driverId: string) => Promise<void>;
  onRefetch: () => void;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (score >= 50) return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border/30";
};

const BackhaulSuggestionsPanel: React.FC<BackhaulSuggestionsPanelProps> = ({
  suggestions,
  loading,
  currentDriverId,
  onAssignDriver,
  onRefetch,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assigningId, setAssigningId] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(true);

  const handleAssign = async (tripId: string) => {
    if (!currentDriverId) {
      toast({
        title: "Geen chauffeur gekoppeld",
        description: "De geselecteerde rit heeft geen chauffeur om toe te wijzen.",
        variant: "destructive",
      });
      return;
    }
    setAssigningId(tripId);
    try {
      await onAssignDriver(tripId, currentDriverId);
      toast({
        title: "Chauffeur toegewezen",
        description: "De retourvracht is toegewezen aan dezelfde chauffeur.",
      });
      onRefetch();
    } catch {
      toast({
        title: "Toewijzing mislukt",
        description: "Er is een fout opgetreden bij het toewijzen.",
        variant: "destructive",
      });
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full px-3 py-2.5 bg-card/60 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Retourvracht</span>
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {suggestions.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs">Zoeken naar retourvracht...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <PackageX className="h-6 w-6 mb-2 opacity-50" />
            <p className="text-xs">Geen retourvracht beschikbaar in de buurt</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <div
                  key={s.trip_id}
                  className="p-2.5 rounded-lg border border-border/20 bg-card/40 hover:bg-muted/20 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium truncate max-w-[140px]">{s.customer_name}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getScoreColor(s.match_score)}`}>
                      {s.match_score}%
                    </Badge>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-1 text-[11px] mb-1.5">
                    <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-[80px]">{s.pickup_city}</span>
                    <span className="text-muted-foreground/50 mx-0.5">→</span>
                    <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="truncate max-w-[80px]">{s.delivery_city}</span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                    <span className="flex items-center gap-0.5">
                      <Truck className="h-2.5 w-2.5" />
                      {s.distance_from_current_km} km
                    </span>
                    {s.time_window && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {s.time_window}
                      </span>
                    )}
                    {s.cargo_description && (
                      <span className="truncate max-w-[80px]">{s.cargo_description}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 gap-1"
                      onClick={() => navigate(`/trips?id=${s.trip_id}`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Bekijk
                    </Button>
                    {currentDriverId && !s.driver_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2 gap-1"
                        disabled={assigningId === s.trip_id}
                        onClick={() => handleAssign(s.trip_id)}
                      >
                        {assigningId === s.trip_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UserPlus className="h-3 w-3" />
                        )}
                        Toewijzen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default BackhaulSuggestionsPanel;

import { AlertTriangle, Info, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { TollDetectionResult, TollCostEstimate } from "@/hooks/useTollDetection";

interface TollIndicatorProps {
  tollResult: TollDetectionResult | null;
  isDetecting?: boolean;
  compact?: boolean;
}

const TollTypeLabel: Record<string, string> = {
  vignette: "Vignet",
  per_km: "Per km",
  per_section: "Per traject",
  hybrid: "Gemengd",
};

export function TollIndicator({ tollResult, isDetecting, compact = false }: TollIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isDetecting) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
        <MapPin className="h-3 w-3" />
        <span>Tolwegen detecteren...</span>
      </div>
    );
  }

  if (!tollResult) {
    return null;
  }

  if (!tollResult.hasTolls) {
    if (compact) return null;
    
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3 w-3 text-success" />
        <span>Geen tolwegen op route</span>
      </div>
    );
  }

  const { totalEstimatedCost, countriesWithToll } = tollResult;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/30">
              <AlertTriangle className="h-3 w-3" />
              €{totalEstimatedCost.min.toFixed(0)} - €{totalEstimatedCost.max.toFixed(0)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Geschatte tolkosten</p>
              {countriesWithToll.map((country) => (
                <div key={country.countryCode} className="text-xs">
                  {country.country}: €{country.estimatedCost.min.toFixed(2)} - €{country.estimatedCost.max.toFixed(2)}
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-1">
                Indicatief — kan afwijken van definitieve afrekening
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-sm">Tolwegen gedetecteerd</span>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                €{totalEstimatedCost.min.toFixed(2)} - €{totalEstimatedCost.max.toFixed(2)}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 pt-2">
          {countriesWithToll.map((country) => (
            <TollCountryRow key={country.countryCode} country={country} />
          ))}
          
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Indicatieve tolkosten — kan afwijken van definitieve afrekening
          </p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TollCountryRow({ country }: { country: TollCostEstimate }) {
  return (
    <div className="flex items-start justify-between text-sm">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{country.country}</span>
          <Badge variant="secondary" className="text-xs">
            {TollTypeLabel[country.tollType] || country.tollType}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {country.distanceInCountry} km • {country.notes.join(' • ')}
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">
          €{country.estimatedCost.min.toFixed(2)} - €{country.estimatedCost.max.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

export default TollIndicator;

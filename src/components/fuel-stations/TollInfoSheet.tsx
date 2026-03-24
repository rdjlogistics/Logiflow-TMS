import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Route, Info, ExternalLink, Truck, Car, AlertCircle } from "lucide-react";
import type { TollCountryInfo } from "@/services/toll/types";

interface TollInfoSheetProps {
  tollInfo: TollCountryInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tollTypeLabels: Record<string, string> = {
  vignette: "Vignet",
  per_km: "Per kilometer",
  per_section: "Per traject",
  hybrid: "Hybride",
};

export function TollInfoSheet({ tollInfo, open, onOpenChange }: TollInfoSheetProps) {
  if (!tollInfo) return null;

  const primaryTollType = tollInfo.tollTypes[0] || "unknown";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10">
              <Route className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <SheetTitle className="text-xl">{tollInfo.countryName}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 flex-wrap">
                Tolinformatie
                {tollInfo.tollTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-[10px]">
                    {tollTypeLabels[type] || type}
                  </Badge>
                ))}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-safe">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Indicatieve informatie
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                Tarieven kunnen afwijken. Controleer altijd de actuele kosten bij de officiële autoriteit.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Beschrijving</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tollInfo.summary}
            </p>
          </div>

          <Separator />

          {/* Requirements */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Vereisten</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Vignet</span>
                </div>
                <p className="text-sm font-bold">
                  {tollInfo.vignetteRequired ? "Verplicht" : "Niet nodig"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Vrachtwagentol</span>
                </div>
                <p className="text-sm font-bold">
                  {tollInfo.truckTollRequired ? "Verplicht" : "Niet nodig"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Operators */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Toloperators</h4>
            <div className="flex flex-wrap gap-2">
              {tollInfo.operators.map((operator) => (
                <Badge key={operator} variant="outline" className="text-xs">
                  {operator}
                </Badge>
              ))}
            </div>
          </div>

          {/* Payment methods */}
          {tollInfo.paymentMethods.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-3">Betaalmethoden</h4>
                <div className="flex flex-wrap gap-2">
                  {tollInfo.paymentMethods.map((method) => (
                    <Badge key={method} variant="secondary" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Source */}
          {tollInfo.sourceUrl && (
            <>
              <Separator />
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Officiële bron</p>
                  <a
                    href={tollInfo.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  >
                    Meer informatie
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

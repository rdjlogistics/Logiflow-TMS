import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Star, Euro, CheckCircle } from "lucide-react";
import { vergelijkCarriers, type CarrierTarief, type CarrierQuote } from "@/lib/carrierRateEngine";
import { useToast } from "@/hooks/use-toast";

interface CarrierCompareWidgetProps {
  afstand_km: number;
  geschatte_uren?: number;
  onToewijzen?: (carrierId: string, carrierNaam: string) => void;
}

const CarrierCompareWidget: React.FC<CarrierCompareWidgetProps> = ({
  afstand_km,
  geschatte_uren,
  onToewijzen,
}) => {
  const { toast } = useToast();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["carrier-compare", afstand_km, geschatte_uren],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carriers")
        .select("id, company_name, rating, tarief_per_km, tarief_per_uur, tarief_vast, beschikbaar")
        .is("deleted_at", null)
        .eq("is_active", true);

      if (error) throw error;

      const tarieven: CarrierTarief[] = (data || []).map((c: any) => ({
        id: c.id,
        naam: c.company_name,
        tarief_per_km: c.tarief_per_km ?? undefined,
        tarief_per_uur: c.tarief_per_uur ?? undefined,
        tarief_vast: c.tarief_vast ?? undefined,
        rating: c.rating ?? undefined,
        beschikbaar: c.beschikbaar !== false,
      }));

      return vergelijkCarriers(tarieven, { afstand_km, geschatte_uren });
    },
    enabled: afstand_km > 0,
  });

  const top3 = quotes.slice(0, 3);

  // Label per positie
  const labels = [
    { label: "Goedkoopste", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    { label: "Snelste", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    { label: "Beste beoordeling", color: "bg-violet-500/10 text-violet-600 border-violet-500/30" },
  ];

  // Sort second entry by rating for "Snelste" label display
  const displayQuotes: (CarrierQuote & { displayLabel: string; labelColor: string })[] = top3.map(
    (q, i) => ({
      ...q,
      displayLabel: labels[i]?.label ?? "",
      labelColor: labels[i]?.color ?? "",
    })
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
           <Truck className="h-4 w-4" /> Charter vergelijker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-4 text-center">Tarieven berekenen...</div>
        </CardContent>
      </Card>
    );
  }

  if (displayQuotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4" /> Charter vergelijker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-4 text-center">
            Geen charters met tarieven beschikbaar voor {afstand_km} km.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" /> Top charters voor {afstand_km} km
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayQuotes.map((quote, idx) => (
          <div
            key={quote.carrier_id}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-3 gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{quote.carrier_naam}</span>
                <Badge
                  variant="outline"
                  className={`text-xs px-1.5 py-0 ${quote.labelColor}`}
                >
                  {quote.displayLabel}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{quote.berekenings_methode}</div>
              {quote.rating && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs text-muted-foreground">{quote.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="text-base font-bold text-emerald-600">
                €{quote.prijs.toFixed(2)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  onToewijzen?.(quote.carrier_id, quote.carrier_naam);
                  toast({ title: `${quote.carrier_naam} toegewezen` });
                }}
              >
                <CheckCircle className="h-3 w-3" /> Toewijzen
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CarrierCompareWidget;

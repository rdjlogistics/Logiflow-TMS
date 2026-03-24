import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { berekenAanbevolenPrijs, NL_MARKT_BENCHMARKS } from "@/lib/pricingEngine";

interface PricingAdviceWidgetProps {
  afstand_km: number;
  gewicht_kg: number;
  urgentie?: 'normaal' | 'spoed' | 'flex';
  datum?: Date;
  currentPrice?: number;
}

function PriceColorIndicator({ current, min, aanbevolen }: { current: number; min: number; aanbevolen: number }) {
  if (current < min) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Onder minimumprijs
      </span>
    );
  }
  if (current < aanbevolen) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Onder aanbevolen prijs
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      Prijs OK
    </span>
  );
}

const PricingAdviceWidget = ({
  afstand_km,
  gewicht_kg,
  urgentie = 'normaal',
  datum,
  currentPrice,
}: PricingAdviceWidgetProps) => {
  const [onderbouwingOpen, setOnderbouwingOpen] = useState(false);

  const advies = useMemo(() => {
    return berekenAanbevolenPrijs({
      afstand_km,
      gewicht_kg,
      urgentie,
      datum: datum ?? new Date(),
    });
  }, [afstand_km, gewicht_kg, urgentie, datum]);

  return (
    <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold">AI Prijsadvies</span>
        {currentPrice !== undefined && currentPrice > 0 && (
          <div className="ml-auto">
            <PriceColorIndicator
              current={currentPrice}
              min={advies.minimum_prijs}
              aanbevolen={advies.aanbevolen_prijs}
            />
          </div>
        )}
      </div>

      {/* Price range */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Minimum</p>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">
            €{advies.minimum_prijs.toFixed(2)}
          </p>
        </div>
        <div className="space-y-0.5 rounded-lg bg-primary/5 border border-primary/20 py-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aanbevolen</p>
          <p className="text-base font-bold text-primary tabular-nums">
            €{advies.aanbevolen_prijs.toFixed(2)}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Maximum</p>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            €{advies.maximum_prijs.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Marge indicator */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>Verwachte marge</span>
        <span className="font-medium text-foreground">{advies.marge_pct}%</span>
      </div>

      {/* Collapsible onderbouwing */}
      <div className="border-t border-border/50 pt-2">
        <button
          type="button"
          onClick={() => setOnderbouwingOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Onderbouwing</span>
          {onderbouwingOpen ? (
            <ChevronUp className="h-3.5 w-3.5 ml-auto" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 ml-auto" />
          )}
        </button>

        {onderbouwingOpen && (
          <ul className="mt-2 space-y-1 pl-5 list-disc text-xs text-muted-foreground">
            {advies.onderbouwing.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Market benchmark footer */}
      <div className={cn(
        "text-[10px] text-muted-foreground/70 pt-1 border-t border-border/40",
        "flex items-center gap-1"
      )}>
        <span>NL marktgemiddelde: €{NL_MARKT_BENCHMARKS.gemiddeld_per_km.toFixed(2)}/km</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          ({NL_MARKT_BENCHMARKS.index_label})
        </span>
      </div>
    </div>
  );
};

export default PricingAdviceWidget;

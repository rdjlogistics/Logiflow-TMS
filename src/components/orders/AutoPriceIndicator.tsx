import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutoPriceResult } from "@/hooks/useAutoPrice";

interface AutoPriceIndicatorProps {
  result: AutoPriceResult | null;
  isCalculating: boolean;
  onApply: () => void;
  onDismiss: () => void;
  isApplied: boolean;
  className?: string;
}

const AutoPriceIndicator = ({
  result,
  isCalculating,
  onApply,
  onDismiss,
  isApplied,
  className,
}: AutoPriceIndicatorProps) => {
  if (!isCalculating && !result) return null;

  return (
    
      <motion.div
        key={isCalculating ? 'loading' : result?.calculated ? 'result' : 'warning'}
        initial={{ opacity: 0, height: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className={cn("overflow-hidden", className)}
      >
        {isCalculating ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Contract-tarieven worden berekend…</span>
          </div>
        ) : result?.calculated ? (
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/20">
                  <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {isApplied ? 'Contractprijs toegepast' : 'Automatisch berekend'}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  {result.contractName}
                </Badge>
              </div>
              {!isApplied && (
                <button onClick={onDismiss} className="p-1 rounded-md hover:bg-muted/50 transition-colors">
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Breakdown */}
            <div className="px-3 py-2 space-y-1">
              {result.breakdown.map((line, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="tabular-nums font-medium">€{line.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-emerald-500/20">
                <span>Totaal</span>
                <span className="tabular-nums text-emerald-700 dark:text-emerald-300">€{result.sellPrice.toFixed(2)}</span>
              </div>
              {result.laneName && (
                <div className="text-[10px] text-muted-foreground/70 pt-0.5">
                  Lane: {result.laneName}
                </div>
              )}
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="px-3 pb-2 space-y-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {!isApplied && (
              <div className="flex gap-2 px-3 pb-3">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={onApply}
                >
                  <Check className="h-3 w-3" /> Toepassen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={onDismiss}
                >
                  Handmatig
                </Button>
              </div>
            )}
          </div>
        ) : result ? (
          /* Warnings only (no calculation) */
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {result.warnings.map((w, i) => (
                <div key={i} className="text-amber-700 dark:text-amber-400">{w}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    
  );
};

export default AutoPriceIndicator;

import React from 'react';
import { ArrowRight, Clock, Fuel, MapPin, Route, Shield, TrendingUp, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TollDetectionResult } from '@/hooks/useTollDetection';

export interface TollFreeAlternative {
  totalDistance: number; // km
  totalDuration: number; // minutes
  tollResult: TollDetectionResult | null;
  geometry?: GeoJSON.LineString;
}

interface TollComparisonPanelProps {
  currentToll: TollDetectionResult;
  currentDistance: number;
  currentDuration: number;
  tollFreeAlt: TollFreeAlternative | null;
  isLoadingAlt: boolean;
  vehicleType: string;
  onChooseTollFree: () => void;
}

const VEHICLE_LABELS: Record<string, string> = {
  truck: 'Vrachtwagen', van: 'Bestelbus', car: 'Personenauto',
};

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}u ${m}m` : `${m}m`;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const TollComparisonPanel: React.FC<TollComparisonPanelProps> = ({
  currentToll,
  currentDistance,
  currentDuration,
  tollFreeAlt,
  isLoadingAlt,
  vehicleType,
  onChooseTollFree,
}) => {
  if (!currentToll.hasTolls) return null;

  const tollCostMin = currentToll.totalEstimatedCost.min;
  const tollCostMax = currentToll.totalEstimatedCost.max;

  const altDistance = tollFreeAlt?.totalDistance ?? 0;
  const altDuration = tollFreeAlt?.totalDuration ?? 0;
  const extraDistance = altDistance - currentDistance;
  const extraDuration = altDuration - currentDuration;

  // Estimated fuel cost difference (avg 0.30 €/km for trucks)
  const fuelRatePerKm = vehicleType === 'truck' ? 0.30 : vehicleType === 'van' ? 0.18 : 0.10;
  const extraFuelCost = extraDistance * fuelRatePerKm;

  // Net savings: toll cost saved minus extra fuel cost
  const netSavingsMin = tollCostMin - extraFuelCost;
  const netSavingsMax = tollCostMax - extraFuelCost;

  return (
    <div
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Route Vergelijking</h3>
          <Badge variant="outline" className="text-[10px]">
            {VEHICLE_LABELS[vehicleType] || vehicleType}
          </Badge>
        </div>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Current route (with tolls) */}
        <div
          className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 backdrop-blur-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Route className="h-3.5 w-3.5 text-amber-500" />
              Huidige route
            </h4>
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0">
              Met tol
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Afstand
              </span>
              <span className="font-medium">{currentDistance.toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Reistijd
              </span>
              <span className="font-medium">{formatDuration(currentDuration)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                💰 Tolkosten
              </span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                €{tollCostMin.toFixed(2)} – €{tollCostMax.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            {currentToll.countriesWithToll.map(c => c.country).join(', ')}
          </div>
        </div>

        {/* Toll-free alternative */}
        <div
          className={`rounded-xl border backdrop-blur-xl p-4 space-y-3 ${
            isLoadingAlt
              ? 'border-border/30 bg-card/50'
              : 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5'
          }`}
        >
          {isLoadingAlt ? (
            <div className="flex items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <div>
                <p className="text-sm font-medium">Tolvrije route berekenen...</p>
                <p className="text-[10px] text-muted-foreground">Alternatief zoeken via Mapbox</p>
              </div>
            </div>
          ) : tollFreeAlt ? (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  Tolvrije route
                </h4>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0">
                  Geen tol
                </Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Afstand
                  </span>
                  <span className="font-medium">
                    {altDistance.toFixed(1)} km
                    {extraDistance > 0 && (
                      <span className="text-[10px] text-red-500 ml-1">+{extraDistance.toFixed(1)}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Reistijd
                  </span>
                  <span className="font-medium">
                    {formatDuration(altDuration)}
                    {extraDuration > 0 && (
                      <span className="text-[10px] text-red-500 ml-1">+{formatDuration(extraDuration)}</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    💰 Tolkosten
                  </span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">€0,00</span>
                </div>
                {extraDistance > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Fuel className="h-3 w-3" /> Extra brandstof
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      +€{extraFuelCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Net savings summary */}
              {netSavingsMax > 0 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Netto besparing tolvrij</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    €{Math.max(0, netSavingsMin).toFixed(2)} – €{netSavingsMax.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <Button
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={onChooseTollFree}
                >
                  <Check className="h-3 w-3 mr-1.5" />
                  Tolvrije route kiezen
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 py-6 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <p className="text-sm">Geen tolvrij alternatief beschikbaar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TollComparisonPanel;

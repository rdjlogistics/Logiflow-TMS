import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  Clock, 
  Route, 
  Euro,
  Calculator,
  TrendingUp,
  Gauge,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { format, getISOWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface TripWithRate {
  id: string;
  order_number: string;
  pickup_city: string;
  delivery_city: string;
  trip_date: string;
  purchase_total: number;
  distance_km?: number | null;
  carrier_rate_type?: string | null;
  carrier_hourly_rate?: number | null;
  carrier_km_rate?: number | null;
  carrier_worked_hours?: number | null;
  travel_hours?: number | null;
}

interface TripRateBreakdownProps {
  trips: TripWithRate[];
  carrierName: string;
  subtotal: number;
  formatCurrency: (amount: number) => string;
}

// Premium animation variants
const expandVariants = {
  hidden: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
  },
  visible: { 
    height: "auto", 
    opacity: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
  }
};

const tripCardVariants = {
  hidden: { opacity: 0, x: -16, scale: 0.98 },
  visible: (i: number) => ({ 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: { 
      delay: i * 0.04,
      duration: 0.35, 
      ease: [0.22, 1, 0.36, 1] 
    }
  })
};

export const TripRateBreakdown = ({ 
  trips, 
  carrierName, 
  subtotal, 
  formatCurrency 
}: TripRateBreakdownProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate totals by rate type
  const rateTypeTotals = trips.reduce((acc, trip) => {
    const rateType = trip.carrier_rate_type || 'fixed';
    if (!acc[rateType]) {
      acc[rateType] = { count: 0, total: 0, totalHours: 0, totalKm: 0 };
    }
    acc[rateType].count++;
    acc[rateType].total += trip.purchase_total || 0;
    acc[rateType].totalHours += trip.carrier_worked_hours || trip.travel_hours || 0;
    acc[rateType].totalKm += trip.distance_km || 0;
    return acc;
  }, {} as Record<string, { count: number; total: number; totalHours: number; totalKm: number }>);

  const getRateTypeLabel = (type: string) => {
    switch (type) {
      case 'per_hour': return 'Per uur';
      case 'per_km': return 'Per km';
      default: return 'Vast tarief';
    }
  };

  const getRateTypeStyles = (type: string) => {
    switch (type) {
      case 'per_hour': return {
        badge: 'bg-gradient-to-r from-blue-500/15 to-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-sm shadow-blue-500/10',
        icon: 'from-blue-500/20 to-blue-400/10 text-blue-500',
        text: 'text-blue-600 dark:text-blue-400'
      };
      case 'per_km': return {
        badge: 'bg-gradient-to-r from-purple-500/15 to-purple-400/10 text-purple-600 dark:text-purple-400 border-purple-500/30 shadow-sm shadow-purple-500/10',
        icon: 'from-purple-500/20 to-purple-400/10 text-purple-500',
        text: 'text-purple-600 dark:text-purple-400'
      };
      default: return {
        badge: 'bg-gradient-to-r from-emerald-500/15 to-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/10',
        icon: 'from-emerald-500/20 to-emerald-400/10 text-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400'
      };
    }
  };

  const getRateTypeIcon = (type: string) => {
    switch (type) {
      case 'per_hour': return Clock;
      case 'per_km': return Gauge;
      default: return Euro;
    }
  };

  return (
    <div className="space-y-4">
      {/* Rate Type Summary Pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(rateTypeTotals).map(([type, data]) => {
          const Icon = getRateTypeIcon(type);
          const styles = getRateTypeStyles(type);
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, scale: 0.9 }}

            >
              <Badge 
                variant="outline" 
                className={cn("gap-2 py-2 px-3 rounded-xl font-medium", styles.badge)}
              >
                <div className={cn("p-1 rounded-md bg-gradient-to-br", styles.icon)}>
                  <Icon className="h-3 w-3" />
                </div>
                <span>{data.count}× {getRateTypeLabel(type)}</span>
                {type === 'per_hour' && data.totalHours > 0 && (
                  <span className="opacity-70 text-xs">({data.totalHours.toFixed(1)} uur)</span>
                )}
                {type === 'per_km' && data.totalKm > 0 && (
                  <span className="opacity-70 text-xs">({Math.round(data.totalKm)} km)</span>
                )}
              </Badge>
            </motion.div>
          );
        })}
      </div>

      {/* Expandable Details Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full justify-between h-11 rounded-xl transition-all duration-300",
          "bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/80 hover:to-muted/60",
          "border border-border/40 hover:border-border/60",
          isExpanded && "bg-primary/5 border-primary/20"
        )}
      >
        <span className="flex items-center gap-2.5 text-sm font-medium">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5">
            <Calculator className="h-3.5 w-3.5 text-primary" />
          </div>
          {trips.length} {trips.length === 1 ? 'rit' : 'ritten'} — Tariefberekening bekijken
        </span>
        <motion.div
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
           
           
            exit="hidden"
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-2">
              {/* Trip Cards */}
              {trips.map((trip, idx) => {
                const rateStyles = getRateTypeStyles(trip.carrier_rate_type || 'fixed');
                const RateIcon = getRateTypeIcon(trip.carrier_rate_type || 'fixed');
                
                return (
                  <motion.div
                    key={trip.id}
                    custom={idx}
                   
                   
                    className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card/80 to-muted/30 backdrop-blur-sm border border-border/50 hover:border-border/80 transition-all duration-300 group"
                  >
                    {/* Top accent */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    
                    <div className="p-4 space-y-3">
                      {/* Trip Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-base tracking-tight">
                              {trip.order_number}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-md bg-primary/5 border-primary/20 font-medium">
                                W{getISOWeek(new Date(trip.trip_date))}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(trip.trip_date), "EEEE d MMM", { locale: nl })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs px-2.5 py-1 rounded-lg font-medium", rateStyles.badge)}
                        >
                          <RateIcon className="h-3 w-3 mr-1.5" />
                          {getRateTypeLabel(trip.carrier_rate_type || 'fixed')}
                        </Badge>
                      </div>

                      {/* Route Display */}
                      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/40">
                        <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="font-medium text-sm text-foreground">{trip.pickup_city}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-sm text-foreground">{trip.delivery_city}</span>
                      </div>

                      {/* Rate Calculation Display */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <div className="flex items-center gap-4">
                          {/* Rate Calculation Details */}
                          {trip.carrier_rate_type === 'per_hour' && (
                            <div className={cn("flex items-center gap-2 text-sm", rateStyles.text)}>
                              <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", rateStyles.icon)}>
                                <Clock className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold">
                                  {(trip.carrier_worked_hours || trip.travel_hours || 0).toFixed(1)} uur
                                </span>
                                {trip.carrier_hourly_rate && (
                                  <span className="text-xs text-muted-foreground">
                                    × {formatCurrency(trip.carrier_hourly_rate)}/uur
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {trip.carrier_rate_type === 'per_km' && (
                            <div className={cn("flex items-center gap-2 text-sm", rateStyles.text)}>
                              <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", rateStyles.icon)}>
                                <Gauge className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold">
                                  {Math.round(trip.distance_km || 0)} km
                                </span>
                                {trip.carrier_km_rate && (
                                  <span className="text-xs text-muted-foreground">
                                    × {formatCurrency(trip.carrier_km_rate)}/km
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {(!trip.carrier_rate_type || trip.carrier_rate_type === 'fixed') && (
                            <div className={cn("flex items-center gap-2 text-sm", rateStyles.text)}>
                              <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", rateStyles.icon)}>
                                <Euro className="h-4 w-4" />
                              </div>
                              <span className="font-medium">Vast tarief</span>
                            </div>
                          )}

                          {/* Distance badge for non-km rates */}
                          {trip.distance_km && trip.carrier_rate_type !== 'per_km' && (
                            <Badge variant="outline" className="text-xs bg-muted/50 gap-1">
                              <Route className="h-3 w-3" />
                              {Math.round(trip.distance_km)} km
                            </Badge>
                          )}
                        </div>

                        {/* Trip Total */}
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Subtotaal
                          </div>
                          <span className="font-black text-lg text-foreground">
                            {formatCurrency(trip.purchase_total || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Totals Section */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                className="mt-4 space-y-2"
              >
                {/* Subtotal */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Calculator className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Subtotaal</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        ({trips.length} {trips.length === 1 ? 'rit' : 'ritten'})
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">excl. BTW</div>
                    <div className="font-bold text-lg text-primary">{formatCurrency(subtotal)}</div>
                  </div>
                </div>

                {/* BTW Row */}
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">BTW 21%</span>
                  <span className="font-semibold text-foreground">{formatCurrency(subtotal * 0.21)}</span>
                </div>

                {/* Grand Total */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 to-emerald-400/8 border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-400/15"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                    </motion.div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      Totaal incl. BTW
                    </span>
                  </div>
                  <span className="font-black text-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
                    {formatCurrency(subtotal * 1.21)}
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

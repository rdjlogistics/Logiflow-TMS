import { 
  Truck, 
  Package, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TripRateBreakdown, type TripWithRate } from "../TripRateBreakdown";
import { cn } from "@/lib/utils";

interface CarrierGroup {
  carrier_id: string;
  carrier_name: string;
  trips: TripWithRate[];
  subtotal: number;
  selected: boolean;
}

interface Step2PreviewSectionProps {
  carrierGroups: CarrierGroup[];
  onToggleCarrier: (carrierId: string) => void;
  onBack: () => void;
  onNext: () => void;
  isCreating: boolean;
  formatCurrency: (amount: number) => string;
}

// Premium animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    } 
  }
};

const floatVariants = {
  initial: { y: 0 },
  animate: { 
    y: [-2, 2, -2],
    transition: { 
      duration: 4, 
      repeat: Infinity, 
      ease: "easeInOut" 
    }
  }
};

export const Step2PreviewSection = ({
  carrierGroups,
  onToggleCarrier,
  onBack,
  onNext,
  isCreating,
  formatCurrency,
}: Step2PreviewSectionProps) => {
  const selectedTotal = carrierGroups
    .filter((g) => g.selected)
    .reduce((sum, g) => sum + g.subtotal, 0);

  const selectedCount = carrierGroups.filter((g) => g.selected).length;
  const totalTrips = carrierGroups.reduce((sum, g) => sum + g.trips.length, 0);

  if (carrierGroups.length === 0) {
    return (
      <div}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card/90 via-card/80 to-muted/50 backdrop-blur-2xl border border-border/40 p-8 sm:p-12"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)] pointer-events-none" />
        
        <div className="relative text-center space-y-4">
          <div
            className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center"
          >
            <Package className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">Geen orders gevonden</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
            Er zijn geen afgeronde orders voor deze periode die nog niet gefactureerd zijn.
          </p>
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mt-6 gap-2 rounded-xl h-12 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar selectie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 sm:space-y-6"
    >
      {/* Premium Header Card */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-2xl border border-primary/20 p-4 sm:p-6"
      >
        {/* Shimmer effect */}
        <div}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
        />
        
        {/* Mesh gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
        
        <div className="relative space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div 
              className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-lg shadow-primary/20 flex-shrink-0"}
            >
              <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-primary/10 blur-xl animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <span className="truncate">Preview Tarieven</span>
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse flex-shrink-0" />
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Controleer voor facturatie
              </p>
            </div>
          </div>
          
          {/* Stats Pills */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs">
              <Truck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {carrierGroups.length} charter{carrierGroups.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs">
              <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {totalTrips} ritten
            </Badge>
          </div>
        </div>
      </div>

      {/* Carrier Cards */}
      <div className="space-y-3 sm:space-y-4">
        {carrierGroups.map((group, idx) => (
          <div
            key={group.carrier_id}
            className={cn(
              "relative overflow-hidden rounded-xl sm:rounded-2xl backdrop-blur-xl border transition-all duration-500",
              group.selected 
                ? "bg-gradient-to-br from-card/95 via-card/90 to-primary/5 border-primary/30 shadow-xl shadow-primary/10" 
                : "bg-card/60 border-border/40 opacity-60"
            )}
          >
            {/* Top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            {/* Ambient glow for selected */}
            {group.selected && (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />
            )}
            
            <div className="relative p-3 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Checkbox */}
                <div
                  className="pt-0.5 sm:pt-1"
                >
                  <Checkbox
                    checked={group.selected}
                    onCheckedChange={() => onToggleCarrier(group.carrier_id)}
                    className="h-5 w-5 sm:h-5 sm:w-5 rounded-md border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary touch-manipulation"
                  />
                </div>
                
                <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
                  {/* Carrier Header */}
                  <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={cn(
                        "flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all flex-shrink-0",
                        group.selected 
                          ? "bg-gradient-to-br from-primary/20 to-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm sm:text-lg text-foreground truncate">{group.carrier_name}</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {group.trips.length} {group.trips.length === 1 ? 'rit' : 'ritten'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Total Amount */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Totaal incl. BTW
                      </div>
                      <div 
                        className={cn(
                          "text-lg sm:text-2xl font-black tracking-tight",
                          group.selected 
                            ? "bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" 
                            : "text-muted-foreground"
                        )}}
                      >
                        {formatCurrency(group.subtotal * 1.21)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Rate Breakdown */}
                  <TripRateBreakdown
                    trips={group.trips}
                    carrierName={group.carrier_name}
                    subtotal={group.subtotal}
                    formatCurrency={formatCurrency}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent backdrop-blur-xl border border-emerald-500/30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(142_76%_36%/0.1),transparent)] pointer-events-none" />
        
        <div className="relative p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div 
                className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
              >
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm sm:text-base">
                  {selectedCount} factuur{selectedCount !== 1 ? 'en' : ''}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Klaar om te genereren
                </div>
              </div>
            </div>
            
            <div className="text-right flex-shrink-0">
              <div className="text-[9px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Totaal incl. BTW
              </div>
              <div className="text-xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
                {formatCurrency(selectedTotal * 1.21)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 pb-safe"
      >
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 rounded-xl h-12 px-4 sm:px-6 touch-manipulation order-2 sm:order-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug
        </Button>
        
        <Button
          onClick={onNext}
          disabled={selectedCount === 0 || isCreating}
          className="gap-2 rounded-xl h-12 sm:h-12 px-4 sm:px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all touch-manipulation order-1 sm:order-2 flex-1 sm:flex-none"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          <span className="truncate">{selectedCount} {selectedCount === 1 ? 'factuur' : 'facturen'} aanmaken</span>
          <ArrowRight className="h-4 w-4 hidden sm:block" />
        </Button>
      </div>
    </div>
  );
};

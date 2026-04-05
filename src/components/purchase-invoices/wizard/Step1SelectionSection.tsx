import { 
  Calendar, 
  Truck, 
  FileText, 
  ArrowRight, 
  Loader2,
  Sparkles,
  Clock,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Step1SelectionSectionProps {
  periodPreset: string;
  onPeriodChange: (value: string) => void;
  carrierId: string;
  onCarrierChange: (value: string) => void;
  carriers: { id: string; company_name: string }[] | undefined;
  invoiceType: "standaard" | "self_billing";
  onInvoiceTypeChange: (value: "standaard" | "self_billing") => void;
  footnote: string;
  onFootnoteChange: (value: string) => void;
  periodDates: { from: string; to: string };
  onNext: () => void;
  isLoading: boolean;
}

const periodPresets = [
  { label: "Vorige week", value: "prev_week", icon: Clock },
  { label: "Vorige maand", value: "prev_month", icon: Calendar },
  { label: "Deze week", value: "this_week", icon: Clock },
  { label: "Deze maand", value: "this_month", icon: Calendar },
];

// Animation variants
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

export const Step1SelectionSection = ({
  periodPreset,
  onPeriodChange,
  carrierId,
  onCarrierChange,
  carriers,
  invoiceType,
  onInvoiceTypeChange,
  footnote,
  onFootnoteChange,
  periodDates,
  onNext,
  isLoading,
}: Step1SelectionSectionProps) => {
  return (
    <div className="space-y-4 sm:space-y-6"
    >
      {/* Section Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-2xl border border-primary/20 p-4 sm:p-6"
      >
        {/* Shimmer */}
        <motion.div
          initial={{ x: '-100%' }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none"
        />
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
        
        <div className="relative flex items-center gap-3 sm:gap-4">
          <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-lg shadow-primary/20 flex-shrink-0"

          >
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-primary/10 blur-xl animate-pulse" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <span className="truncate">Selecteer Parameters</span>
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse flex-shrink-0" />
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kies periode en charter
            </p>
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-card/95 via-card/90 to-muted/30 backdrop-blur-xl border border-border/40 p-4 sm:p-5"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Periode</Label>
          </div>
          
          {/* Period Pills - 2x2 grid on mobile */}
          <div className="grid grid-cols-2 gap-2">
            {periodPresets.map((preset) => (
              <motion.button
                key={preset.value}
                onClick={() => onPeriodChange(preset.value)}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 touch-manipulation min-h-[48px]",
                  periodPreset === preset.value
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-muted/60 active:bg-muted text-muted-foreground active:text-foreground border border-border/40"
                )}
              >
                {periodPreset === preset.value && (
                  <motion.div
                    layoutId="period-glow"
                    className="absolute inset-0 rounded-xl bg-primary/20 blur-xl"
                  />
                )}
                <preset.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 relative z-10 flex-shrink-0" />
                <span className="relative z-10 truncate">{preset.label}</span>
              </button>
            ))}
          </div>
          
          {/* Selected Date Range */}
          <motion.div 
            key={periodPreset}
            initial={{ opacity: 0, y: 5 }}
            className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5"
          >
            <span className="font-medium text-foreground">Geselecteerd:</span>
            <span>
              {format(new Date(periodDates.from), "d MMM", { locale: nl })} t/m{" "}
              {format(new Date(periodDates.to), "d MMM yyyy", { locale: nl })}
            </span>
          </div>
        </div>
      </div>

      {/* Carrier Selection */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-card/95 via-card/90 to-muted/30 backdrop-blur-xl border border-border/40 p-4 sm:p-5"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Charter</Label>
          </div>
          
          <Select value={carrierId} onValueChange={onCarrierChange}>
            <SelectTrigger className="h-12 sm:h-12 rounded-xl border-2 bg-background/50 backdrop-blur-sm hover:border-primary/40 transition-colors touch-manipulation text-sm">
              <SelectValue placeholder="Selecteer charter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="py-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Alle charters
                </div>
              </SelectItem>
              {carriers?.map((carrier) => (
                <SelectItem key={carrier.id} value={carrier.id} className="py-3">
                  {carrier.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoice Type Selection */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-card/95 via-card/90 to-muted/30 backdrop-blur-xl border border-border/40 p-4 sm:p-5"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Type Inkoopfactuur</Label>
          </div>
          
          <div className="grid gap-2 sm:gap-3">
            {/* Standard Invoice Card */}
            <motion.button
              onClick={() => onInvoiceTypeChange("standaard")}
              className={cn(
                "relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl text-left transition-all duration-300 touch-manipulation min-h-[72px]",
                invoiceType === "standaard"
                  ? "bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border-2 border-primary/40 shadow-lg shadow-primary/10"
                  : "bg-muted/40 border-2 border-transparent active:border-border/60"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 sm:w-10 sm:h-10 rounded-xl transition-colors flex-shrink-0",
                invoiceType === "standaard"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                <Receipt className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm sm:text-base">Standaard inkoopfactuur</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Ontvang facturen van charters
                </div>
              </div>
              {invoiceType === "standaard" && (
                <motion.div
                  initial={{ scale: 0 }}
                  className="absolute top-3 right-3 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary shadow-lg shadow-primary/50"
                />
              )}
            </button>
            
            {/* Self-billing Card */}
            <motion.button
              onClick={() => onInvoiceTypeChange("self_billing")}
              className={cn(
                "relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl text-left transition-all duration-300 touch-manipulation min-h-[72px]",
                invoiceType === "self_billing"
                  ? "bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border-2 border-primary/40 shadow-lg shadow-primary/10"
                  : "bg-muted/40 border-2 border-transparent active:border-border/60"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 sm:w-10 sm:h-10 rounded-xl transition-colors flex-shrink-0",
                invoiceType === "self_billing"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground text-sm sm:text-base">Self-billing</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Stel facturen op namens de charter
                </div>
              </div>
              {invoiceType === "self_billing" && (
                <motion.div
                  initial={{ scale: 0 }}
                  className="absolute top-3 right-3 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary shadow-lg shadow-primary/50"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-card/95 via-card/90 to-muted/30 backdrop-blur-xl border border-border/40 p-4 sm:p-5"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Voetnoot (optioneel)</Label>
          </div>
          
          <Textarea
            value={footnote}
            onChange={(e) => onFootnoteChange(e.target.value)}
            placeholder="Eventuele opmerkingen..."
            rows={2}
            className="rounded-xl text-sm touch-manipulation"
          />
        </div>
      </div>

      {/* Action Button - Fixed bottom on mobile for better UX */}
      <div className="pb-safe">
        <Button
          onClick={onNext}
          disabled={isLoading}
          className="w-full h-14 sm:h-14 rounded-xl text-sm sm:text-base font-semibold gap-2 sm:gap-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all touch-manipulation"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Toon beschikbare orders
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

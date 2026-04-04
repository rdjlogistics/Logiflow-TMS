import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Lock, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TollIndicator } from "./TollIndicator";
import AutoPriceIndicator from "./AutoPriceIndicator";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { TollDetectionResult } from "@/hooks/useTollDetection";
import type { AutoPriceResult } from "@/hooks/useAutoPrice";

interface Product {
  id: string;
  name: string;
  sales_pricing_model: string;
  sales_rate: number;
  purchase_pricing_model: string;
  purchase_rate: number;
  vat_percentage: number;
}

export interface ProductLine {
  product_id: string;
  product_name: string;
  sales_rate: number;
  purchase_rate: number;
  is_active: boolean;
  sales_subtotal: number;
  purchase_subtotal: number;
  pricing_model: string;
}

export interface PricingData {
  distance_km: number;
  stops: number;
  hours: number;
  wait_time_minutes: number;
  load_unload_minutes: number;
  purchase_distance_km: number;
  purchase_hours: number;
  quantity: number;
  total_weight: string;
  dimensions: string;
  product_lines: ProductLine[];
  sales_other_costs: number;
  sales_discount_pct: number;
  price_locked: boolean;
  purchase_other_costs: number;
  purchase_price_locked: boolean;
  toll_cost_min?: number;
  toll_cost_max?: number;
}

interface PricingPanelProps {
  data: PricingData;
  onChange: (data: PricingData) => void;
  onCalculateRoute: () => void;
  isCalculating?: boolean;
  tollResult?: TollDetectionResult | null;
  isDetectingTolls?: boolean;
  layout?: 'sidebar' | 'fullwidth';
  // Auto-price props
  autoPriceResult?: AutoPriceResult | null;
  isAutoPricing?: boolean;
  onApplyAutoPrice?: () => void;
  onDismissAutoPrice?: () => void;
  isAutoPriceApplied?: boolean;
}

/** Responsive grid class for tariff rows */
const TARIFF_GRID_FW = "grid grid-cols-[1fr,80px,40px,80px] sm:grid-cols-[1.5fr,90px,42px,90px] gap-2 items-center";
const TARIFF_GRID_SB = "grid grid-cols-[1fr,70px,36px,65px] sm:grid-cols-[1.2fr,85px,38px,78px] gap-1.5 sm:gap-2 items-center";

/** Inline input with suffix */
const SuffixInput = ({ suffix, className, ...props }: { suffix: string } & React.ComponentProps<typeof Input>) => (
  <div className="relative">
    <Input {...props} className={cn("pr-8", className)} />
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70 pointer-events-none font-medium">
      {suffix}
    </span>
  </div>
);

const PricingPanel = ({ 
  data, 
  onChange, 
  onCalculateRoute, 
  isCalculating = false,
  tollResult,
  isDetectingTolls = false,
  autoPriceResult,
  isAutoPricing = false,
  onApplyAutoPrice,
  onDismissAutoPrice,
  isAutoPriceApplied = false,
}: PricingPanelProps) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (productData) {
        setProducts(productData);
        
        if (data.product_lines.length === 0) {
          const lines: ProductLine[] = productData.map((p, idx) => ({
            product_id: p.id,
            product_name: p.name,
            sales_rate: p.sales_rate,
            purchase_rate: p.purchase_rate,
            is_active: productData.length === 1 ? true : false,
            sales_subtotal: 0,
            purchase_subtotal: 0,
            pricing_model: p.sales_pricing_model,
          }));
          onChange({ ...data, product_lines: lines });
        }
      }
    };
    fetchProducts();
  }, []);

  const handleChange = (field: keyof PricingData, value: any) => {
    const newData = { ...data, [field]: value };
    if (['distance_km', 'stops', 'hours', 'wait_time_minutes'].includes(field)) {
      newData.product_lines = recalculateSubtotals(newData);
    }
    onChange(newData);
  };

  const recalculateSubtotals = (pricingData: PricingData): ProductLine[] => {
    return pricingData.product_lines.map(line => {
      if (!line.is_active) return { ...line, sales_subtotal: 0, purchase_subtotal: 0 };
      let salesMultiplier = 1;
      let purchaseMultiplier = 1;
      switch (line.pricing_model) {
        case 'per_km': salesMultiplier = pricingData.distance_km; purchaseMultiplier = pricingData.purchase_distance_km || pricingData.distance_km; break;
        case 'per_stop': salesMultiplier = pricingData.stops; purchaseMultiplier = pricingData.stops; break;
        case 'per_hour': salesMultiplier = pricingData.hours; purchaseMultiplier = pricingData.purchase_hours || pricingData.hours; break;
        case 'per_wait_minute': salesMultiplier = pricingData.wait_time_minutes; purchaseMultiplier = pricingData.wait_time_minutes; break;
        case 'per_ride': case 'fixed': salesMultiplier = 1; purchaseMultiplier = 1; break;
      }
      return { ...line, sales_subtotal: line.sales_rate * salesMultiplier, purchase_subtotal: line.purchase_rate * purchaseMultiplier };
    });
  };

  const handleProductLineChange = (index: number, field: keyof ProductLine, value: any) => {
    const newLines = [...data.product_lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === 'is_active' || field === 'sales_rate' || field === 'purchase_rate') {
      const updatedData = { ...data, product_lines: newLines };
      updatedData.product_lines = recalculateSubtotals(updatedData);
      onChange(updatedData);
    } else {
      onChange({ ...data, product_lines: newLines });
    }
  };

  // Calculate totals — BTW tarief wordt bepaald bij facturatie, hier 21% als indicatie
  const indicatieBtwTarief = 21;
  const salesSubtotal = data.product_lines.reduce((sum, line) => sum + line.sales_subtotal, 0) + data.sales_other_costs;
  const salesAfterDiscount = salesSubtotal * (1 - data.sales_discount_pct / 100);
  const salesVat = salesAfterDiscount * (indicatieBtwTarief / 100);
  const salesTotalIncVat = salesAfterDiscount + salesVat;
  const purchaseTotal = data.product_lines.reduce((sum, line) => sum + line.purchase_subtotal, 0) + data.purchase_other_costs;
  const grossProfit = salesAfterDiscount - purchaseTotal;
  const profitMargin = salesAfterDiscount > 0 ? (grossProfit / salesAfterDiscount) * 100 : 0;

  const inputBase = "h-12 sm:h-8 text-sm sm:text-xs touch-manipulation rounded-lg";
  const isFullwidth = false;
  const TARIFF_GRID = isFullwidth ? TARIFF_GRID_FW : TARIFF_GRID_SB;

  return (
    <motion.div
      initial={{ opacity: 0, y: isFullwidth ? 16 : 0 }}
    >
    <Card 
      className={cn(
        "relative overflow-hidden border-border/30 backdrop-blur-sm shadow-lg ring-1 ring-emerald-500/10 bg-gradient-to-br from-card via-card to-emerald-950/5 dark:to-emerald-950/10",
        isFullwidth 
          ? "rounded-2xl bg-gradient-to-br from-card via-card to-emerald-950/5 dark:to-emerald-950/10" 
          : "h-full bg-card/95"
      )}
      style={{ WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-primary/5 opacity-50 pointer-events-none" />
      <CardHeader className="relative pb-2 px-3 sm:px-5">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10">
            <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">Prijsberekening</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4 px-3 sm:px-5">
        {/* === Route + Tijd + Inkoop + Lading === */}
        <div className={cn(
          isFullwidth ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" : "space-y-3"
        )}>
          {/* Route */}
          <div>
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2.5 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              Route
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Afstand</Label>
                <SuffixInput suffix="km" type="number" inputMode="decimal" value={data.distance_km} onChange={(e) => handleChange('distance_km', parseFloat(e.target.value) || 0)} className={inputBase} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Stops</Label>
                <Input type="number" inputMode="numeric" value={data.stops} onChange={(e) => handleChange('stops', parseInt(e.target.value) || 0)} className={inputBase} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Uren</Label>
                <SuffixInput suffix="u" type="number" inputMode="decimal" step="0.5" value={data.hours} onChange={(e) => handleChange('hours', parseFloat(e.target.value) || 0)} className={inputBase} />
              </div>
            </div>
          </div>

          {/* Tijd */}
          <div>
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2.5 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-primary" />
              Tijd
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Wachttijd</Label>
                <SuffixInput suffix="min" type="number" inputMode="numeric" value={data.wait_time_minutes} onChange={(e) => handleChange('wait_time_minutes', parseInt(e.target.value) || 0)} className={inputBase} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Laad/los</Label>
                <SuffixInput suffix="min" type="number" inputMode="numeric" value={data.load_unload_minutes} onChange={(e) => handleChange('load_unload_minutes', parseInt(e.target.value) || 0)} className={inputBase} />
              </div>
            </div>
          </div>

          {/* Inkoop */}
          <div>
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2.5 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-amber-500" />
              Inkoop
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Ink. afstand</Label>
                <SuffixInput suffix="km" type="number" inputMode="decimal" value={data.purchase_distance_km} onChange={(e) => handleChange('purchase_distance_km', parseFloat(e.target.value) || 0)} className={inputBase} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Ink. uren</Label>
                <SuffixInput suffix="u" type="number" inputMode="decimal" step="0.5" value={data.purchase_hours} onChange={(e) => handleChange('purchase_hours', parseFloat(e.target.value) || 0)} className={inputBase} />
              </div>
            </div>
          </div>

          {/* Lading */}
          <div>
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2.5 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-violet-500" />
              Lading
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Aantal</Label>
                <Input type="number" inputMode="numeric" value={data.quantity} onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)} className={inputBase} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Gewicht</Label>
                <SuffixInput suffix="kg" value={data.total_weight} inputMode="decimal" onChange={(e) => handleChange('total_weight', e.target.value)} className={inputBase} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Afmetingen</Label>
                <Input value={data.dimensions} onChange={(e) => handleChange('dimensions', e.target.value)} className={inputBase} placeholder="LxBxH" />
              </div>
            </div>
          </div>
        </div>

        <Button 
          type="button"
          variant="secondary" 
          size="sm" 
          className={cn(
            "gap-2 text-xs bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border border-border/50 shadow-sm hover:shadow-md transition-all touch-manipulation active:scale-[0.98]",
            isFullwidth ? "w-full sm:w-auto h-11 sm:h-9" : "w-full h-11 sm:h-9"
          )}
          onClick={onCalculateRoute}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Route berekenen...</>
          ) : (
            <><Calculator className="h-4 w-4" /><span className="hidden sm:inline">Bereken afstand & reisduur</span><span className="sm:hidden">Bereken route</span></>
          )}
        </Button>

        <TollIndicator tollResult={tollResult || null} isDetecting={isDetectingTolls} />

        {/* Auto-price indicator from rate contracts */}
        <AutoPriceIndicator
          result={autoPriceResult || null}
          isCalculating={isAutoPricing}
          onApply={onApplyAutoPrice || (() => {})}
          onDismiss={onDismissAutoPrice || (() => {})}
          isApplied={isAutoPriceApplied}
        />

        {/* === Tarieven: Verkoop + Inkoop side-by-side in fullwidth === */}
        <div className={cn(
          isFullwidth ? "grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-border/30 pt-4" : "space-y-3"
        )}>
          {/* Verkoop sub-card */}
          <div className={cn(
            "space-y-2",
            isFullwidth 
              ? "p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 ring-1 ring-emerald-500/5" 
              : "border-t border-border/30 pt-3"
          )}>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Verkoop Tarieven
            </h4>
            <div className="space-y-1">
              {data.product_lines.map((line, index) => (
                <div key={line.product_id} className={cn(
                  TARIFF_GRID, "text-sm sm:text-xs py-1.5 rounded-md px-1.5 -mx-1 transition-colors",
                  line.is_active && "bg-emerald-500/5"
                )}>
                  <span className="truncate font-medium" title={line.product_name}>{line.product_name}</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-muted-foreground text-[10px]">€</span>
                    <Input type="number" inputMode="decimal" step="0.01" value={line.sales_rate} onChange={(e) => handleProductLineChange(index, 'sales_rate', parseFloat(e.target.value) || 0)} className="h-9 sm:h-7 text-xs px-1.5 rounded-md touch-manipulation text-base" disabled={data.price_locked} />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox checked={line.is_active} onCheckedChange={(checked) => handleProductLineChange(index, 'is_active', checked)} disabled={data.price_locked} className="h-5 w-5 sm:h-4 sm:w-4 touch-manipulation" />
                  </div>
                  <div className="text-right font-semibold tabular-nums text-xs">€{line.sales_subtotal.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className={cn(TARIFF_GRID, "text-xs border-t border-border/20 pt-2")}>
              <span>Overige kosten</span>
              <div className="flex items-center gap-0.5">
                <span className="text-muted-foreground text-[10px]">€</span>
                <Input type="number" inputMode="decimal" step="0.01" value={data.sales_other_costs} onChange={(e) => handleChange('sales_other_costs', parseFloat(e.target.value) || 0)} className="h-9 sm:h-7 text-xs px-1.5 rounded-md touch-manipulation text-base" disabled={data.price_locked} />
              </div>
              <div />
              <div className="text-right tabular-nums">€{data.sales_other_costs.toFixed(2)}</div>
            </div>

            <div className={cn(TARIFF_GRID, "text-xs")}>
              <span>Korting</span>
              <div className="flex items-center gap-0.5">
                <span className="text-muted-foreground text-[10px]">%</span>
                <Input type="number" inputMode="decimal" step="0.1" value={data.sales_discount_pct} onChange={(e) => handleChange('sales_discount_pct', parseFloat(e.target.value) || 0)} className="h-9 sm:h-7 text-xs px-1.5 rounded-md touch-manipulation text-base" disabled={data.price_locked} />
              </div>
              <div />
              <div className="text-right tabular-nums">€{(salesSubtotal * data.sales_discount_pct / 100).toFixed(2)}</div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="price_locked" checked={data.price_locked} onCheckedChange={(checked) => handleChange('price_locked', checked)} className="h-5 w-5 sm:h-4 sm:w-4 touch-manipulation" />
              <Label htmlFor="price_locked" className="text-[11px] cursor-pointer flex items-center gap-1 touch-manipulation">
                <Lock className="h-3 w-3" /> Prijs vastzetten
              </Label>
            </div>

            {/* Verkoop totalen */}
            <div className={cn(
              "space-y-1 border-t border-border/30 pt-2",
              isFullwidth && "bg-emerald-500/5 -mx-4 -mb-4 px-4 pb-4 pt-3 rounded-b-xl"
            )}>
              <div className="flex justify-between text-xs font-medium">
                <span>Verkoop totaal</span>
                <span className="tabular-nums font-semibold">€{salesAfterDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{indicatieBtwTarief}% BTW (indicatie)</span>
                <span className="tabular-nums">€{salesVat.toFixed(2)}</span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 italic">
                Definitief BTW-tarief wordt berekend bij facturatie o.b.v. klantgegevens
              </p>
              <div className={cn(
                "flex justify-between font-bold",
                isFullwidth ? "text-base" : "text-sm"
              )}>
                <span>Totaal incl. BTW</span>
                <span className="tabular-nums">€{salesTotalIncVat.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Inkoop sub-card */}
          <div className={cn(
            "space-y-2",
            isFullwidth 
              ? "p-4 rounded-xl bg-primary/5 border border-primary/15 ring-1 ring-primary/5" 
              : "border-t border-border/30 pt-3"
          )}>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Inkoop Tarieven
            </h4>
            <div className="space-y-1">
              {data.product_lines.map((line, index) => (
                <div key={`purchase-${line.product_id}`} className={cn(
                  TARIFF_GRID, "text-sm sm:text-xs py-1.5 rounded-md px-1.5 -mx-1 transition-colors",
                  line.is_active && "bg-primary/5"
                )}>
                  <span className="truncate font-medium" title={line.product_name}>{line.product_name}</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-muted-foreground text-[10px]">€</span>
                    <Input type="number" inputMode="decimal" step="0.01" value={line.purchase_rate} onChange={(e) => handleProductLineChange(index, 'purchase_rate', parseFloat(e.target.value) || 0)} className="h-9 sm:h-7 text-xs px-1.5 rounded-md touch-manipulation text-base" disabled={data.purchase_price_locked} />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox checked={line.is_active} disabled className="h-5 w-5 sm:h-4 sm:w-4 touch-manipulation" />
                  </div>
                  <div className="text-right font-semibold tabular-nums text-xs">€{line.purchase_subtotal.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className={cn(TARIFF_GRID, "text-xs border-t border-border/20 pt-2")}>
              <span>Overige inkoopkosten</span>
              <div className="flex items-center gap-0.5">
                <span className="text-muted-foreground text-[10px]">€</span>
                <Input type="number" inputMode="decimal" step="0.01" value={data.purchase_other_costs} onChange={(e) => handleChange('purchase_other_costs', parseFloat(e.target.value) || 0)} className="h-9 sm:h-7 text-xs px-1.5 rounded-md touch-manipulation text-base" disabled={data.purchase_price_locked} />
              </div>
              <div />
              <div className="text-right tabular-nums">€{data.purchase_other_costs.toFixed(2)}</div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="purchase_price_locked" checked={data.purchase_price_locked} onCheckedChange={(checked) => handleChange('purchase_price_locked', checked)} className="h-5 w-5 sm:h-4 sm:w-4 touch-manipulation" />
              <Label htmlFor="purchase_price_locked" className="text-[11px] cursor-pointer flex items-center gap-1 touch-manipulation">
                <Lock className="h-3 w-3" /> Inkoopprijs vastzetten
              </Label>
            </div>

            {/* Inkoop totalen */}
            <div className={cn(
              "space-y-1 border-t border-border/30 pt-2",
              isFullwidth && "bg-primary/5 -mx-4 -mb-4 px-4 pb-4 pt-3 rounded-b-xl"
            )}>
              <div className={cn(
                "flex justify-between font-bold",
                isFullwidth ? "text-base" : "text-sm"
              )}>
                <span>Inkoop totaal</span>
                <span className="tabular-nums">€{purchaseTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* === Marge — prominent full-width bar === */}
        <motion.div 
          className="border-t border-border/30 pt-4"
        >
          {/* Progress bar for margin visualization */}
          {salesAfterDiscount > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Marge indicator</span>
                <span>{profitMargin.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.max(0, Math.min(100, profitMargin))} 
                className={cn(
                  "h-2 rounded-full",
                  profitMargin >= 15 ? "[&>div]:bg-emerald-500" : profitMargin >= 0 ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive"
                )}
              />
            </div>
          )}

          <div className={cn(
            "grid gap-3",
            isFullwidth ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1"
          )}>
            <div className={cn(
              "flex justify-between items-center font-semibold p-3 sm:p-4 rounded-xl",
              isFullwidth ? "text-base" : "text-sm",
              grossProfit >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'bg-destructive/10 text-destructive shadow-sm'
            )}>
              <span>Brutowinst</span>
              <span className={cn("tabular-nums", isFullwidth && "text-xl font-bold")}>€{grossProfit.toFixed(2)}</span>
            </div>
            <div className={cn(
              "flex justify-between items-center font-bold p-3 sm:p-4 rounded-xl",
              isFullwidth ? "text-lg" : "text-sm",
              profitMargin >= 15 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-glow-soft' : 
              profitMargin >= 0 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm' : 
              'bg-destructive/10 text-destructive shadow-sm'
            )}>
              <span>Marge</span>
              <span className={cn("tabular-nums", isFullwidth && "text-xl")}>{profitMargin.toFixed(1)}%</span>
            </div>
            
            {profitMargin < 15 && profitMargin >= 0 && salesAfterDiscount > 0 && (
              <div className="flex items-center gap-2 p-3 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Lage marge — overweeg tarieven te verhogen.</span>
              </div>
            )}
            {profitMargin < 0 && salesAfterDiscount > 0 && (
              <div className="flex items-center gap-2 p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Verlies! Inkoop hoger dan verkoop.</span>
              </div>
            )}
          </div>
        </motion.div>

        <div className="h-0 sm:h-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </CardContent>
    </Card>
    </motion.div>
  );
};

export default PricingPanel;

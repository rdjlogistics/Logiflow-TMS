import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  MapPin,
  Truck,
  Euro,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  ArrowRight,
  Calendar,
  Info,
} from "lucide-react";
import { useSmartPricing, type PriceResult } from "@/hooks/useSmartPricing";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartPricingCalculatorProps {
  onPriceCalculated?: (result: PriceResult) => void;
  defaultOrigin?: string;
  defaultDestination?: string;
  defaultDistance?: number;
}

const SmartPricingCalculator: React.FC<SmartPricingCalculatorProps> = ({
  onPriceCalculated,
  defaultOrigin = "",
  defaultDestination = "",
  defaultDistance,
}) => {
  const { calculatePrice, quickEstimate, isCalculating, error } = useSmartPricing();

  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [distance, setDistance] = useState(defaultDistance?.toString() || "");
  const [vehicleType, setVehicleType] = useState("bakwagen");
  const [pickupDate, setPickupDate] = useState("");
  const [result, setResult] = useState<PriceResult | null>(null);
  const [quickPrice, setQuickPrice] = useState<number | null>(null);

  // Update quick estimate when inputs change
  useEffect(() => {
    if (distance) {
      const estimate = quickEstimate(parseFloat(distance), vehicleType);
      setQuickPrice(estimate);
    } else {
      setQuickPrice(null);
    }
  }, [distance, vehicleType, quickEstimate]);

  const handleCalculate = async () => {
    if (!origin || !destination || !distance) return;

    const priceResult = await calculatePrice({
      origin_city: origin,
      destination_city: destination,
      distance_km: parseFloat(distance),
      vehicle_type: vehicleType,
      pickup_date: pickupDate || undefined,
    });

    if (priceResult) {
      setResult(priceResult);
      onPriceCalculated?.(priceResult);
    }
  };

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case "surge":
      case "surge_factor":
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case "discount":
        return <TrendingDown className="h-3 w-3 text-emerald-500" />;
      default:
        return <Zap className="h-3 w-3 text-blue-500" />;
    }
  };

  const formatAdjustmentValue = (adj: { type: string; value: number }) => {
    if (adj.type === "surge" || adj.type === "surge_factor") {
      return `×${adj.value.toFixed(2)}`;
    }
    if (adj.value > 0) {
      return `+€${adj.value.toFixed(2)}`;
    }
    return `€${adj.value.toFixed(2)}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Smart Prijscalculator
            </CardTitle>
            <CardDescription>
              Dynamische prijsberekening met AI-gestuurde factoren
            </CardDescription>
          </div>
          {quickPrice !== null && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Snelle schatting</p>
              <p className="text-lg font-bold text-muted-foreground">
                €{quickPrice.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Vertrekplaats
            </Label>
            <Input
              placeholder="Amsterdam"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              Bestemming
            </Label>
            <Input
              placeholder="Rotterdam"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Afstand (km)</Label>
            <Input
              type="number"
              placeholder="85"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Voertuigtype
            </Label>
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bestelbus">Bestelbus</SelectItem>
                <SelectItem value="bakwagen">Bakwagen</SelectItem>
                <SelectItem value="vrachtwagen">Vrachtwagen</SelectItem>
                <SelectItem value="trekker">Trekker + oplegger</SelectItem>
                <SelectItem value="koelwagen">Koelwagen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ophaaldatum
            </Label>
            <Input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleCalculate}
          disabled={isCalculating || !origin || !destination || !distance}
        >
          {isCalculating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Berekenen...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Bereken Prijs
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-4 border-t">
            {/* Main Price */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Berekende prijs</p>
                <p className="text-3xl font-bold text-primary">
                  €{result.final_price.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-1">
                  Geldig tot{" "}
                  {new Date(result.valid_until).toLocaleDateString("nl-NL")}
                </Badge>
                {result.surge_multiplier > 1 && (
                  <Badge variant="destructive" className="ml-2">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Surge ×{result.surge_multiplier.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Afstandstarief</span>
                <span>€{result.breakdown.distance_charge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Basisprijs</span>
                <span>€{result.breakdown.base_charge.toFixed(2)}</span>
              </div>
              {result.breakdown.surge_charge > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Surge toeslag</span>
                  <span>+€{result.breakdown.surge_charge.toFixed(2)}</span>
                </div>
              )}
              {result.breakdown.discounts > 0 && (
                <div className="flex justify-between text-sm text-emerald-500">
                  <span>Kortingen</span>
                  <span>-€{result.breakdown.discounts.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Totaal</span>
                <span>€{result.final_price.toFixed(2)}</span>
              </div>
            </div>

            {/* Adjustments Applied */}
            {result.adjustments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Toegepaste regels
                </p>
                <div className="space-y-1">
                  {result.adjustments.map((adj, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {getAdjustmentIcon(adj.type)}
                        <span>{adj.name}</span>
                      </div>
                      <span
                        className={
                          adj.type === "discount"
                            ? "text-emerald-500"
                            : adj.type === "surge" || adj.type === "surge_factor"
                            ? "text-red-500"
                            : ""
                        }
                      >
                        {formatAdjustmentValue(adj)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Route Summary */}
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground py-2">
              <span>{origin}</span>
              <ArrowRight className="h-4 w-4" />
              <span>{destination}</span>
              <span>•</span>
              <span>{distance} km</span>
              <span>•</span>
              <span>{vehicleType}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartPricingCalculator;

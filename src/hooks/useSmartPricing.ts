import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PriceRequest {
  origin_city: string;
  destination_city: string;
  distance_km: number;
  vehicle_type?: string;
  customer_id?: string;
  pickup_date?: string;
}

export interface PriceAdjustment {
  name: string;
  type: string;
  value: number;
}

export interface PriceResult {
  base_price: number;
  adjustments: PriceAdjustment[];
  surge_multiplier: number;
  final_price: number;
  breakdown: {
    distance_charge: number;
    base_charge: number;
    surge_charge: number;
    discounts: number;
  };
  currency: string;
  valid_until: string;
}

export const useSmartPricing = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const calculatePrice = async (request: PriceRequest): Promise<PriceResult | null> => {
    setIsCalculating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('calculate-price', {
        body: request,
      });

      if (fnError) {
        throw new Error(fnError.message || 'Prijsberekening mislukt');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as PriceResult;
    } catch (err: any) {
      console.error('Price calculation error:', err);
      setError(err.message || 'Berekening mislukt');
      toast({
        title: "Prijsberekening mislukt",
        description: err.message || 'Probeer het later opnieuw',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCalculating(false);
    }
  };

  // Quick estimate without database rules (for UI preview)
  const quickEstimate = (distanceKm: number, vehicleType?: string): number => {
    const BASE_RATE = 1.35;
    const MINIMUM = 75;
    
    const vehicleMultipliers: Record<string, number> = {
      'bestelbus': 0.9,
      'bakwagen': 1.0,
      'trekker': 1.2,
      'vrachtwagen': 1.1,
      'koelwagen': 1.3,
    };

    const multiplier = vehicleMultipliers[vehicleType || 'bakwagen'] || 1.0;
    return Math.max(distanceKm * BASE_RATE * multiplier, MINIMUM);
  };

  return {
    calculatePrice,
    quickEstimate,
    isCalculating,
    error,
  };
};

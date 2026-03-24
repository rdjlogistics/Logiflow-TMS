import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AutoPriceInput {
  customer_id: string;
  pickup_postal_code?: string;
  pickup_city?: string;
  delivery_postal_code?: string;
  delivery_city?: string;
  distance_km: number;
  stops: number;
  pickup_date?: string; // for weekend detection
}

export interface AutoPriceBreakdownLine {
  label: string;
  amount: number;
}

export interface AutoPriceResult {
  calculated: boolean;
  sellPrice: number;
  breakdown: AutoPriceBreakdownLine[];
  contractName: string;
  laneName: string;
  warnings: string[];
}

// Zone matching helpers
function matchesPostcodeRange(postal: string, rules: Record<string, unknown>): boolean {
  const from = String(rules.from || '');
  const to = String(rules.to || '');
  if (!from || !to || !postal) return false;
  const numPostal = postal.replace(/\D/g, '');
  const numFrom = from.replace(/\D/g, '');
  const numTo = to.replace(/\D/g, '');
  return numPostal >= numFrom && numPostal <= numTo;
}

function matchesCity(city: string, rules: Record<string, unknown>): boolean {
  const cities = rules.cities as string[] | undefined;
  if (!cities || !city) return false;
  const normalizedCity = city.toLowerCase().trim();
  return cities.some(c => c.toLowerCase().trim() === normalizedCity);
}

function matchesCountry(countryOrPostal: string, rules: Record<string, unknown>): boolean {
  const countries = rules.countries as string[] | undefined;
  if (!countries) return false;
  // Try to infer country from postal code prefix or direct match
  const normalized = countryOrPostal.toUpperCase().trim();
  return countries.some(c => c.toUpperCase().trim() === normalized);
}

function isWeekend(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export const useAutoPrice = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<AutoPriceResult | null>(null);

  const calculate = useCallback(async (input: AutoPriceInput): Promise<AutoPriceResult> => {
    setIsCalculating(true);
    const warnings: string[] = [];
    const breakdown: AutoPriceBreakdownLine[] = [];

    try {
      // Step 1: Find active customer contract
      const now = new Date().toISOString();
      const { data: contracts, error: contractErr } = await supabase
        .from("rate_contracts")
        .select("*")
        .eq("counterparty_id", input.customer_id)
        .eq("contract_type", "customer")
        .eq("status", "active")
        .lte("effective_from", now)
        .or(`effective_to.is.null,effective_to.gte.${now}`)
        .order("effective_from", { ascending: false })
        .limit(1);

      if (contractErr) throw contractErr;
      if (!contracts || contracts.length === 0) {
        const noContract: AutoPriceResult = {
          calculated: false, sellPrice: 0, breakdown: [], contractName: '', laneName: '',
          warnings: ['Geen actief tarief-contract gevonden voor deze klant'],
        };
        setResult(noContract);
        return noContract;
      }

      const contract = contracts[0];

      // Step 2: Fetch zones for matching
      const { data: zones } = await supabase
        .from("zones")
        .select("*")
        .eq("is_active", true);

      // Step 3: Match pickup → origin zone, delivery → destination zone
      const findZone = (postal?: string, city?: string) => {
        if (!zones) return null;
        for (const zone of zones) {
          const rules = (zone.match_rules_json || {}) as Record<string, unknown>;
          if (zone.match_type === 'postcode_range' && postal && matchesPostcodeRange(postal, rules)) return zone;
          if (zone.match_type === 'city' && city && matchesCity(city, rules)) return zone;
          if (zone.match_type === 'country' && matchesCountry(city || postal || '', rules)) return zone;
        }
        return null;
      };

      const originZone = findZone(input.pickup_postal_code, input.pickup_city);
      const destZone = findZone(input.delivery_postal_code, input.delivery_city);

      if (!originZone) warnings.push('Ophaalzone niet gematcht — valt terug op generieke lane');
      if (!destZone) warnings.push('Afleverzone niet gematcht — valt terug op generieke lane');

      // Step 4: Find matching lane
      const { data: lanes } = await supabase
        .from("rate_lanes")
        .select("*, origin_zone:zones!rate_lanes_origin_zone_id_fkey(id, name), destination_zone:zones!rate_lanes_destination_zone_id_fkey(id, name)")
        .eq("contract_id", contract.id)
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (!lanes || lanes.length === 0) {
        const noLane: AutoPriceResult = {
          calculated: false, sellPrice: 0, breakdown: [], contractName: contract.name, laneName: '',
          warnings: ['Geen tarieflijnen gevonden in dit contract'],
        };
        setResult(noLane);
        return noLane;
      }

      // Try exact zone match first, then fallback to null-zone lanes
      let lane = lanes.find(l =>
        (originZone && l.origin_zone_id === originZone.id) &&
        (destZone && l.destination_zone_id === destZone.id)
      );

      if (!lane) {
        // Try partial matches
        lane = lanes.find(l =>
          (originZone && l.origin_zone_id === originZone.id && !l.destination_zone_id) ||
          (!l.origin_zone_id && destZone && l.destination_zone_id === destZone.id)
        );
      }

      if (!lane) {
        // Fallback: lane with no zone restrictions (generic)
        lane = lanes.find(l => !l.origin_zone_id && !l.destination_zone_id);
      }

      if (!lane) {
        // Last resort: first lane by priority
        lane = lanes[0];
        warnings.push('Geen exacte zone-match — eerste lane op prioriteit gebruikt');
      }

      // Step 5: Calculate price
      const basePrice = Number(lane.base_price) || 0;
      const baseIncludedKm = Number(lane.base_included_km) || 0;
      const pricePerKm = Number(lane.price_per_km) || 0;
      const pricePerStop = Number(lane.price_per_stop) || 0;
      const weekendFee = Number(lane.weekend_fee) || 0;
      const nightFee = Number(lane.night_fee) || 0;
      const timeWindowFee = Number(lane.time_window_fee) || 0;
      const minCharge = Number(lane.min_charge) || 0;

      breakdown.push({ label: 'Basisprijs', amount: basePrice });

      const extraKm = Math.max(0, input.distance_km - baseIncludedKm);
      if (extraKm > 0 && pricePerKm > 0) {
        const kmCharge = extraKm * pricePerKm;
        breakdown.push({ label: `${extraKm.toFixed(1)} km × €${pricePerKm.toFixed(2)}`, amount: kmCharge });
      }

      if (input.stops > 0 && pricePerStop > 0) {
        const stopCharge = input.stops * pricePerStop;
        breakdown.push({ label: `${input.stops} stops × €${pricePerStop.toFixed(2)}`, amount: stopCharge });
      }

      const weekend = isWeekend(input.pickup_date);
      if (weekend && weekendFee > 0) {
        breakdown.push({ label: 'Weekendtoeslag', amount: weekendFee });
      }

      if (timeWindowFee > 0) {
        breakdown.push({ label: 'Tijdvenstertoeslag', amount: timeWindowFee });
      }

      let total = breakdown.reduce((sum, b) => sum + b.amount, 0);

      // Apply min_charge
      if (minCharge > 0 && total < minCharge) {
        warnings.push(`Minimumtarief €${minCharge.toFixed(2)} toegepast`);
        total = minCharge;
      }

      // Step 6: Apply fuel surcharge if linked
      if (lane.fuel_surcharge_rule_id) {
        const { data: rule } = await supabase
          .from("surcharge_rules")
          .select("*")
          .eq("id", lane.fuel_surcharge_rule_id)
          .eq("is_active", true)
          .single();

        if (rule) {
          const payload = (rule.payload_json || {}) as Record<string, unknown>;
          if (rule.method === 'percent') {
            const pct = Number(payload.percentage || 0);
            if (pct > 0) {
              const surcharge = total * (pct / 100);
              breakdown.push({ label: `Brandstoftoeslag ${pct}%`, amount: surcharge });
              total += surcharge;
            }
          } else if (rule.method === 'fixed') {
            const fixedAmount = Number(payload.amount || 0);
            if (fixedAmount > 0) {
              breakdown.push({ label: 'Brandstoftoeslag', amount: fixedAmount });
              total += fixedAmount;
            }
          }
        }
      }

      const laneName = [
        lane.origin_zone?.name || '—',
        '→',
        lane.destination_zone?.name || '—',
      ].join(' ');

      const finalResult: AutoPriceResult = {
        calculated: true,
        sellPrice: Math.round(total * 100) / 100,
        breakdown,
        contractName: contract.name,
        laneName,
        warnings,
      };

      setResult(finalResult);
      return finalResult;
    } catch (err: any) {
      console.error('AutoPrice calculation error:', err);
      const errorResult: AutoPriceResult = {
        calculated: false, sellPrice: 0, breakdown: [], contractName: '', laneName: '',
        warnings: [`Berekeningsfout: ${err.message}`],
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  return { calculate, result, isCalculating, clearResult };
};

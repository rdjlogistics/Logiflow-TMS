import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// CO2 compensatie kosten (€ per ton CO2)
export const CO2_COMPENSATIE_PER_TON = 15; // €15/ton = marktprijs 2026

export function berekenCO2Compensatie(co2_kg: number): number {
  return (co2_kg / 1000) * CO2_COMPENSATIE_PER_TON;
}

// Tank-to-Wheel (TTW) emission factors per km (in kg CO2) per vehicle euro norm
// Source: STREAM transport emissions model (NL)
const TTW_FACTORS: Record<string, number> = {
  euro6: 0.65,
  euro5: 0.75,
  euro4: 0.90,
  euro3: 1.10,
  electric: 0.0,
  hybrid: 0.30,
  default: 0.80,
};

// Well-to-Wheel (WTW) factors include fuel production & distribution (GLEC Framework v3)
// WTW = TTW * WTW multiplier (~1.2 for diesel, ~1.8 for electricity NL mix 2026)
const WTW_MULTIPLIERS: Record<string, number> = {
  euro6: 1.19,
  euro5: 1.19,
  euro4: 1.19,
  euro3: 1.19,
  electric: 1.80, // NL electricity grid mix 2026 (WTW includes power generation)
  hybrid: 1.35,
  default: 1.19,
};

// GHG Protocol Scope classification
export type EmissionScope = 'scope1' | 'scope2' | 'scope3';

function getVehicleKey(vehicleType?: string | null): string {
  if (!vehicleType) return 'default';
  const lower = vehicleType.toLowerCase();
  if (lower.includes('electric') || lower.includes('elektrisch')) return 'electric';
  if (lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('euro 6') || lower.includes('euro6')) return 'euro6';
  if (lower.includes('euro 5') || lower.includes('euro5')) return 'euro5';
  if (lower.includes('euro 4') || lower.includes('euro4')) return 'euro4';
  if (lower.includes('euro 3') || lower.includes('euro3')) return 'euro3';
  return 'default';
}

function getTTWFactor(vehicleType?: string | null): number {
  return TTW_FACTORS[getVehicleKey(vehicleType)];
}

function getWTWFactor(vehicleType?: string | null): number {
  const key = getVehicleKey(vehicleType);
  return TTW_FACTORS[key] * WTW_MULTIPLIERS[key];
}

function getScope(vehicleType?: string | null): EmissionScope {
  const key = getVehicleKey(vehicleType);
  if (key === 'electric') return 'scope2'; // Purchased electricity
  return 'scope1'; // Direct combustion
}

interface CO2TripData {
  id: string;
  trip_date: string;
  distance_km: number | null;
  sales_distance_km: number | null;
  pickup_city: string | null;
  delivery_city: string | null;
  vehicles?: { vehicle_type?: string | null } | null;
}

export interface ScopeBreakdown {
  scope1: number; // Direct emissions (own fleet diesel/gas)
  scope2: number; // Indirect (purchased electricity for EVs)
  scope3: number; // Value chain (subcontracted transport)
}

export interface CO2Summary {
  totalCo2Kg: number;
  totalWtwCo2Kg: number;
  totalTrips: number;
  totalKm: number;
  avgCo2PerTrip: number;
  avgCo2PerKm: number;
  avgWtwPerKm: number;
  scopeBreakdown: ScopeBreakdown;
  monthlyData: { month: string; co2: number; wtw: number; trips: number; km: number }[];
  topRoutes: { route: string; km: number; co2: number; trips: number }[];
  byVehicleType: { name: string; value: number; co2: number; wtw: number; color: string }[];
  glecCompliant: boolean;
}

const COLORS = ['#22c55e', '#3b82f6', '#eab308', '#f97316', '#8b5cf6', '#ec4899'];

export function useCO2Data(year: string, period: string) {
  return useQuery<CO2Summary>({
    queryKey: ['co2-data', year, period],
    queryFn: async () => {
      const yearNum = parseInt(year, 10);
      let fromDate: string;
      let toDate: string;

      const now = new Date();
      if (period === 'year') {
        fromDate = `${yearNum}-01-01`;
        toDate = `${yearNum}-12-31`;
      } else if (period === 'quarter') {
        const q = Math.floor((now.getMonth()) / 3);
        fromDate = `${yearNum}-${String(q * 3 + 1).padStart(2, '0')}-01`;
        toDate = new Date(yearNum, (q + 1) * 3, 0).toISOString().split('T')[0];
      } else if (period === 'month') {
        const m = now.getMonth();
        fromDate = `${yearNum}-${String(m + 1).padStart(2, '0')}-01`;
        toDate = new Date(yearNum, m + 1, 0).toISOString().split('T')[0];
      } else {
        const mon = new Date(now);
        mon.setDate(now.getDate() - now.getDay() + 1);
        fromDate = mon.toISOString().split('T')[0];
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        toDate = sun.toISOString().split('T')[0];
      }

      const { data: trips, error } = await supabase
        .from('trips')
        .select(`
          id,
          trip_date,
          distance_km,
          sales_distance_km,
          pickup_city,
          delivery_city,
          vehicles (vehicle_type)
        `)
        .gte('trip_date', fromDate)
        .lte('trip_date', toDate)
        .in('status', ['afgerond', 'gecontroleerd', 'gefactureerd', 'afgeleverd'])
        .not('distance_km', 'is', null)
        .limit(500);

      if (error) throw error;

      const tripList = (trips || []) as unknown as CO2TripData[];

      let totalCo2 = 0;
      let totalWtw = 0;
      let totalKm = 0;
      const scopeBreakdown: ScopeBreakdown = { scope1: 0, scope2: 0, scope3: 0 };
      const monthlyMap = new Map<string, { co2: number; wtw: number; trips: number; km: number }>();
      const routeMap = new Map<string, { km: number; co2: number; trips: number }>();
      const vehicleTypeMap = new Map<string, { trips: number; co2: number; wtw: number }>();

      for (const trip of tripList) {
        const km = trip.distance_km || trip.sales_distance_km || 0;
        if (km === 0) continue;

        const vehicleType = (trip.vehicles as { vehicle_type?: string | null } | null)?.vehicle_type ?? null;
        const ttw = km * getTTWFactor(vehicleType);
        const wtw = km * getWTWFactor(vehicleType);
        const scope = getScope(vehicleType);

        totalCo2 += ttw;
        totalWtw += wtw;
        totalKm += km;
        scopeBreakdown[scope] += wtw;

        // Monthly
        const monthKey = trip.trip_date.substring(0, 7);
        const existing = monthlyMap.get(monthKey) || { co2: 0, wtw: 0, trips: 0, km: 0 };
        monthlyMap.set(monthKey, { co2: existing.co2 + ttw, wtw: existing.wtw + wtw, trips: existing.trips + 1, km: existing.km + km });

        // Routes
        if (trip.pickup_city && trip.delivery_city) {
          const routeKey = `${trip.pickup_city} - ${trip.delivery_city}`;
          const r = routeMap.get(routeKey) || { km: 0, co2: 0, trips: 0 };
          routeMap.set(routeKey, { km: r.km + km, co2: r.co2 + ttw, trips: r.trips + 1 });
        }

        // Vehicle types
        const vtKey = vehicleType || 'Onbekend';
        const vt = vehicleTypeMap.get(vtKey) || { trips: 0, co2: 0, wtw: 0 };
        vehicleTypeMap.set(vtKey, { trips: vt.trips + 1, co2: vt.co2 + ttw, wtw: vt.wtw + wtw });
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
      const monthlyData = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => ({
          month: monthNames[parseInt(key.split('-')[1], 10) - 1],
          co2: Math.round(val.co2),
          wtw: Math.round(val.wtw),
          trips: val.trips,
          km: Math.round(val.km),
        }));

      const topRoutes = Array.from(routeMap.entries())
        .sort(([, a], [, b]) => b.co2 - a.co2)
        .slice(0, 5)
        .map(([route, val]) => ({
          route,
          km: Math.round(val.km / val.trips),
          co2: Math.round(val.co2 / val.trips),
          trips: val.trips,
        }));

      const byVehicleType = Array.from(vehicleTypeMap.entries())
        .sort(([, a], [, b]) => b.trips - a.trips)
        .map(([name, val], i) => ({
          name: name.length > 20 ? name.substring(0, 20) + '...' : name,
          value: val.trips,
          co2: Math.round(val.co2),
          wtw: Math.round(val.wtw),
          color: COLORS[i % COLORS.length],
        }));

      return {
        totalCo2Kg: Math.round(totalCo2),
        totalWtwCo2Kg: Math.round(totalWtw),
        totalTrips: tripList.length,
        totalKm: Math.round(totalKm),
        avgCo2PerTrip: tripList.length > 0 ? Math.round(totalCo2 / tripList.length) : 0,
        avgCo2PerKm: totalKm > 0 ? Math.round((totalCo2 / totalKm) * 100) / 100 : 0,
        avgWtwPerKm: totalKm > 0 ? Math.round((totalWtw / totalKm) * 100) / 100 : 0,
        scopeBreakdown: {
          scope1: Math.round(scopeBreakdown.scope1),
          scope2: Math.round(scopeBreakdown.scope2),
          scope3: Math.round(scopeBreakdown.scope3),
        },
        monthlyData,
        topRoutes,
        byVehicleType,
        glecCompliant: true,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

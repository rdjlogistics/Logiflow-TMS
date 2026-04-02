import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighbor(stops: { lat: number; lng: number; id: string }[]): string[] {
  if (stops.length <= 2) return stops.map(s => s.id);
  const visited = new Set<number>();
  const order: number[] = [0];
  visited.add(0);
  for (let i = 1; i < stops.length; i++) {
    const last = stops[order[order.length - 1]];
    let bestIdx = -1, bestDist = Infinity;
    for (let j = 0; j < stops.length; j++) {
      if (visited.has(j)) continue;
      const d = haversine(last.lat, last.lng, stops[j].lat, stops[j].lng);
      if (d < bestDist) { bestDist = d; bestIdx = j; }
    }
    if (bestIdx >= 0) { order.push(bestIdx); visited.add(bestIdx); }
  }
  return order.map(i => stops[i].id);
}

function twoOpt(stops: { lat: number; lng: number; id: string }[], order: string[]): string[] {
  const idxMap = new Map(stops.map((s, i) => [s.id, i]));
  const indices = order.map(id => idxMap.get(id)!);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < indices.length - 1; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        const dOld = haversine(stops[indices[i - 1]].lat, stops[indices[i - 1]].lng, stops[indices[i]].lat, stops[indices[i]].lng) +
          (j + 1 < indices.length ? haversine(stops[indices[j]].lat, stops[indices[j]].lng, stops[indices[j + 1]].lat, stops[indices[j + 1]].lng) : 0);
        const dNew = haversine(stops[indices[i - 1]].lat, stops[indices[i - 1]].lng, stops[indices[j]].lat, stops[indices[j]].lng) +
          (j + 1 < indices.length ? haversine(stops[indices[i]].lat, stops[indices[i]].lng, stops[indices[j + 1]].lat, stops[indices[j + 1]].lng) : 0);
        if (dNew < dOld - 0.01) {
          indices.splice(i, j - i + 1, ...indices.slice(i, j + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return indices.map(i => stops[i].id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: _u }, error: ce } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (ce || !_u) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const cd = { claims: { sub: _u.id } };

    const { stops, optimize } = await req.json();
    if (!stops?.length) return new Response(JSON.stringify({ error: "Geen stops opgegeven" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[ai-route-optimizer] Optimizing ${stops.length} stops for user=${cd.claims.sub}`);

    // Nearest-neighbor + 2-opt
    const nnOrder = nearestNeighbor(stops);
    const optimizedOrder = twoOpt(stops, nnOrder);

    // Calculate total distance
    const idxMap = new Map(stops.map((s: any, i: number) => [s.id, i]));
    let totalDistance = 0;
    for (let i = 1; i < optimizedOrder.length; i++) {
      const a = stops[idxMap.get(optimizedOrder[i - 1])!];
      const b = stops[idxMap.get(optimizedOrder[i])!];
      totalDistance += haversine(a.lat, a.lng, b.lat, b.lng);
    }

    // Original distance for comparison
    let originalDistance = 0;
    for (let i = 1; i < stops.length; i++) {
      originalDistance += haversine(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
    }

    const savingsPercent = originalDistance > 0 ? Math.round((1 - totalDistance / originalDistance) * 100) : 0;
    console.log(`[ai-route-optimizer] Original=${originalDistance.toFixed(1)}km, Optimized=${totalDistance.toFixed(1)}km, Savings=${savingsPercent}%`);

    return new Response(JSON.stringify({
      optimizedOrder,
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      originalDistanceKm: Math.round(originalDistance * 10) / 10,
      savingsPercent: Math.max(0, savingsPercent),
      stopsCount: stops.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-route-optimizer] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

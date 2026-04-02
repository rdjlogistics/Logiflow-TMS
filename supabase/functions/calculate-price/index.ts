import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json();
    const { origin_city, destination_city, distance_km, vehicle_type } = body;
    
    if (!origin_city || !destination_city || !distance_km) {
      return new Response(JSON.stringify({ error: "origin_city, destination_city en distance_km zijn verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dist = Number(distance_km) || 0;

    // Get user's company
    const { data: profile } = await supabaseAdmin.from("profiles").select("company_id").eq("id", user.id).single();
    const tenantId = profile?.company_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch active pricing rules
    const { data: rules = [] } = await supabaseAdmin
      .from("pricing_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    // Fetch active surge factors
    const { data: factors = [] } = await supabaseAdmin
      .from("surge_factors")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    // Fetch lane pricing if available
    const { data: lanePricings = [] } = await supabaseAdmin
      .from("lane_pricing")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    // Calculate base price from lane pricing or default rate
    let baseRatePerKm = 1.50; // default €1.50/km
    let baseCharge = 0;

    // Check lane pricing for matching origin/destination
    const matchingLane = lanePricings.find((lp: any) => {
      const originMatch = !lp.origin_region || origin_city.toLowerCase().includes(lp.origin_region.toLowerCase());
      const destMatch = !lp.destination_region || destination_city.toLowerCase().includes(lp.destination_region.toLowerCase());
      return originMatch && destMatch;
    });

    if (matchingLane) {
      baseRatePerKm = matchingLane.rate_per_km || baseRatePerKm;
      baseCharge = matchingLane.minimum_charge || 0;
      // Check vehicle-specific rate
      if (vehicle_type && matchingLane.vehicle_rates_json && matchingLane.vehicle_rates_json[vehicle_type]) {
        baseRatePerKm = matchingLane.vehicle_rates_json[vehicle_type];
      }
    }

    const distanceCharge = dist * baseRatePerKm;
    baseCharge = Math.max(baseCharge, distanceCharge);

    // Apply pricing rules
    const adjustments: Array<{ name: string; type: string; value: number }> = [];
    let surgeCharge = 0;
    let discounts = 0;
    let minPrice: number | null = null;
    let maxPrice: number | null = null;

    for (const rule of rules) {
      const r = rule as any;
      switch (r.rule_type) {
        case 'base': {
          const adj = r.adjustment_type === 'percentage' 
            ? baseCharge * (r.adjustment_value / 100)
            : r.adjustment_type === 'per_km' 
            ? dist * r.adjustment_value
            : r.adjustment_value;
          baseCharge += adj;
          adjustments.push({ name: r.name, type: r.adjustment_type, value: r.adjustment_value });
          break;
        }
        case 'surge': {
          const adj = r.adjustment_type === 'percentage'
            ? baseCharge * (r.adjustment_value / 100)
            : r.adjustment_value;
          surgeCharge += adj;
          adjustments.push({ name: r.name, type: r.adjustment_type, value: r.adjustment_value });
          break;
        }
        case 'discount': {
          const adj = r.adjustment_type === 'percentage'
            ? baseCharge * (r.adjustment_value / 100)
            : r.adjustment_value;
          discounts += Math.abs(adj);
          adjustments.push({ name: r.name, type: r.adjustment_type, value: -Math.abs(r.adjustment_value) });
          break;
        }
        case 'minimum':
          minPrice = r.adjustment_value;
          break;
        case 'maximum':
          maxPrice = r.adjustment_value;
          break;
      }
    }

    // Apply surge factors
    const surgeMultiplier = factors.reduce((acc: number, f: any) => acc * (f.multiplier || 1), 1);
    if (surgeMultiplier !== 1) {
      const surgeDelta = baseCharge * (surgeMultiplier - 1);
      surgeCharge += surgeDelta;
      adjustments.push({ name: "Surge factors", type: "surge_factor", value: surgeMultiplier });
    }

    let finalPrice = baseCharge + surgeCharge - discounts;

    // Apply min/max
    if (minPrice !== null) finalPrice = Math.max(finalPrice, minPrice);
    if (maxPrice !== null) finalPrice = Math.min(finalPrice, maxPrice);

    // Ensure non-negative
    finalPrice = Math.max(0, finalPrice);

    // Save calculation to history
    try {
      await supabaseAdmin.from("price_calculations").insert({
        tenant_id: tenantId,
        origin_city,
        destination_city,
        distance_km: dist,
        vehicle_type: vehicle_type || null,
        base_price: baseCharge,
        lane_adjustment: 0,
        surge_adjustment: surgeCharge,
        discount_adjustment: discounts,
        calculated_price: finalPrice,
        rules_applied_json: adjustments,
        surge_factors_json: factors.map((f: any) => ({ name: f.name, multiplier: f.multiplier })),
        surge_multiplier: surgeMultiplier,
      });
    } catch (e) {
      console.warn("[calculate-price] Could not save calculation:", e);
    }

    return new Response(JSON.stringify({
      base_price: baseCharge,
      final_price: finalPrice,
      surge_multiplier: surgeMultiplier,
      adjustments,
      breakdown: {
        distance_charge: distanceCharge,
        base_charge: baseCharge,
        surge_charge: surgeCharge,
        discounts,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[calculate-price] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

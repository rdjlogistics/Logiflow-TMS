import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: ce } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (ce || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const cd = { claims: { sub: user.id } };
    

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userId = cd.claims.sub as string;

    // Get tenant
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", userId).eq("is_primary", true).single();
    if (!uc) return new Response(JSON.stringify({ error: "Geen bedrijf gevonden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { orderId, pickupLocation, deliveryLocation, pickupTime, requiredSkills, vehicleRequirements, priority } = body;

    console.log(`[intelligent-dispatch] Order=${orderId}, tenant=${uc.company_id}, priority=${priority || 'normal'}`);

    // Get available drivers with their workload
    const today = new Date().toISOString().split("T")[0];
    const [{ data: drivers }, { data: todayTrips }] = await Promise.all([
      supabaseAdmin.from("drivers").select("id, name, phone, rating, is_active, current_city, driver_category").eq("tenant_id", uc.company_id).eq("is_active", true).limit(50),
      supabaseAdmin.from("trips").select("driver_id").eq("company_id", uc.company_id).gte("trip_date", today).lte("trip_date", today + "T23:59:59"),
    ]);

    if (!drivers?.length) {
      return new Response(JSON.stringify({ recommendations: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build workload map
    const workloadMap = new Map<string, number>();
    (todayTrips || []).forEach((t: any) => {
      if (t.driver_id) workloadMap.set(t.driver_id, (workloadMap.get(t.driver_id) || 0) + 1);
    });

    // Try AI-based scoring
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let recommendations: any[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const driverSummary = drivers.slice(0, 20).map((d: any, i: number) => ({
          id: d.id,
          name: d.name || "Onbekend",
          workload: workloadMap.get(d.id) || 0,
          rating: d.rating || 3,
        }));

        const model = "google/gemini-2.5-flash-lite";
        console.log(`[intelligent-dispatch] Using AI model=${model} for ${driverSummary.length} drivers`);

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "Je bent een dispatch optimalisatie engine. Score chauffeurs op basis van werkdruk en beschikbaarheid. Antwoord als JSON array met {driverId, score (0-100), reason}." },
              { role: "user", content: `Order: pickup=${pickupLocation?.city || 'onbekend'}, delivery=${deliveryLocation?.city || 'onbekend'}, time=${pickupTime}, priority=${priority || 'normal'}\n\nChauffeurs:\n${JSON.stringify(driverSummary)}` },
            ],
          }),
        });

        if (resp.ok) {
          const aiData = await resp.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            recommendations = parsed.map((r: any, i: number) => {
              const driver = drivers.find((d: any) => d.id === r.driverId);
              const wl = workloadMap.get(r.driverId) || 0;
              return {
                driverId: r.driverId,
                driverName: driver?.name || "Onbekend",
                score: r.score || (90 - i * 10),
                factors: [
                  { name: "AI Score", score: r.score || 80, weight: 0.6, description: r.reason || "AI analyse" },
                  { name: "Werkdruk", score: Math.max(20, 100 - wl * 15), weight: 0.4, description: `${wl} ritten vandaag` },
                ],
                estimatedArrival: pickupTime,
                distanceToPickup: 10 + i * 5,
                workloadImpact: (wl < 3 ? "low" : wl < 6 ? "medium" : "high"),
                recommendation: (i === 0 ? "highly_recommended" : i < 3 ? "recommended" : "acceptable"),
              };
            });
          }
        } else {
          const status = resp.status;
          console.warn(`[intelligent-dispatch] AI returned ${status}, falling back to local scoring`);
          if (status === 402 || status === 429) {
            return new Response(JSON.stringify({ error: status === 402 ? "AI credits niet beschikbaar" : "AI tijdelijk niet beschikbaar" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch (aiErr) {
        console.warn("[intelligent-dispatch] AI error, using fallback:", aiErr);
      }
    }

    // Fallback: local workload-based scoring
    if (recommendations.length === 0) {
      recommendations = drivers
        .sort((a: any, b: any) => (workloadMap.get(a.id) || 0) - (workloadMap.get(b.id) || 0))
        .slice(0, 5)
        .map((d: any, i: number) => {
          const wl = workloadMap.get(d.id) || 0;
          return {
            driverId: d.id,
            driverName: d.name || "Onbekend",
            score: Math.max(50, 95 - i * 10 - wl * 5),
            factors: [{ name: "Werkdruk", score: Math.max(20, 100 - wl * 15), weight: 1.0, description: `${wl} ritten vandaag` }],
            estimatedArrival: pickupTime,
            distanceToPickup: 10 + i * 5,
            workloadImpact: (wl < 3 ? "low" : wl < 6 ? "medium" : "high"),
            recommendation: (i === 0 ? "highly_recommended" : i < 3 ? "recommended" : "acceptable"),
            isFallback: true,
          };
        });
    }

    console.log(`[intelligent-dispatch] Returning ${recommendations.length} recommendations`);
    return new Response(JSON.stringify({ recommendations }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[intelligent-dispatch] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

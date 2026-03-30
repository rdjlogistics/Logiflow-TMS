import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: cd, error: ce } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { tripId } = await req.json();
    if (!tripId) return new Response(JSON.stringify({ error: "tripId verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[live-eta] Calculating ETA for trip ${tripId}`);

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: trip } = await supabaseAdmin.from("trips").select("id, delivery_latitude, delivery_longitude, status").eq("id", tripId).single();

    if (!trip) return new Response(JSON.stringify({ error: "Rit niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get latest location
    const { data: loc } = await supabaseAdmin.from("driver_locations").select("latitude, longitude, recorded_at").eq("trip_id", tripId).order("recorded_at", { ascending: false }).limit(1).single();

    let eta = null;
    if (loc && trip.delivery_latitude && trip.delivery_longitude) {
      // Simple distance-based ETA estimate
      const R = 6371;
      const dLat = (trip.delivery_latitude - loc.latitude) * Math.PI / 180;
      const dLon = (trip.delivery_longitude - loc.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(loc.latitude * Math.PI / 180) * Math.cos(trip.delivery_latitude * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const avgSpeed = 60; // km/h
      const minutes = Math.round((dist / avgSpeed) * 60);
      eta = new Date(Date.now() + minutes * 60000).toISOString();
    }

    return new Response(JSON.stringify({ success: true, eta, trip_id: tripId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[live-eta] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

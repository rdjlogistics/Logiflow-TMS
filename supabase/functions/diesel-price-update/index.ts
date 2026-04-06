import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate auth: accept both service-role (cron) and user JWT (dashboard widget)
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== serviceKey) {
        const { data: { user }, error: authErr } = await createClient(supabaseUrl, anonKey).auth.getUser(token);
        if (authErr || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Get all active diesel staffels
    const { data: staffels, error } = await supabaseAdmin
      .from("diesel_staffels")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    // For each staffel, calculate current surcharge and update history
    const results = [];
    for (const staffel of staffels || []) {
      if (!staffel.current_market_price) continue;

      const history = Array.isArray(staffel.price_history) ? staffel.price_history : [];
      const today = new Date().toISOString().split("T")[0];

      // Only add entry if today's date doesn't exist yet
      const alreadyLogged = history.some((h: any) => h.date === today);
      if (!alreadyLogged) {
        history.push({ date: today, price: staffel.current_market_price });
        // Keep last 365 entries max
        const trimmed = history.slice(-365);

        const { error: updateError } = await supabaseAdmin
          .from("diesel_staffels")
          .update({
            price_history: trimmed,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", staffel.id);

        if (updateError) {
          console.error(`Error updating staffel ${staffel.id}:`, updateError);
        } else {
          results.push({ id: staffel.id, name: staffel.name, price: staffel.current_market_price });
        }
      }
    }

    console.log(`[diesel-price-update] Updated ${results.length} staffels`);

    return new Response(
      JSON.stringify({ success: true, updated: results.length, staffels: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[diesel-price-update] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

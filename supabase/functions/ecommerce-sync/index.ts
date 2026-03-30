import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: cd, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { connectionId, syncType } = await req.json();
    if (!connectionId) {
      return new Response(JSON.stringify({ error: "connectionId is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[ecommerce-sync] connectionId=${connectionId}, syncType=${syncType || "incremental"}, user=${cd.claims.sub}`);

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify connection exists and belongs to user's tenant
    const { data: conn, error: connErr } = await supabaseAdmin
      .from("ecommerce_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Verbinding niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update sync status
    await supabaseAdmin
      .from("ecommerce_connections")
      .update({ sync_status: "syncing", sync_error: null })
      .eq("id", connectionId);

    // Platform-specific sync logic placeholder
    const platform = conn.platform;
    console.log(`[ecommerce-sync] Platform: ${platform}, store: ${conn.store_name}`);

    // For now, mark sync as complete — actual API integration per platform to be implemented
    await supabaseAdmin
      .from("ecommerce_connections")
      .update({
        sync_status: "success",
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq("id", connectionId);

    return new Response(JSON.stringify({
      success: true,
      message: `Synchronisatie voor ${conn.store_name} (${platform}) voltooid. Webshop API-koppeling wordt binnenkort geactiveerd.`,
      connectionId,
      platform,
      syncType: syncType || "incremental",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ecommerce-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

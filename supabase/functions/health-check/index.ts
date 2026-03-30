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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Test DB connectivity
    const { count, error: dbErr } = await supabaseAdmin
      .from("companies")
      .select("id", { count: "exact", head: true });

    const checks = {
      database: !dbErr,
      edge_functions: true,
      mollie: !!Deno.env.get("MOLLIE_API_KEY"),
      resend: !!Deno.env.get("RESEND_API_KEY"),
      mapbox: !!Deno.env.get("MAPBOX_PUBLIC_TOKEN"),
      openai: !!Deno.env.get("OPENAI_API_KEY"),
      vapid: !!Deno.env.get("VAPID_PUBLIC_KEY") && !!Deno.env.get("VAPID_PRIVATE_KEY"),
    };

    const allHealthy = Object.values(checks).every(Boolean);

    console.log(`[health-check] Status: ${allHealthy ? "healthy" : "degraded"}`, checks);

    return new Response(
      JSON.stringify({
        status: allHealthy ? "healthy" : "degraded",
        checks,
        timestamp: new Date().toISOString(),
        companies_count: count,
      }),
      {
        status: allHealthy ? 200 : 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[health-check] Error:", err);
    return new Response(
      JSON.stringify({ status: "error", error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

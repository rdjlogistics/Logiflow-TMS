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

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify admin
    const { data: adminRole } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", cd.claims.sub).eq("role", "admin").single();
    if (!adminRole) return new Response(JSON.stringify({ error: "Admin vereist" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", cd.claims.sub).eq("is_primary", true).single();

    // Test: can only see own company data
    const { data: companies } = await supabase.from("companies").select("id");
    const isolation = companies?.every((c: any) => c.id === uc?.company_id) ?? true;

    console.log(`[test-tenant-isolation] Result: ${isolation ? "PASS" : "FAIL"}`);

    return new Response(JSON.stringify({
      success: true, isolation_test: isolation ? "pass" : "fail",
      own_company: uc?.company_id, visible_companies: companies?.length || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[test-tenant-isolation] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

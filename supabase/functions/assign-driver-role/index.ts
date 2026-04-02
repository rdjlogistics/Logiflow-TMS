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
    const callerUserId = cd.claims.sub as string;

    // Verify caller is admin
    const { data: adminRole } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", callerUserId).eq("role", "admin").single();
    if (!adminRole) return new Response(JSON.stringify({ error: "Alleen admins kunnen rollen toewijzen" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { userId, companyId } = await req.json();
    if (!userId) return new Response(JSON.stringify({ error: "userId is vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get caller's company if not provided
    let targetCompanyId = companyId;
    if (!targetCompanyId) {
      const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", callerUserId).eq("is_primary", true).single();
      targetCompanyId = uc?.company_id;
    }
    if (!targetCompanyId) return new Response(JSON.stringify({ error: "Geen bedrijf gevonden" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[assign-driver-role] Assigning chauffeur role to ${userId} in company ${targetCompanyId}`);

    // Upsert role (delete-then-insert to avoid conflicts)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "chauffeur" });
    if (roleErr) throw roleErr;

    // Link to company
    const { error: ucErr } = await supabaseAdmin.from("user_companies").upsert(
      { user_id: userId, company_id: targetCompanyId, is_primary: true },
      { onConflict: "user_id,company_id" }
    );
    if (ucErr) throw ucErr;

    console.log(`[assign-driver-role] Success: ${userId} is now chauffeur in ${targetCompanyId}`);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[assign-driver-role] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: _u }, error: ce } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (ce || !_u) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const cd = { claims: { sub: _u.id } };
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", cd.claims.sub).eq("is_primary", true).single();
    if (!uc?.company_id) return new Response(JSON.stringify({ error: "Geen bedrijf" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { carrierId, email, name, role } = await req.json();
    if (!carrierId || !email || !name) return new Response(JSON.stringify({ error: "carrierId, email en name verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[create-carrier-user] Creating carrier user: ${email} for carrier ${carrierId}`);

    const { data: carrier } = await supabaseAdmin.from("carriers").select("id, tenant_id").eq("id", carrierId).single();
    if (!carrier || carrier.tenant_id !== uc.company_id) return new Response(JSON.stringify({ error: "Vervoerder niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
    let portalUserId: string;

    if (existingUser) {
      portalUserId = existingUser.id;
    } else {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password: crypto.randomUUID() + "Dd4$", email_confirm: true,
        user_metadata: { full_name: name, is_carrier_contact: true },
      });
      if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      portalUserId = newUser.user.id;
    }

    await supabaseAdmin.from("user_roles").upsert({ user_id: portalUserId, role: "carrier" }, { onConflict: "user_id,role" });
    await supabaseAdmin.from("user_companies").upsert({ user_id: portalUserId, company_id: uc.company_id, is_primary: true }, { onConflict: "user_id,company_id" });
    await supabaseAdmin.from("carrier_contacts").upsert({
      carrier_id: carrierId, tenant_id: uc.company_id, user_id: portalUserId,
      name, email, portal_access: true, portal_role: role || "viewer",
    }, { onConflict: "carrier_id,user_id" }).select().maybeSingle();
    await supabaseAdmin.from("profiles").upsert({ user_id: portalUserId, full_name: name, email }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ success: true, user_id: portalUserId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[create-carrier-user] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

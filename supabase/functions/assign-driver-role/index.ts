import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: { userId?: string; companyId?: string } = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const callerUserId = user.id;
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = Boolean(adminRole);
    let targetUserId = payload.userId?.trim();
    let targetCompanyId = payload.companyId?.trim();

    if (isAdmin) {
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "userId is vereist" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!targetCompanyId) {
        const { data: callerCompany } = await supabaseAdmin
          .from("user_companies")
          .select("company_id")
          .eq("user_id", callerUserId)
          .eq("is_primary", true)
          .maybeSingle();

        targetCompanyId = callerCompany?.company_id;
      }

      if (!targetCompanyId) {
        return new Response(JSON.stringify({ error: "Geen bedrijf gevonden" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: callerMembership } = await supabaseAdmin
        .from("user_companies")
        .select("company_id")
        .eq("user_id", callerUserId)
        .eq("company_id", targetCompanyId)
        .maybeSingle();

      if (!callerMembership) {
        return new Response(JSON.stringify({ error: "Geen toegang tot dit bedrijf" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      targetUserId = callerUserId;

      const { data: driver } = await supabaseAdmin
        .from("drivers")
        .select("tenant_id")
        .eq("user_id", callerUserId)
        .maybeSingle();

      if (!driver?.tenant_id) {
        return new Response(JSON.stringify({ error: "Account aangemaakt, maar nog niet aan een bedrijf gekoppeld of goedgekeurd." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      targetCompanyId = driver.tenant_id;
    }

    console.log(`[assign-driver-role] Assigning chauffeur role to ${targetUserId} in company ${targetCompanyId}`);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: "chauffeur" }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    const { error: ucErr } = await supabaseAdmin
      .from("user_companies")
      .upsert({ user_id: targetUserId, company_id: targetCompanyId, is_primary: true }, { onConflict: "user_id,company_id" });
    if (ucErr) throw ucErr;

    console.log(`[assign-driver-role] Success: ${targetUserId} is now chauffeur in ${targetCompanyId}`);
    return new Response(JSON.stringify({ success: true, user_id: targetUserId, company_id: targetCompanyId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[assign-driver-role] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Interne serverfout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

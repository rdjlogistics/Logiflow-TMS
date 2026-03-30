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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles").select("id")
      .eq("user_id", userId).eq("role", "admin").single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin rechten vereist" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: uc } = await supabaseAdmin
      .from("user_companies").select("company_id")
      .eq("user_id", userId).eq("is_primary", true).single();

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId is verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === userId) {
      return new Response(JSON.stringify({ error: "Je kunt jezelf niet verwijderen" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[remove-staff-account] Removing user ${targetUserId} by admin ${userId}`);

    // Verify target user is in same company
    const { data: targetUc } = await supabaseAdmin
      .from("user_companies").select("company_id")
      .eq("user_id", targetUserId).eq("company_id", uc!.company_id).single();

    if (!targetUc) {
      return new Response(JSON.stringify({ error: "Gebruiker niet gevonden in dit bedrijf" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove company link
    await supabaseAdmin.from("user_companies")
      .delete().eq("user_id", targetUserId).eq("company_id", uc!.company_id);

    // Remove roles
    await supabaseAdmin.from("user_roles")
      .delete().eq("user_id", targetUserId);

    console.log(`[remove-staff-account] Success: removed ${targetUserId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[remove-staff-account] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

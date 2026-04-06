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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role client to validate the JWT token directly
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) {
      console.error("[ensure-user-company] Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has a company link
    const { data: existing } = await admin
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      console.log(`[ensure-user-company] User ${user.id} already linked to company ${existing.company_id}`);
      return new Response(JSON.stringify({ company_id: existing.company_id, created: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Derive company name from email domain or user metadata
    const email = user.email || "";
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;
    let companyName = "Mijn Bedrijf";

    if (email) {
      const domain = email.split("@")[1];
      if (domain && !["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "live.nl", "ziggo.nl", "kpnmail.nl", "icloud.com"].includes(domain.toLowerCase())) {
        // Use domain as company name hint
        companyName = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
      } else if (fullName) {
        companyName = `${fullName}'s Bedrijf`;
      }
    }

    console.log(`[ensure-user-company] Creating company "${companyName}" for user ${user.id} (${email})`);

    // Create company
    const { data: newCompany, error: companyError } = await admin
      .from("companies")
      .insert({
        name: companyName,
        email: email || null,
        country: "Nederland",
        is_active: true,
        settings: {},
      })
      .select("id")
      .single();

    if (companyError) {
      console.error("[ensure-user-company] Failed to create company:", companyError);
      return new Response(JSON.stringify({ error: "Failed to create company" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link user to company
    const { error: linkError } = await admin
      .from("user_companies")
      .insert({
        user_id: user.id,
        company_id: newCompany.id,
        is_primary: true,
      });

    if (linkError) {
      console.error("[ensure-user-company] Failed to link user to company:", linkError);
      return new Response(JSON.stringify({ error: "Failed to link user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create tenant_settings with onboarding not completed
    const { error: settingsError } = await admin
      .from("tenant_settings")
      .insert({
        company_id: newCompany.id,
        onboarding_completed_at: null,
      });

    if (settingsError) {
      // Non-fatal: tenant_settings might already exist or have different schema
      console.warn("[ensure-user-company] tenant_settings insert warning:", settingsError.message);
    }

    console.log(`[ensure-user-company] Successfully created company ${newCompany.id} for user ${user.id}`);

    return new Response(JSON.stringify({ company_id: newCompany.id, created: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ensure-user-company] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

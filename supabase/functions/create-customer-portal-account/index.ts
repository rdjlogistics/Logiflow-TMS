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

    const { data: uc } = await supabaseAdmin
      .from("user_companies").select("company_id")
      .eq("user_id", userId).eq("is_primary", true).single();

    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { customerId, email, sendEmail } = await req.json();
    if (!customerId || !email) {
      return new Response(JSON.stringify({ error: "customerId en email zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[create-customer-portal] Creating portal for customer ${customerId}, email: ${email}`);

    const { data: customer } = await supabaseAdmin
      .from("customers").select("id, company_name, tenant_id")
      .eq("id", customerId).single();

    if (!customer || customer.tenant_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Klant niet gevonden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let portalUserId: string;

    if (existingUser) {
      portalUserId = existingUser.id;
    } else {
      const tempPassword = crypto.randomUUID() + "Bb2@";
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: customer.company_name, is_customer: true },
      });

      if (createErr) {
        console.error("[create-customer-portal] Create user error:", createErr);
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      portalUserId = newUser.user.id;
    }

    // Assign klant role
    await supabaseAdmin.from("user_roles")
      .upsert({ user_id: portalUserId, role: "klant" }, { onConflict: "user_id,role" });

    // Link to company
    await supabaseAdmin.from("user_companies")
      .upsert({ user_id: portalUserId, company_id: uc.company_id, is_primary: true }, { onConflict: "user_id,company_id" });

    // Link customer record
    await supabaseAdmin.from("customers")
      .update({ user_id: portalUserId })
      .eq("id", customerId);

    // Create profile
    await supabaseAdmin.from("profiles")
      .upsert({ user_id: portalUserId, full_name: customer.company_name, email }, { onConflict: "user_id" });

    if (sendEmail) {
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: "https://rdjlogistics.nl/portal/login" },
      });
    }

    console.log(`[create-customer-portal] Success: customer ${customerId} → user ${portalUserId}`);

    return new Response(
      JSON.stringify({ success: true, user_id: portalUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-customer-portal] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

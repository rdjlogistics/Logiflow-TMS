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
    const { data: { user }, error: claimsError } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (claimsError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const claimsData = { claims: { sub: user.id } };
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

    const { driverId, email, sendEmail } = await req.json();
    if (!driverId || !email) {
      return new Response(JSON.stringify({ error: "driverId en email zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[create-driver-portal] Creating portal for driver ${driverId}, email: ${email}`);

    // Verify driver belongs to tenant
    const { data: driver } = await supabaseAdmin
      .from("drivers").select("id, name, tenant_id")
      .eq("id", driverId).single();

    if (!driver || driver.tenant_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Chauffeur niet gevonden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let portalUserId: string;

    if (existingUser) {
      portalUserId = existingUser.id;
      console.log(`[create-driver-portal] User already exists: ${portalUserId}`);
    } else {
      // Create new user with magic link
      const tempPassword = crypto.randomUUID() + "Aa1!";
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: driver.name, is_driver: true },
      });

      if (createErr) {
        console.error("[create-driver-portal] Create user error:", createErr);
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      portalUserId = newUser.user.id;
      console.log(`[create-driver-portal] Created user: ${portalUserId}`);
    }

    // Assign chauffeur role
    await supabaseAdmin.from("user_roles")
      .upsert({ user_id: portalUserId, role: "chauffeur" }, { onConflict: "user_id,role" });

    // Link to company
    await supabaseAdmin.from("user_companies")
      .upsert({ user_id: portalUserId, company_id: uc.company_id, is_primary: true }, { onConflict: "user_id,company_id" });

    // Link driver record
    await supabaseAdmin.from("drivers")
      .update({ user_id: portalUserId, email })
      .eq("id", driverId);

    // Create profile
    await supabaseAdmin.from("profiles")
      .upsert({ user_id: portalUserId, full_name: driver.name, email }, { onConflict: "user_id" });

    // Send magic link if requested
    if (sendEmail) {
      const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: "https://rdjlogistics.nl/driver" },
      });
      if (linkErr) {
        console.warn("[create-driver-portal] Magic link error:", linkErr);
      }
    }

    console.log(`[create-driver-portal] Success: driver ${driverId} → user ${portalUserId}`);

    return new Response(
      JSON.stringify({ success: true, user_id: portalUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-driver-portal] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

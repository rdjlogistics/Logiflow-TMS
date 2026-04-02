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

    // Verify admin role
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

    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, fullName, role } = await req.json();
    if (!email || !fullName) {
      return new Response(JSON.stringify({ error: "email en fullName zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const staffRole = role || "medewerker";
    console.log(`[create-staff-account] Creating staff: ${email}, role: ${staffRole}`);

    // Check existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    let staffUserId: string;

    if (existingUser) {
      staffUserId = existingUser.id;
    } else {
      const tempPassword = crypto.randomUUID() + "Cc3#";
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, invited_by: userId },
      });

      if (createErr) {
        console.error("[create-staff-account] Create error:", createErr);
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      staffUserId = newUser.user.id;
    }

    // Assign role
    await supabaseAdmin.from("user_roles")
      .upsert({ user_id: staffUserId, role: staffRole }, { onConflict: "user_id,role" });

    // Link to company
    await supabaseAdmin.from("user_companies")
      .upsert({ user_id: staffUserId, company_id: uc.company_id, is_primary: true }, { onConflict: "user_id,company_id" });

    // Create profile
    await supabaseAdmin.from("profiles")
      .upsert({ user_id: staffUserId, full_name: fullName, email }, { onConflict: "user_id" });

    // Send invite
    await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: "https://rdjlogistics.nl/" },
    });

    console.log(`[create-staff-account] Success: ${email} → ${staffUserId}, role: ${staffRole}`);

    return new Response(
      JSON.stringify({ success: true, user_id: staffUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-staff-account] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

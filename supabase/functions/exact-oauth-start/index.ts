import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    const clientSecret = Deno.env.get("EXACT_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Exact Online is niet geconfigureerd. Stel EXACT_CLIENT_ID en EXACT_CLIENT_SECRET in." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/exact-oauth-start?callback=true`;
    const url = new URL(req.url);

    // === CALLBACK: Exchange code for tokens ===
    if (url.searchParams.has("callback")) {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response(JSON.stringify({ error: "Geen autorisatiecode ontvangen" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[exact-oauth-start] Exchanging authorization code for tokens");

      // Exchange code for access + refresh token
      const tokenRes = await fetch("https://start.exactonline.nl/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const tokenBody = await tokenRes.text();
      if (!tokenRes.ok) {
        console.error("[exact-oauth-start] Token exchange failed:", tokenRes.status, tokenBody);
        return new Response(
          JSON.stringify({ error: "Token exchange mislukt", details: tokenBody }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokens = JSON.parse(tokenBody);
      const { access_token, refresh_token, expires_in } = tokens;

      if (!access_token) {
        return new Response(
          JSON.stringify({ error: "Geen access_token ontvangen van Exact Online" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[exact-oauth-start] Tokens received, fetching current division");

      // Get the current division
      const meRes = await fetch("https://start.exactonline.nl/api/v1/current/Me?$select=CurrentDivision", {
        headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
      });
      const meBody = await meRes.json().catch(() => null);
      const division = meBody?.d?.results?.[0]?.CurrentDivision || null;

      // Store credentials in accounting_integrations using service role
      const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // Try to extract tenant from the state param or from the auth header
      const authHeader = req.headers.get("Authorization");
      let tenantId: string | null = null;

      // Check state parameter first (passed through OAuth flow)
      const state = url.searchParams.get("state");
      if (state) {
        try {
          const stateData = JSON.parse(atob(state));
          tenantId = stateData.tenant_id || null;
        } catch { /* state not JSON-encoded, ignore */ }
      }

      const credentialsData = {
        access_token,
        refresh_token,
        expires_at: new Date(Date.now() + (expires_in || 600) * 1000).toISOString(),
        division,
      };

      if (tenantId) {
        // Upsert the integration record
        const { error: upsertErr } = await supabaseAdmin
          .from("accounting_integrations")
          .upsert(
            {
              tenant_id: tenantId,
              provider: "exact_online",
              is_active: true,
              credentials_encrypted: credentialsData as any,
              sync_status: "connected",
              sync_error: null,
            },
            { onConflict: "tenant_id,provider" }
          );

        if (upsertErr) {
          console.error("[exact-oauth-start] Upsert error:", upsertErr);
        } else {
          console.log("[exact-oauth-start] Integration saved for tenant", tenantId);
        }
      }

      // Redirect user back to the app
      const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(".supabase.co", ".lovable.app");
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: `${appUrl}/integrations/accounting?status=connected`,
        },
      });
    }

    // === START: Generate auth URL ===
    // Include tenant_id in state so we can link it on callback
    let stateParam = "";
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user } } = await supabaseAnon.auth.getUser(authHeader.replace("Bearer ", ""));
        if (user) {
          // Look up user's company
          const { data: uc } = await supabaseAnon
            .from("user_companies")
            .select("company_id")
            .eq("user_id", user.id)
            .eq("is_primary", true)
            .limit(1)
            .maybeSingle();
          if (uc?.company_id) {
            stateParam = `&state=${btoa(JSON.stringify({ tenant_id: uc.company_id }))}`;
          }
        }
      }
    } catch (e) {
      console.warn("[exact-oauth-start] Could not resolve tenant for state:", e);
    }

    const authUrl = `https://start.exactonline.nl/api/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code${stateParam}`;
    console.log("[exact-oauth-start] Redirecting to Exact Online");

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[exact-oauth-start] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

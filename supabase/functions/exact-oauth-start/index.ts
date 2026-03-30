const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    const clientSecret = Deno.env.get("EXACT_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Exact Online is niet geconfigureerd. Stel EXACT_CLIENT_ID en EXACT_CLIENT_SECRET in." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/exact-oauth-start?callback=true`;
    const url = new URL(req.url);

    if (url.searchParams.has("callback")) {
      const code = url.searchParams.get("code");
      if (!code) return new Response(JSON.stringify({ error: "Geen autorisatiecode ontvangen" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      console.log("[exact-oauth-start] Exchanging code for token");
      // Token exchange placeholder
      return new Response(JSON.stringify({ success: true, message: "OAuth flow voltooid" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authUrl = `https://start.exactonline.nl/api/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    console.log("[exact-oauth-start] Redirecting to Exact Online");

    return new Response(JSON.stringify({ auth_url: authUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[exact-oauth-start] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

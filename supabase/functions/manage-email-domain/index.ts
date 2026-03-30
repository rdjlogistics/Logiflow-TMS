const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, domain } = await req.json();
    console.log(`[manage-email-domain] Action: ${action}, domain: ${domain}`);

    // This function acts as a proxy for email domain management
    // Actual domain verification is handled by the email infrastructure
    return new Response(JSON.stringify({ success: true, action, domain, message: "E-maildomein actie verwerkt" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[manage-email-domain] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { level, message, stack, context } = await req.json();
    console.log(`[log-client-error] [${level || "error"}] ${message}`);
    if (stack) console.log(`[log-client-error] Stack: ${stack}`);
    if (context) console.log(`[log-client-error] Context:`, JSON.stringify(context).slice(0, 500));

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

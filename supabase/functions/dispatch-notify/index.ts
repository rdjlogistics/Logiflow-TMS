import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: cd, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { driverId, orderId, message, type } = await req.json();
    console.log(`[dispatch-notify] type=${type || 'dispatch'}, driver=${driverId}, order=${orderId}`);

    if (!driverId) return new Response(JSON.stringify({ error: "driverId is vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Forward to send-push-notification
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        userId: driverId,
        title: type === "unassign" ? "Rit verwijderd" : "Nieuwe rit toegewezen",
        body: message || (type === "unassign" ? "Een rit is van je planning verwijderd." : "Er is een nieuwe rit aan je toegewezen."),
        data: { orderId, type: type || "dispatch" },
      },
    });

    if (error) {
      console.error("[dispatch-notify] Push failed:", error);
      return new Response(JSON.stringify({ success: false, error: "Push notificatie mislukt" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[dispatch-notify] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

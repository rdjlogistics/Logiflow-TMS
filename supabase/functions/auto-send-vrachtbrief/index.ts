import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: cd, error: ce } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", cd.claims.sub).eq("is_primary", true).single();
    if (!uc?.company_id) return new Response(JSON.stringify({ error: "Geen bedrijf" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const orderId = body.tripId || body.orderId;
    const to = body.to;
    if (!orderId) return new Response(JSON.stringify({ error: "orderId verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[auto-send-vrachtbrief] Order ${orderId}`);

    const { data: order } = await supabaseAdmin.from("trips").select("id, order_number, company_id, customer:customers(company_name, email)").eq("id", orderId).single();
    if (!order || order.company_id !== uc.company_id) return new Response(JSON.stringify({ error: "Order niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const recipientEmail = to || (order.customer as any)?.email;
    if (!recipientEmail) return new Response(JSON.stringify({ error: "Geen e-mailadres beschikbaar" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return new Response(JSON.stringify({ error: "E-mail niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, ""),
        to: [recipientEmail], subject: `Vrachtbrief ${order.order_number}`,
        html: `<p>Bijgaand de vrachtbrief voor order ${order.order_number}.</p>`,
      }),
    });
    const resData = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: resData.message || "Verzenden mislukt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[auto-send-vrachtbrief] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

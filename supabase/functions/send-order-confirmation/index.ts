import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: _u }, error: ce } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (ce || !_u) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const cd = { claims: { sub: _u.id } };
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", cd.claims.sub).eq("is_primary", true).single();
    if (!uc?.company_id) return new Response(JSON.stringify({ error: "Geen bedrijf" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    // Accept both old (orderId, to) and new (tripId, customerEmail) parameter names
    const orderId = body.orderId || body.tripId;
    const to = body.to || body.customerEmail;
    if (!orderId || !to) return new Response(JSON.stringify({ error: "orderId/tripId en to/customerEmail verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[send-order-confirmation] Order ${orderId} to ${to}`);
    const { data: order } = await supabaseAdmin.from("trips").select("id, order_number, company_id, trip_date, pickup_address, pickup_city, delivery_address, delivery_city, customer_id, customers:customer_id (company_name, contact_name)").eq("id", orderId).single();
    if (!order || order.company_id !== uc.company_id) return new Response(JSON.stringify({ error: "Order niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return new Response(JSON.stringify({ error: "E-mail niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Build subject and body from available data
    const customerName = body.customerName || (order as any).customers?.company_name || "";
    const orderNumber = body.orderNumber || order.order_number || orderId.slice(0, 8);
    const emailSubject = body.subject || `Orderbevestiging ${orderNumber}`;
    const pickupAddress = body.pickupAddress || [order.pickup_address, order.pickup_city].filter(Boolean).join(", ") || "-";
    const deliveryAddress = body.deliveryAddress || [order.delivery_address, order.delivery_city].filter(Boolean).join(", ") || "-";
    const tripDate = order.trip_date ? new Date(order.trip_date).toLocaleDateString("nl-NL") : "-";

    const emailBody = body.body || `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#2563eb;">Orderbevestiging</h2>
        <p>Beste ${customerName ? customerName : "klant"},</p>
        <p>Hierbij bevestigen wij uw order <strong>${orderNumber}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Ordernummer</td><td style="padding:8px;border:1px solid #e5e7eb;">${orderNumber}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Datum</td><td style="padding:8px;border:1px solid #e5e7eb;">${tripDate}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Ophaaladres</td><td style="padding:8px;border:1px solid #e5e7eb;">${pickupAddress}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Afleveradres</td><td style="padding:8px;border:1px solid #e5e7eb;">${deliveryAddress}</td></tr>
        </table>
        <p>Met vriendelijke groet</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, ""), to: [to], subject: emailSubject, html: emailBody }),
    });
    const resData = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: resData.message || "Verzenden mislukt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, message_id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-order-confirmation] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

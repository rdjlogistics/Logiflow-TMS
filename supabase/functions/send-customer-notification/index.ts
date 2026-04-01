import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: cd, error: ce } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { customer_id, trip_id, notification_type, message, subject: customSubject } = await req.json();
    if (!customer_id && !trip_id) {
      return new Response(JSON.stringify({ error: "customer_id of trip_id is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve customer email
    let customerEmail: string | null = null;
    let customerName = "Klant";
    let orderNumber = "";

    if (trip_id) {
      const { data: trip } = await supabaseAdmin.from("trips").select("customer_id, order_number").eq("id", trip_id).single();
      if (trip?.customer_id) {
        const { data: cust } = await supabaseAdmin.from("customers").select("email, company_name, contact_name").eq("id", trip.customer_id).single();
        if (cust) {
          customerEmail = cust.email;
          customerName = cust.contact_name || cust.company_name || "Klant";
        }
        orderNumber = trip.order_number || "";
      }
    } else if (customer_id) {
      const { data: cust } = await supabaseAdmin.from("customers").select("email, company_name, contact_name").eq("id", customer_id).single();
      if (cust) {
        customerEmail = cust.email;
        customerName = cust.contact_name || cust.company_name || "Klant";
      }
    }

    if (!customerEmail) {
      console.warn("[send-customer-notification] No customer email found");
      return new Response(JSON.stringify({ success: true, skipped: true, message: "Geen e-mailadres gevonden" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[send-customer-notification] type=${notification_type || "general"}, to=${customerEmail}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("[send-customer-notification] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: true, skipped: true, message: "E-mail niet geconfigureerd" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fromEmail = (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, "");
    const type = notification_type || "general";

    let subject = customSubject || "Notificatie over uw zending";
    let html = "";

    switch (type) {
      case "proximity":
      case "approaching":
        subject = `Uw bezorging nadert${orderNumber ? ` — ${orderNumber}` : ""}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">🚚 Uw bezorging is bijna bij u!</h2>
            <p>Beste ${customerName},</p>
            <p>Onze chauffeur is onderweg en nadert uw afleverlocatie${orderNumber ? ` voor order <strong>${orderNumber}</strong>` : ""}.</p>
            <p>Zorg ervoor dat u beschikbaar bent om de zending in ontvangst te nemen.</p>
            <p>Met vriendelijke groet</p>
          </div>
        `;
        break;
      case "delivered":
        subject = `Uw zending is afgeleverd${orderNumber ? ` — ${orderNumber}` : ""}`;
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">✅ Zending afgeleverd</h2>
            <p>Beste ${customerName},</p>
            <p>Uw zending${orderNumber ? ` (${orderNumber})` : ""} is succesvol afgeleverd.</p>
            <p>Met vriendelijke groet</p>
          </div>
        `;
        break;
      default:
        html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Bericht over uw zending</h2>
            <p>Beste ${customerName},</p>
            <p>${message || "Er is een update over uw zending."}</p>
            <p>Met vriendelijke groet</p>
          </div>
        `;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [customerEmail], subject, html }),
    });

    const resData = await res.json();
    if (!res.ok) {
      console.error("[send-customer-notification] Resend error:", resData);
      return new Response(JSON.stringify({ error: resData.message || "Verzenden mislukt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message_id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-customer-notification] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

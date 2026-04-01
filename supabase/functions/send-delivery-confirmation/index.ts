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

    // Accept both tripId and orderId for backwards compatibility
    const body = await req.json();
    const tripId = body.tripId || body.orderId;
    const explicitTo = body.to;
    const customSubject = body.subject;
    const customBody = body.body;

    if (!tripId) {
      return new Response(JSON.stringify({ error: "tripId is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify trip belongs to user's company
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", cd.claims.sub).eq("is_primary", true).single();
    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "Geen bedrijf" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: trip } = await supabaseAdmin.from("trips").select("id, order_number, company_id, customer_id").eq("id", tripId).single();
    if (!trip || trip.company_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Order niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve recipient email: explicit > customer email
    let toEmail = explicitTo;
    let customerName = "Klant";

    if (!toEmail && trip.customer_id) {
      const { data: cust } = await supabaseAdmin.from("customers").select("email, company_name, contact_name").eq("id", trip.customer_id).single();
      if (cust?.email) {
        toEmail = cust.email;
        customerName = cust.contact_name || cust.company_name || "Klant";
      }
    }

    if (!toEmail) {
      console.warn(`[send-delivery-confirmation] No email for trip ${tripId}`);
      return new Response(JSON.stringify({ success: true, skipped: true, message: "Geen e-mailadres gevonden" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[send-delivery-confirmation] Trip ${tripId} (${trip.order_number}) to ${toEmail}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("[send-delivery-confirmation] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: true, skipped: true, message: "E-mail niet geconfigureerd" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get company name for branding
    let companyName = "Uw transportpartner";
    const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", uc.company_id).single();
    if (company?.name) companyName = company.name;

    const fromEmail = (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, "");
    const subject = customSubject || `Afleverbevestiging ${trip.order_number || ""}`;
    const html = customBody || `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">✅ Afleverbevestiging</h2>
        <p>Beste ${customerName},</p>
        <p>Uw zending met ordernummer <strong>${trip.order_number || "(geen nummer)"}</strong> is succesvol afgeleverd.</p>
        <p>Bedankt voor uw vertrouwen in ${companyName}.</p>
        <p>Met vriendelijke groet,<br/>${companyName}</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html }),
    });

    const resData = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: resData.message || "Verzenden mislukt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message_id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-delivery-confirmation] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

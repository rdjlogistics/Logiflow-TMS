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
    const { data: { user: _u }, error: ce } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (ce || !_u) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const cd = { claims: { sub: _u.id } };

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { customerEmail, customerName, orderNumber, rejectionReason } = await req.json();
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "customerEmail is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[send-order-rejection] Order ${orderNumber} to ${customerEmail}`);

    // Get company info for branding
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", cd.claims.sub).eq("is_primary", true).single();
    let companyName = "Uw transportpartner";
    if (uc?.company_id) {
      const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", uc.company_id).single();
      if (company?.name) companyName = company.name;
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      // No email configured — log and return success silently
      console.warn("[send-order-rejection] RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ success: true, skipped: true, message: "E-mail niet geconfigureerd" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fromEmail = (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, "");
    const reason = rejectionReason || "Geen specifieke reden opgegeven.";
    const name = customerName || "Klant";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Order Afgewezen</h2>
        <p>Beste ${name},</p>
        <p>Helaas moeten wij u meedelen dat uw order <strong>${orderNumber || "(geen nummer)"}</strong> is afgewezen.</p>
        <div style="background: #f8f8f8; border-left: 4px solid #e53e3e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <strong>Reden:</strong><br/>
          ${reason}
        </div>
        <p>Neem gerust contact met ons op als u vragen heeft.</p>
        <p>Met vriendelijke groet,<br/>${companyName}</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [customerEmail],
        subject: `Order ${orderNumber || ""} afgewezen`,
        html,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      console.error("[send-order-rejection] Resend error:", resData);
      return new Response(JSON.stringify({ error: resData.message || "Verzenden mislukt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message_id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-order-rejection] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

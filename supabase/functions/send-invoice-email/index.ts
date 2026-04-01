import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: uc } = await supabaseAdmin
      .from("user_companies").select("company_id")
      .eq("user_id", userId).eq("is_primary", true).single();

    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqBody = await req.json();
    const invoiceId = reqBody.invoiceId || reqBody.invoice_id;
    const to = reqBody.to || reqBody.recipient_emails;
    const subject = reqBody.subject || reqBody.email_subject;
    const body = reqBody.body || reqBody.email_body;
    const cc = reqBody.cc;
    const bcc = reqBody.bcc;
    const attachPdf = reqBody.attachPdf ?? reqBody.include_pdf;
    if (!invoiceId || !to || !subject) {
      return new Response(JSON.stringify({ error: "invoiceId, to en subject zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-invoice-email] Sending invoice ${invoiceId} to ${to}`);

    // Verify invoice belongs to tenant
    const { data: invoice } = await supabaseAdmin
      .from("invoices").select("id, invoice_number, company_id")
      .eq("id", invoiceId).single();

    if (!invoice || invoice.company_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Factuur niet gevonden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-invoice-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "E-mail service niet geconfigureerd" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    // Sanitize from address
    const sanitizedFrom = fromEmail.replace(/[<>"']/g, "");

    const emailPayload: Record<string, unknown> = {
      from: sanitizedFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: body || `<p>Bijgaand ontvangt u factuur ${invoice.invoice_number}.</p>`,
    };

    if (cc) emailPayload.cc = Array.isArray(cc) ? cc : [cc];
    if (bcc) emailPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-invoice-email] Resend error:", JSON.stringify(resendData));
      return new Response(
        JSON.stringify({ error: resendData.message || "E-mail verzenden mislukt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the send
    await supabaseAdmin.from("email_send_log").insert({
      template_name: "invoice_email",
      to_email: Array.isArray(to) ? to[0] : to,
      subject,
      status: "sent",
      message_id: resendData.id,
      metadata: { invoice_id: invoiceId, invoice_number: invoice.invoice_number },
    }).then(() => {}).catch(() => {});

    // Update invoice email status
    await supabaseAdmin.from("invoices")
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq("id", invoiceId);

    console.log(`[send-invoice-email] Success: ${resendData.id}`);

    return new Response(
      JSON.stringify({ success: true, message_id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-invoice-email] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

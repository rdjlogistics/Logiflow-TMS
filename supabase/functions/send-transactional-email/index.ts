import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

const TEMPLATES: Record<string, { subject: string | ((data: any) => string) }> = {
  "order-confirmation": { subject: (d) => `Orderbevestiging ${d?.orderNumber || ""}`.trim() },
  "delivery-confirmation": { subject: (d) => `Leveringsbevestiging ${d?.orderNumber || ""}`.trim() },
  "welcome": { subject: "Welkom bij het platform" },
  "notification": { subject: (d) => d?.subject || "Notificatie" },
  "subscription-confirmation": { subject: "Abonnement bevestigd" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: cd, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userId = cd.claims.sub as string;

    // Get tenant
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", userId).eq("is_primary", true).single();
    if (!uc) return new Response(JSON.stringify({ error: "Geen bedrijf gevonden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { template, to, data: templateData, idempotencyKey, templateName, recipientEmail } = body;

    // Support both old and new calling conventions
    const tplName = templateName || template;
    const recipient = recipientEmail || to;

    if (!tplName) return new Response(JSON.stringify({ error: "template is vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!recipient) return new Response(JSON.stringify({ error: "recipient is vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const tpl = TEMPLATES[tplName];
    if (!tpl) {
      console.warn(`[send-transactional-email] Unknown template: ${tplName}`);
      // Still proceed — just use a generic subject
    }

    const subject = tpl ? (typeof tpl.subject === "function" ? tpl.subject(templateData || {}) : tpl.subject) : `Bericht van het platform`;
    const recipients = Array.isArray(recipient) ? recipient : [recipient];

    console.log(`[send-transactional-email] template=${tplName}, to=${recipients.length} recipients, tenant=${uc.company_id}`);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@rdjlogistics.nl";

    if (!RESEND_API_KEY) {
      console.error("[send-transactional-email] RESEND_API_KEY not configured");
      // Log the attempt anyway
      await supabaseAdmin.from("email_send_log").insert({
        template_name: tplName,
        recipient_email: recipients[0],
        status: "failed",
        error_message: "RESEND_API_KEY not configured",
        tenant_id: uc.company_id,
        sent_by: userId,
      }).then(() => {}, () => {});

      return new Response(JSON.stringify({ success: false, error: "Email service niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check suppression list
    const { data: suppressed } = await supabaseAdmin.from("suppressed_emails").select("email").in("email", recipients);
    const suppressedSet = new Set((suppressed || []).map((s: any) => s.email));
    const validRecipients = recipients.filter(r => !suppressedSet.has(r));

    if (validRecipients.length === 0) {
      console.log(`[send-transactional-email] All recipients suppressed`);
      return new Response(JSON.stringify({ success: true, message: "Alle ontvangers zijn uitgeschreven", recipient_count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send via Resend
    const messageIds: string[] = [];
    for (const recipientEmail of validRecipients) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: recipientEmail,
          subject,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2>${subject}</h2>
            <p>${templateData?.body || templateData?.message || "U ontvangt dit bericht van ons platform."}</p>
            ${templateData?.actionUrl ? `<p><a href="${templateData.actionUrl}" style="background:#0066cc;color:white;padding:10px 20px;text-decoration:none;border-radius:4px">Bekijken</a></p>` : ""}
          </div>`,
        }),
      });

      if (resp.ok) {
        const result = await resp.json();
        messageIds.push(result.id);
      } else {
        const errText = await resp.text();
        console.error(`[send-transactional-email] Resend error for ${recipientEmail}:`, errText);
      }
    }

    // Log
    for (const recipientEmail of validRecipients) {
      await supabaseAdmin.from("email_send_log").insert({
        template_name: tplName,
        recipient_email: recipientEmail,
        status: messageIds.length > 0 ? "sent" : "failed",
        tenant_id: uc.company_id,
        sent_by: userId,
      }).then(() => {}, () => {});
    }

    console.log(`[send-transactional-email] Sent ${messageIds.length}/${validRecipients.length} emails`);
    return new Response(JSON.stringify({
      success: messageIds.length > 0,
      message_ids: messageIds,
      recipient_count: validRecipients.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-transactional-email] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

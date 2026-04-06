import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATES: Record<string, { subject: string | ((data: any) => string) }> = {
  "order-confirmation": { subject: (d) => `Orderbevestiging ${d?.orderNumber || ""}`.trim() },
  "order-confirmation-auto": { subject: (d) => `Transportopdracht ontvangen ${d?.orderNumber || ""}`.trim() },
  "delivery-confirmation": { subject: (d) => `Leveringsbevestiging ${d?.orderNumber || ""}`.trim() },
  "welcome": { subject: "Welkom bij het platform" },
  "notification": { subject: (d) => d?.subject || "Notificatie" },
  "subscription-confirmation": { subject: "Abonnement bevestigd" },
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

function renderEmailHtml(templateName: string, templateData: Record<string, unknown>, subject: string) {
  const name =
    templateData?.name ||
    templateData?.customerName ||
    templateData?.recipientName ||
    "klant";

  if (templateName === "order-confirmation" || templateName === "order-confirmation-auto") {
    const orderNumber = templateData?.orderNumber || "-";
    const pickup = [templateData?.pickupAddress, templateData?.pickupCity].filter(Boolean).join(", ");
    const delivery = [templateData?.deliveryAddress, templateData?.deliveryCity].filter(Boolean).join(", ");
    const date = templateData?.date || templateData?.tripDate || "-";
    const goods = templateData?.goods || templateData?.cargoDescription || "-";

    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>${escapeHtml(subject)}</h2>
      <p>Beste ${escapeHtml(name)},</p>
      <p>Uw transportopdracht is ontvangen en geregistreerd.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Ordernummer</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(orderNumber)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Ophalen</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(pickup || "-")}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Leveren</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(delivery || "-")}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Datum</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(date)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:600;">Lading</td><td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(goods)}</td></tr>
      </table>
      <p>Wij nemen contact met u op zodra de planning definitief is.</p>
    </div>`;
  }

  if (templateName === "delivery-confirmation") {
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2>${escapeHtml(subject)}</h2>
      <p>Beste ${escapeHtml(name)},</p>
      <p>Uw zending met ordernummer <strong>${escapeHtml(templateData?.orderNumber || "-")}</strong> is afgeleverd.</p>
      <p>${escapeHtml(templateData?.message || "Bedankt voor uw vertrouwen.")}</p>
    </div>`;
  }

  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
    <h2>${escapeHtml(subject)}</h2>
    <p>${escapeHtml(templateData?.body || templateData?.message || "U ontvangt dit bericht van ons platform.")}</p>
    ${templateData?.actionUrl ? `<p><a href="${escapeHtml(templateData.actionUrl)}" style="background:#0066cc;color:white;padding:10px 20px;text-decoration:none;border-radius:4px">Bekijken</a></p>` : ""}
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const {
      template,
      to,
      data: legacyTemplateData,
      templateData: modernTemplateData,
      templateName,
      recipientEmail,
      tenantId: tenantIdFromBody,
      companyId,
      company_id,
    } = body || {};

    const tplName = templateName || template;
    const recipient = recipientEmail || to;
    const templateData = (modernTemplateData || legacyTemplateData || {}) as Record<string, unknown>;

    if (!tplName) return jsonResponse({ error: "template is vereist" }, 400);
    if (!recipient) return jsonResponse({ error: "recipient is vereist" }, 400);

    const token = authHeader.replace("Bearer ", "");
    const isInternalServiceCall = token === serviceKey;

    let tenantId: string | null = null;
    let userId: string | null = null;

    if (isInternalServiceCall) {
      tenantId = tenantIdFromBody || companyId || company_id || null;
      if (!tenantId) {
        return jsonResponse({ error: "tenantId is vereist voor interne e-mails" }, 400);
      }
    } else {
      const authClient = createClient(supabaseUrl, anonKey);
      const {
        data: { user },
        error: ce,
      } = await authClient.auth.getUser(token);

      if (ce || !user) return jsonResponse({ error: "Unauthorized" }, 401);
      userId = user.id;

      const { data: uc } = await supabaseAdmin
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .single();

      if (!uc?.company_id) {
        return jsonResponse({ error: "Geen bedrijf gevonden" }, 403);
      }

      tenantId = uc.company_id;
    }

    const tpl = TEMPLATES[tplName];
    if (!tpl) {
      console.warn(`[send-transactional-email] Unknown template: ${tplName}`);
    }

    const subject = tpl
      ? typeof tpl.subject === "function"
        ? tpl.subject(templateData)
        : tpl.subject
      : String(templateData?.subject || "Bericht van het platform");

    const recipients = (Array.isArray(recipient) ? recipient : [recipient]).filter(Boolean);
    if (recipients.length === 0) {
      return jsonResponse({ error: "Geen ontvangers opgegeven" }, 400);
    }

    console.log(
      `[send-transactional-email] template=${tplName}, to=${recipients.length} recipients, tenant=${tenantId}, internal=${isInternalServiceCall}`,
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@rdjlogistics.nl";

    if (!RESEND_API_KEY) {
      console.error("[send-transactional-email] RESEND_API_KEY not configured");
      await supabaseAdmin.from("email_send_log").insert({
        template_name: tplName,
        recipient_email: recipients[0],
        status: "failed",
        error_message: "RESEND_API_KEY not configured",
        tenant_id: tenantId,
        sent_by: userId,
      }).then(() => {}, () => {});

      return jsonResponse({ success: false, error: "Email service niet geconfigureerd" }, 500);
    }

    const { data: suppressed } = await supabaseAdmin
      .from("suppressed_emails")
      .select("email")
      .in("email", recipients);

    const suppressedSet = new Set((suppressed || []).map((s: any) => s.email));
    const validRecipients = recipients.filter((email: string) => !suppressedSet.has(email));

    if (validRecipients.length === 0) {
      console.log("[send-transactional-email] All recipients suppressed");
      return jsonResponse({ success: true, message: "Alle ontvangers zijn uitgeschreven", recipient_count: 0 });
    }

    const html = renderEmailHtml(tplName, templateData, subject);
    const messageIds: string[] = [];

    for (const email of validRecipients) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject,
          html,
        }),
      });

      if (resp.ok) {
        const result = await resp.json();
        if (result?.id) messageIds.push(result.id);
      } else {
        const errText = await resp.text();
        console.error(`[send-transactional-email] Resend error for ${email}:`, errText);
      }
    }

    for (const email of validRecipients) {
      await supabaseAdmin.from("email_send_log").insert({
        template_name: tplName,
        recipient_email: email,
        status: messageIds.length > 0 ? "sent" : "failed",
        error_message: messageIds.length > 0 ? null : "Delivery failed",
        tenant_id: tenantId,
        sent_by: userId,
      }).then(() => {}, () => {});
    }

    console.log(`[send-transactional-email] Sent ${messageIds.length}/${validRecipients.length} emails`);
    return jsonResponse({
      success: messageIds.length > 0,
      message_ids: messageIds,
      recipient_count: validRecipients.length,
    });
  } catch (err: any) {
    console.error("[send-transactional-email] Error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
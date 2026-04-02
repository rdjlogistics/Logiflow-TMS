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

    const reqBody = await req.json();
    const to = reqBody.to;
    const documentType = reqBody.documentType || "document";
    const orderNumber = reqBody.orderNumber || "";
    const documentUrl = reqBody.documentUrl || "";
    const message = reqBody.message || reqBody.body || "";

    // Auto-generate subject if not provided
    const docTypeLabels: Record<string, string> = {
      pod: "Proof of Delivery",
      vrachtbrief: "Vrachtbrief",
      cmr: "CMR",
      invoice: "Factuur",
      transport_order: "Transportopdracht",
    };
    const label = docTypeLabels[documentType] || documentType;
    const subject = reqBody.subject || (orderNumber ? `${label} - ${orderNumber}` : label);

    if (!to) return new Response(JSON.stringify({ error: "to is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[send-document-email] Sending ${documentType} to ${to}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return new Response(JSON.stringify({ error: "E-mail niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Build HTML body with document link if available
    let htmlBody = message || `<p>Bijgaand het gevraagde document.</p>`;
    if (documentUrl && !htmlBody.includes(documentUrl)) {
      htmlBody += `<p style="margin-top:16px;"><a href="${documentUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Document bekijken</a></p>`;
    }

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#2563eb;">${label}${orderNumber ? ` - ${orderNumber}` : ""}</h2>
        ${htmlBody}
        <p style="margin-top:24px;color:#6b7280;font-size:12px;">Dit is een automatisch gegenereerd bericht.</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, ""), to: [to], subject, html: emailHtml }),
    });
    const resData = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: resData.message || "Verzenden mislukt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, message_id: resData.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-document-email] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

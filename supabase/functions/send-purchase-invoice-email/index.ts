import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", user.id).eq("is_primary", true).single();
    if (!uc?.company_id) return new Response(JSON.stringify({ error: "Geen bedrijf" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    // Accept both parameter naming conventions (backwards compatible)
    const invoiceId = body.invoiceId || body.purchase_invoice_id;
    const recipients: string[] = body.recipient_emails || (body.to ? [body.to] : []);
    const subject = body.subject || body.email_subject;
    const emailBody = body.body || body.email_body;

    if (!invoiceId || recipients.length === 0) return new Response(JSON.stringify({ error: "invoiceId en to verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[send-purchase-invoice-email] Invoice ${invoiceId} to ${recipients.join(", ")}`);
    const { data: inv } = await supabaseAdmin.from("purchase_invoices").select("id, invoice_number, company_id, total_amount").eq("id", invoiceId).single();
    if (!inv || inv.company_id !== uc.company_id) return new Response(JSON.stringify({ error: "Factuur niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return new Response(JSON.stringify({ error: "E-mail niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const finalSubject = subject || `Inkoopfactuur ${inv.invoice_number}`;
    const finalBody = emailBody || `<p>Bijgaand de inkoopfactuur ${inv.invoice_number}.</p>`;
    const fromEmail = (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, "");

    const results: { to: string; success: boolean; message_id?: string; error?: string }[] = [];

    for (const recipient of recipients) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromEmail, to: [recipient], subject: finalSubject, html: finalBody }),
        });
        const resData = await res.json();
        if (res.ok) {
          results.push({ to: recipient, success: true, message_id: resData.id });
        } else {
          results.push({ to: recipient, success: false, error: resData.message || "Verzenden mislukt" });
        }
      } catch (err) {
        results.push({ to: recipient, success: false, error: err.message });
      }
    }

    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      success: allSuccess,
      sent: successCount,
      total: recipients.length,
      results,
      message_id: results[0]?.message_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[send-purchase-invoice-email] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

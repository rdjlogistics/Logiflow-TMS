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
    const { data: { user }, error: claimsError } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (claimsError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const claimsData = { claims: { sub: user.id } };
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

    const { invoiceId, invoiceIds, to, subject, body } = await req.json();
    const targetIds = invoiceIds || (invoiceId ? [invoiceId] : []);

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ error: "invoiceId(s) verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-invoice-reminder] Sending reminders for ${targetIds.length} invoices`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "E-mail service niet geconfigureerd" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = (Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev").replace(/[<>"']/g, "");
    let sent = 0;
    let failed = 0;

    for (const id of targetIds) {
      const { data: invoice } = await supabaseAdmin
        .from("invoices")
        .select("id, invoice_number, company_id, total_amount, amount_paid, due_date, customer:customers(company_name, email)")
        .eq("id", id)
        .single();

      if (!invoice || invoice.company_id !== uc.company_id) {
        failed++;
        continue;
      }

      const customerEmail = to || (invoice.customer as any)?.email;
      if (!customerEmail) {
        failed++;
        continue;
      }

      const amountDue = ((invoice.total_amount || 0) - (invoice.amount_paid || 0)).toFixed(2);
      const emailSubject = subject || `Herinnering: Factuur ${invoice.invoice_number} — €${amountDue} openstaand`;
      const emailBody = body || `
        <p>Geachte ${(invoice.customer as any)?.company_name || "klant"},</p>
        <p>Graag herinneren wij u aan factuur <strong>${invoice.invoice_number}</strong> met een openstaand bedrag van <strong>€${amountDue}</strong>.</p>
        ${invoice.due_date ? `<p>Vervaldatum: ${invoice.due_date}</p>` : ""}
        <p>Wij verzoeken u vriendelijk het openstaande bedrag zo spoedig mogelijk te voldoen.</p>
        <p>Met vriendelijke groet</p>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          subject: emailSubject,
          html: emailBody,
        }),
      });

      if (res.ok) {
        sent++;
        await supabaseAdmin.from("invoices")
          .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
          .eq("id", id);
      } else {
        const errData = await res.json();
        console.error(`[send-invoice-reminder] Failed for ${id}:`, errData);
        failed++;
      }
    }

    console.log(`[send-invoice-reminder] Done: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-invoice-reminder] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

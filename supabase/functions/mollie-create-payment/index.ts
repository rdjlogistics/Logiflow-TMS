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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's tenant
    const { data: uc } = await supabaseAdmin
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .single();

    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[mollie-create-payment] User ${userId} creating payment for invoice ${invoice_id}`);

    // Get invoice
    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, total_amount, amount_paid, company_id, customer_id, currency")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      console.error("[mollie-create-payment] Invoice not found:", invErr);
      return new Response(JSON.stringify({ error: "Factuur niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice.company_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Geen toegang tot deze factuur" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountDue = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
    if (amountDue <= 0) {
      return new Response(JSON.stringify({ error: "Factuur is al betaald" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mollieApiKey = Deno.env.get("MOLLIE_API_KEY");
    if (!mollieApiKey) {
      console.error("[mollie-create-payment] MOLLIE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Mollie API-key is niet geconfigureerd" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get company info for redirect URL
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name, website")
      .eq("id", uc.company_id)
      .single();

    const baseUrl = company?.website || "https://rdjlogistics.nl";

    const molliePayload = {
      amount: {
        currency: invoice.currency || "EUR",
        value: amountDue.toFixed(2),
      },
      description: `Factuur ${invoice.invoice_number}`,
      redirectUrl: `${baseUrl}/invoices?payment=success&invoice=${invoice_id}`,
      webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mollie-create-payment?webhook=true`,
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        tenant_id: uc.company_id,
      },
    };

    console.log(`[mollie-create-payment] Creating Mollie payment: €${amountDue.toFixed(2)} for ${invoice.invoice_number}`);

    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mollieApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(molliePayload),
    });

    const mollieData = await mollieResponse.json();

    if (!mollieResponse.ok) {
      console.error("[mollie-create-payment] Mollie error:", JSON.stringify(mollieData));
      return new Response(
        JSON.stringify({ error: mollieData.detail || "Mollie betaling aanmaken mislukt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentUrl = mollieData._links?.checkout?.href;
    const paymentId = mollieData.id;

    console.log(`[mollie-create-payment] Payment created: ${paymentId}, URL: ${paymentUrl}`);

    // Store payment link on invoice
    await supabaseAdmin
      .from("invoices")
      .update({ payment_link: paymentUrl, mollie_payment_id: paymentId })
      .eq("id", invoice_id);

    return new Response(
      JSON.stringify({ success: true, payment_url: paymentUrl, payment_id: paymentId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[mollie-create-payment] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

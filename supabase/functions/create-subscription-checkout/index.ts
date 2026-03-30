import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: cd, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: uc } = await supabaseAdmin.from("user_companies").select("company_id").eq("user_id", cd.claims.sub).eq("is_primary", true).single();
    if (!uc?.company_id) return new Response(JSON.stringify({ error: "Geen bedrijf" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { plan_slug, billing_cycle = "monthly" } = body;
    if (!plan_slug) return new Response(JSON.stringify({ error: "plan_slug verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[create-subscription-checkout] Plan: ${plan_slug}, cycle: ${billing_cycle}`);

    const { data: plan } = await supabaseAdmin.from("subscription_plans").select("*").eq("slug", plan_slug).eq("is_active", true).single();
    if (!plan) return new Response(JSON.stringify({ error: "Plan niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const amount = billing_cycle === "yearly" ? (plan.price_yearly_eur || plan.price_monthly_eur * 12) : plan.price_monthly_eur;
    const mollieApiKey = Deno.env.get("MOLLIE_API_KEY");
    if (!mollieApiKey) return new Response(JSON.stringify({ error: "Betaalservice niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: { "Authorization": `Bearer ${mollieApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: { currency: "EUR", value: amount.toFixed(2) },
        description: `${plan.name} - ${billing_cycle}`,
        redirectUrl: `https://rdjlogistics.nl/settings?payment=success`,
        webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-subscription-checkout?webhook=true`,
        metadata: { tenant_id: uc.company_id, plan_id: plan.id, billing_cycle },
      }),
    });

    const mollieData = await mollieRes.json();
    if (!mollieRes.ok) {
      console.error("[create-subscription-checkout] Mollie error:", mollieData);
      return new Response(JSON.stringify({ error: mollieData.detail || "Betaling mislukt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from("subscription_invoices").insert({
      tenant_id: uc.company_id, plan_id: plan.id, amount, currency: "EUR",
      status: "pending", payment_provider: "mollie", payment_id: mollieData.id,
      billing_cycle, period_start: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      success: true, payment_id: mollieData.id,
      payment_url: mollieData._links?.checkout?.href,
      plan: plan.name, amount: amount.toFixed(2), billing_cycle,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[create-subscription-checkout] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

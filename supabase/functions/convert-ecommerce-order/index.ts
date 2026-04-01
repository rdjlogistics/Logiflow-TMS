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

    const { orderId, orderIds, bulk } = await req.json();

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (bulk && Array.isArray(orderIds)) {
      console.log(`[convert-ecommerce-order] Bulk convert: ${orderIds.length} orders, user=${cd.claims.sub}`);

      let converted = 0;
      let errors = 0;

      for (const id of orderIds) {
        const { error } = await supabaseAdmin
          .from("ecommerce_orders")
          .update({ conversion_status: "converted" })
          .eq("id", id);

        if (error) {
          errors++;
          console.warn(`[convert-ecommerce-order] Failed to convert order ${id}: ${error.message}`);
        } else {
          converted++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        converted,
        errors,
        message: `${converted} orders omgezet naar ritten.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[convert-ecommerce-order] Single convert: orderId=${orderId}, user=${cd.claims.sub}`);

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("ecommerce_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark as converted — full trip creation to be implemented with e-commerce integration
    await supabaseAdmin
      .from("ecommerce_orders")
      .update({ conversion_status: "converted" })
      .eq("id", orderId);

    return new Response(JSON.stringify({
      success: true,
      orderId,
      message: "Order succesvol omgezet.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[convert-ecommerce-order] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(key));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = authHeader.replace("Bearer ", "");
    if (!apiKey.startsWith("lf_")) {
      return new Response(JSON.stringify({ error: "Invalid API key format" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyHash = await hashKey(apiKey);
    const keyPrefix = apiKey.substring(0, 8);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate key
    const { data: keyRecord, error: keyErr } = await supabaseAdmin
      .from("api_keys")
      .select("id, company_id, is_active, scopes, expires_at")
      .eq("key_hash", keyHash)
      .eq("key_prefix", keyPrefix)
      .single();

    if (keyErr || !keyRecord) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!keyRecord.is_active) {
      return new Response(JSON.stringify({ error: "API key is deactivated" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "API key expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update last_used_at
    await supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);

    const companyId = keyRecord.company_id;
    const scopes = keyRecord.scopes || [];

    // Parse request path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Expected: /functions/v1/api-gateway/orders or /functions/v1/api-gateway/invoices
    const resource = pathParts[pathParts.length - 1] || "";

    // Route to resource handlers
    switch (resource) {
      case "orders": {
        if (!scopes.includes("read")) {
          return new Response(JSON.stringify({ error: "Insufficient scope" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await supabaseAdmin
          .from("trips")
          .select("id, reference, status, pickup_date, delivery_date, pickup_city, delivery_city, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ data, count: data?.length || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "invoices": {
        if (!scopes.includes("read")) {
          return new Response(JSON.stringify({ error: "Insufficient scope" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await supabaseAdmin
          .from("invoices")
          .select("id, invoice_number, status, total_amount, due_date, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ data, count: data?.length || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "customers": {
        if (!scopes.includes("read")) {
          return new Response(JSON.stringify({ error: "Insufficient scope" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await supabaseAdmin
          .from("customers")
          .select("id, company_name, email, phone, city, country, is_active, created_at")
          .eq("company_id", companyId)
          .order("company_name")
          .limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ data, count: data?.length || 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "status": {
        return new Response(
          JSON.stringify({
            status: "ok",
            company_id: companyId,
            scopes,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default: {
        return new Response(
          JSON.stringify({
            error: "Unknown resource",
            available: ["orders", "invoices", "customers", "status"],
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
  } catch (err) {
    console.error("[api-gateway] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

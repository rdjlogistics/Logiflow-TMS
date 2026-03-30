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

    const { documentType, entityId, templateId } = await req.json();
    if (!documentType || !entityId) {
      return new Response(JSON.stringify({ error: "documentType en entityId zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-document-pdf] Generating ${documentType} for entity ${entityId}`);

    // For now, return a placeholder response — actual PDF generation requires a PDF library
    // This ensures the frontend doesn't break while we integrate a proper PDF engine
    
    // Get entity data based on type
    let entityData: any = null;
    
    if (documentType === "vrachtbrief" || documentType === "transport_order") {
      const { data: trip } = await supabaseAdmin
        .from("trips")
        .select("*, customer:customers(company_name, address, city, postal_code), route_stops(*)")
        .eq("id", entityId)
        .single();

      if (!trip || trip.company_id !== uc.company_id) {
        return new Response(JSON.stringify({ error: "Order niet gevonden" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      entityData = trip;
    }

    // Generate simple HTML document
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>${documentType}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 40px;">
        <h1>${documentType.toUpperCase()}</h1>
        <p>Document gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</p>
        ${entityData ? `
          <h2>Order: ${entityData.order_number || entityId}</h2>
          <p>Klant: ${entityData.customer?.company_name || "Onbekend"}</p>
          <p>Datum: ${entityData.trip_date || ""}</p>
          <p>Van: ${entityData.pickup_address || ""}, ${entityData.pickup_city || ""}</p>
          <p>Naar: ${entityData.delivery_address || ""}, ${entityData.delivery_city || ""}</p>
        ` : ""}
      </body>
      </html>
    `;

    console.log(`[generate-document-pdf] Generated HTML document for ${documentType}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        document_type: documentType,
        entity_id: entityId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-document-pdf] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

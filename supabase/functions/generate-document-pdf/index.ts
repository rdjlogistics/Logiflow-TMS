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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Get user's company
    const { data: uc } = await supabaseAdmin
      .from("user_companies").select("company_id")
      .eq("user_id", user.id).eq("is_primary", true).single();

    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqBody = await req.json();

    // Support two modes:
    // 1. Template mode: { html, fileName } — pre-rendered HTML from useDocumentTemplates
    // 2. Entity mode: { documentType, entityId/orderId } — generate from trip data
    
    if (reqBody.html && reqBody.fileName) {
      // Template mode — just pass through the pre-rendered HTML
      return new Response(
        JSON.stringify({ success: true, html: reqBody.html, fileName: reqBody.fileName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const documentType = reqBody.documentType;
    const entityId = reqBody.entityId || reqBody.orderId || reqBody.tripId;
    const language = reqBody.language || "nl";
    const copies = reqBody.copies || [];

    if (!documentType || !entityId) {
      return new Response(JSON.stringify({ error: "documentType en entityId/orderId zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-document-pdf] Generating ${documentType} for entity ${entityId}`);

    // Fetch trip data
    const { data: trip } = await supabaseAdmin
      .from("trips")
      .select("*, customer:customers(company_name, contact_name, address, city, postal_code, email, phone, vat_number), route_stops(*)")
      .eq("id", entityId)
      .single();

    if (!trip || trip.company_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Order niet gevonden of geen toegang" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company info
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name, address, postal_code, city, country, phone, email, kvk_number, vat_number, iban")
      .eq("id", uc.company_id)
      .single();

    // Fetch driver info if assigned
    let driverName = "-";
    let driverPhone = "-";
    if (trip.driver_id) {
      const { data: driver } = await supabaseAdmin.from("drivers").select("name, phone").eq("id", trip.driver_id).single();
      if (driver) {
        driverName = driver.name || "-";
        driverPhone = driver.phone || "-";
      }
    }

    // Fetch vehicle info if assigned
    let vehicleInfo = "-";
    if (trip.vehicle_id) {
      const { data: vehicle } = await supabaseAdmin.from("vehicles").select("license_plate, brand, model").eq("id", trip.vehicle_id).single();
      if (vehicle) vehicleInfo = `${vehicle.brand || ""} ${vehicle.model || ""} (${vehicle.license_plate || ""})`.trim();
    }

    const tripDate = trip.trip_date ? new Date(trip.trip_date).toLocaleDateString("nl-NL") : "-";
    const companyName = company?.name || "-";
    const customerName = trip.customer?.company_name || "-";

    // Determine document title
    const typeMap: Record<string, string> = {
      vrachtbrief: "VRACHTBRIEF",
      transportopdracht: "TRANSPORTOPDRACHT",
      transport_order: "TRANSPORTOPDRACHT",
      cmr_full: "CMR VRACHTBRIEF",
      cmr_overlay: "CMR OVERLAY",
      paklijst: "PAKLIJST",
      laadbrief: "LAADBRIEF",
      afleverbon: "AFLEVERBON",
    };
    const docTitle = typeMap[documentType] || documentType.toUpperCase();

    // Build stops table
    const stops = trip.route_stops || [];
    stops.sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0));
    const stopsHtml = stops.length > 0
      ? stops.map((s: any, i: number) => `
        <tr>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;">${i + 1}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;">${esc(s.stop_type || "-")}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;">${esc(s.company_name || "-")}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;">${esc([s.address, s.city].filter(Boolean).join(", ") || "-")}</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;">${s.planned_arrival ? new Date(s.planned_arrival).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="5" style="padding:8px;text-align:center;color:#9ca3af;">Geen stops gedefinieerd</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${docTitle} - ${trip.order_number || entityId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a1a; padding: 30px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 20pt; color: #2563eb; }
  .meta { text-align: right; font-size: 9pt; color: #666; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
  .box-title { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 6px; font-weight: 600; }
  .box-value { font-size: 10pt; font-weight: 600; }
  .box-sub { font-size: 9pt; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
  th { background: #f3f4f6; padding: 6px 8px; border: 1px solid #e5e7eb; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; color: #6b7280; }
  .section-title { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .signature-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 30px; }
  .sig-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; min-height: 80px; }
  .sig-label { font-size: 8pt; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; font-weight: 600; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${docTitle}</h1>
      <p style="color:#6b7280;font-size:9pt;margin-top:4px;">${companyName}</p>
    </div>
    <div class="meta">
      <p style="font-size:14pt;font-weight:700;color:#1a1a1a;">${esc(trip.order_number || "-")}</p>
      <p>Datum: ${tripDate}</p>
      <p>Referentie: ${esc(trip.reference || "-")}</p>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Afzender / Opdrachtgever</div>
      <div class="box-value">${esc(companyName)}</div>
      <div class="box-sub">${esc(company?.address || "-")}</div>
      <div class="box-sub">${esc([company?.postal_code, company?.city].filter(Boolean).join(" ") || "-")}</div>
      <div class="box-sub">${esc(company?.phone || "")}</div>
      ${company?.kvk_number ? `<div class="box-sub">KvK: ${esc(company.kvk_number)}</div>` : ""}
    </div>
    <div class="box">
      <div class="box-title">Klant / Geadresseerde</div>
      <div class="box-value">${esc(customerName)}</div>
      <div class="box-sub">${esc(trip.customer?.address || "-")}</div>
      <div class="box-sub">${esc([trip.customer?.postal_code, trip.customer?.city].filter(Boolean).join(" ") || "-")}</div>
      <div class="box-sub">${esc(trip.customer?.phone || "")}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Ophalen</div>
      <div class="box-value">${esc(trip.pickup_address || "-")}</div>
      <div class="box-sub">${esc([trip.pickup_postal_code, trip.pickup_city].filter(Boolean).join(" ") || "-")}</div>
    </div>
    <div class="box">
      <div class="box-title">Afleveren</div>
      <div class="box-value">${esc(trip.delivery_address || "-")}</div>
      <div class="box-sub">${esc([trip.delivery_postal_code, trip.delivery_city].filter(Boolean).join(" ") || "-")}</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Chauffeur</div>
      <div class="box-value">${esc(driverName)}</div>
      <div class="box-sub">${esc(driverPhone)}</div>
    </div>
    <div class="box">
      <div class="box-title">Voertuig</div>
      <div class="box-value">${esc(vehicleInfo)}</div>
    </div>
  </div>

  <div class="box" style="margin-bottom:20px;">
    <div class="box-title">Goederen</div>
    <div class="box-value">${esc(trip.cargo_description || "-")}</div>
    <div class="box-sub" style="display:flex;gap:24px;margin-top:6px;">
      <span>Gewicht: ${trip.weight ? trip.weight + " kg" : "-"}</span>
      <span>Volume: ${trip.volume ? trip.volume + " m3" : "-"}</span>
      <span>Laadmeters: ${trip.loading_meters || "-"}</span>
      <span>Colli: ${trip.colli || "-"}</span>
    </div>
  </div>

  ${stops.length > 0 ? `
  <div class="section-title">Stops</div>
  <table>
    <thead>
      <tr><th>#</th><th>Type</th><th>Bedrijf</th><th>Adres</th><th>Tijd</th></tr>
    </thead>
    <tbody>${stopsHtml}</tbody>
  </table>
  ` : ""}

  ${trip.notes ? `
  <div class="box" style="margin-bottom:20px;background:#fffbeb;border-color:#fde68a;">
    <div class="box-title" style="color:#92400e;">Opmerkingen</div>
    <div style="font-size:9pt;color:#78350f;">${esc(trip.notes)}</div>
  </div>
  ` : ""}

  <div class="signature-row">
    ${(copies.includes("sender") || copies.length === 0) ? `
    <div class="sig-box">
      <div class="sig-label">Handtekening afzender</div>
    </div>` : ""}
    ${(copies.includes("carrier") || copies.length === 0) ? `
    <div class="sig-box">
      <div class="sig-label">Handtekening vervoerder</div>
    </div>` : ""}
    ${(copies.includes("receiver") || copies.length === 0) ? `
    <div class="sig-box">
      <div class="sig-label">Handtekening ontvanger</div>
    </div>` : ""}
  </div>

  <div class="footer">
    ${companyName} | ${esc(company?.address || "")} ${esc([company?.postal_code, company?.city].filter(Boolean).join(" ") || "")}
    ${company?.vat_number ? ` | BTW: ${esc(company.vat_number)}` : ""}
    ${company?.kvk_number ? ` | KvK: ${esc(company.kvk_number)}` : ""}
    <br>Document gegenereerd op ${new Date().toLocaleDateString("nl-NL")} ${new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
  </div>
</body>
</html>`;

    const fileName = `${docTitle}_${trip.order_number || entityId}.html`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        fileName,
        document_type: documentType,
        entity_id: entityId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[generate-document-pdf] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
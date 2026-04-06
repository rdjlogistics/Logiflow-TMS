import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Validate tenant
    const { data: uc } = await admin
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .single();

    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { stop_proof_id } = await req.json();
    if (!stop_proof_id) {
      return new Response(JSON.stringify({ error: "stop_proof_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch stop proof
    const { data: proof, error: proofErr } = await admin
      .from("stop_proofs")
      .select("*")
      .eq("id", stop_proof_id)
      .single();

    if (proofErr || !proof) {
      return new Response(JSON.stringify({ error: "Stop proof niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate tenant ownership via trip
    const { data: tripCheck } = await admin
      .from("trips")
      .select("company_id")
      .eq("id", proof.trip_id)
      .single();

    if (!tripCheck || tripCheck.company_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Toegang geweigerd" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch related data
    const [tripRes, stopRes, driverRes] = await Promise.all([
      admin.from("trips").select("id, order_number, trip_date, customer_id, customers:customer_id (company_name, contact_name, address, city, postal_code)").eq("id", proof.trip_id).single(),
      admin.from("route_stops").select("id, company_name, address, city, postal_code, contact_name").eq("id", proof.stop_id).single(),
      admin.from("drivers").select("id, name").eq("id", proof.driver_id).single(),
    ]);

    const trip = tripRes.data as any;
    const stop = stopRes.data as any;
    const driver = driverRes.data as any;

    // Generate signed URLs for signature and photos
    let signatureDataUrl = "";
    if (proof.signature_url) {
      const { data: sigSigned } = await admin.storage
        .from("pod-files")
        .createSignedUrl(proof.signature_url, 600);
      if (sigSigned?.signedUrl) {
        try {
          const sigResp = await fetch(sigSigned.signedUrl);
          if (sigResp.ok) {
            const buf = await sigResp.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            const ct = sigResp.headers.get("content-type") || "image/png";
            signatureDataUrl = `data:${ct};base64,${b64}`;
          }
        } catch { /* ignore */ }
      }
    }

    const photoDataUrls: string[] = [];
    if (proof.photo_urls && proof.photo_urls.length > 0) {
      for (const photoPath of proof.photo_urls.slice(0, 4)) {
        const { data: photoSigned } = await admin.storage
          .from("pod-files")
          .createSignedUrl(photoPath, 600);
        if (photoSigned?.signedUrl) {
          try {
            const photoResp = await fetch(photoSigned.signedUrl);
            if (photoResp.ok) {
              const buf = await photoResp.arrayBuffer();
              const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
              const ct = photoResp.headers.get("content-type") || "image/jpeg";
              photoDataUrls.push(`data:${ct};base64,${b64}`);
            }
          } catch { /* ignore */ }
        }
      }
    }

    const receiverName = [proof.receiver_first_name, proof.receiver_last_name].filter(Boolean).join(" ") || "-";
    const orderNumber = trip?.order_number || "-";
    const tripDate = trip?.trip_date ? new Date(trip.trip_date).toLocaleDateString("nl-NL") : "-";
    const customerName = trip?.customers?.company_name || "-";
    const driverName = driver?.name || "-";
    const stopCompany = stop?.company_name || "-";
    const stopAddress = [stop?.address, stop?.city].filter(Boolean).join(", ") || "-";

    const arrivalTime = proof.arrival_time ? new Date(proof.arrival_time).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) : "-";
    const departureTime = proof.departure_time && proof.departure_time !== proof.arrival_time
      ? new Date(proof.departure_time).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
      : "-";
    const waitingMin = proof.waiting_minutes != null ? `${proof.waiting_minutes} min` : "-";

    // Build HTML for PDF
    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<title>POD ${orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 30px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 22pt; color: #2563eb; }
  .header .meta { text-align: right; font-size: 9pt; color: #666; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
  .card-title { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 6px; font-weight: 600; }
  .card-value { font-size: 11pt; font-weight: 600; }
  .card-sub { font-size: 9pt; color: #6b7280; margin-top: 2px; }
  .times { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .time-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .time-label { font-size: 8pt; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
  .time-value { font-size: 16pt; font-weight: 700; }
  .section-title { font-size: 10pt; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 600; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .signature-box { border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; min-height: 120px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
  .signature-box img { max-height: 100px; max-width: 300px; }
  .photos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .photos img { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
  .note-title { font-size: 9pt; font-weight: 600; color: #92400e; margin-bottom: 4px; }
  .note-text { font-size: 10pt; color: #78350f; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Proof of Delivery</h1>
      <p style="color:#6b7280;font-size:10pt;margin-top:4px;">Digitaal afleverbewijs</p>
    </div>
    <div class="meta">
      <p style="font-size:14pt;font-weight:700;color:#1a1a1a;">${orderNumber}</p>
      <p>${tripDate}</p>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Klant</div>
      <div class="card-value">${esc(customerName)}</div>
    </div>
    <div class="card">
      <div class="card-title">Afleveradres</div>
      <div class="card-value">${esc(stopCompany)}</div>
      <div class="card-sub">${esc(stopAddress)}</div>
    </div>
    <div class="card">
      <div class="card-title">Chauffeur</div>
      <div class="card-value">${esc(driverName)}</div>
    </div>
    <div class="card">
      <div class="card-title">Ontvanger</div>
      <div class="card-value">${esc(receiverName)}</div>
    </div>
  </div>

  <div class="times">
    <div class="time-box">
      <div class="time-label">Aankomst</div>
      <div class="time-value">${arrivalTime}</div>
    </div>
    <div class="time-box">
      <div class="time-label">Vertrek</div>
      <div class="time-value">${departureTime}</div>
    </div>
    <div class="time-box">
      <div class="time-label">Wachttijd</div>
      <div class="time-value">${waitingMin}</div>
    </div>
  </div>

  <div class="section-title">Handtekening</div>
  <div class="signature-box">
    ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Handtekening" />` : '<p style="color:#9ca3af;">Geen handtekening</p>'}
  </div>

  ${photoDataUrls.length > 0 ? `
  <div class="section-title">Foto's (${photoDataUrls.length})</div>
  <div class="photos">
    ${photoDataUrls.map((u) => `<img src="${u}" alt="Foto" />`).join("")}
  </div>
  ` : ""}

  ${proof.note ? `
  <div class="note">
    <div class="note-title">Opmerkingen</div>
    <div class="note-text">${esc(proof.note)}</div>
  </div>
  ` : ""}

  ${proof.latitude && proof.longitude ? `
  <div style="font-size:9pt;color:#6b7280;margin-bottom:20px;">
    GPS: ${proof.latitude.toFixed(5)}, ${proof.longitude.toFixed(5)}${proof.accuracy ? ` (+-${proof.accuracy.toFixed(0)}m)` : ""}
  </div>
  ` : ""}

  <div class="footer">
    Digitaal gegenereerd afleverbewijs - ${new Date().toLocaleDateString("nl-NL")} ${new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
  </div>
</body>
</html>`;

    const fileName = `POD-${orderNumber}.html`;

    // Return consistent contract: html + fileName + success
    // Callers can use `html` to render/download/print
    return new Response(
      JSON.stringify({ html, fileName, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-pod-pdf error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
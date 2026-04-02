import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Ongeldige sessie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoiceId is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice with carrier
    const { data: invoice, error: invError } = await supabase
      .from("purchase_invoices")
      .select(`
        *,
        carriers (
          company_name, contact_name, address, postal_code, city, country,
          vat_number, kvk_number, iban, bic, email, phone
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Factuur niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch company (tenant) info
    const { data: company } = await supabase
      .from("companies")
      .select("name, address, postal_code, city, country, vat_number, kvk_number, iban, bic, email, phone, logo_url")
      .eq("id", invoice.company_id)
      .single();

    // Fetch linked trips
    const { data: trips } = await supabase
      .from("trips")
      .select(`
        id, order_number, trip_date, pickup_city, delivery_city,
        purchase_total, distance_km, travel_hours,
        carrier_rate_type, carrier_hourly_rate, carrier_km_rate, carrier_worked_hours
      `)
      .eq("purchase_invoice_id", invoiceId)
      .order("trip_date", { ascending: true });

    const carrier = invoice.carriers as any;
    const isSelfBilling = invoice.is_self_billing;

    // For self-billing: sender = company, receiver = carrier
    // For standard: sender = carrier, receiver = company
    const sender = isSelfBilling
      ? { name: company?.name, address: company?.address, postal: company?.postal_code, city: company?.city, country: company?.country, vat: company?.vat_number, kvk: company?.kvk_number }
      : { name: carrier?.company_name, address: carrier?.address, postal: carrier?.postal_code, city: carrier?.city, country: carrier?.country, vat: carrier?.vat_number, kvk: carrier?.kvk_number };

    const receiver = isSelfBilling
      ? { name: carrier?.company_name, address: carrier?.address, postal: carrier?.postal_code, city: carrier?.city, country: carrier?.country, vat: carrier?.vat_number, kvk: carrier?.kvk_number }
      : { name: company?.name, address: company?.address, postal: company?.postal_code, city: company?.city, country: company?.country, vat: company?.vat_number, kvk: company?.kvk_number };

    // Build trip rows
    const tripRows = (trips || []).map((t: any) => {
      let rateInfo = "";
      if (t.carrier_rate_type === "hourly" && t.carrier_hourly_rate) {
        const hours = t.carrier_worked_hours || t.travel_hours || 0;
        rateInfo = `${Number(hours).toFixed(1)}u x ${formatCurrency(Number(t.carrier_hourly_rate))}`;
      } else if (t.carrier_rate_type === "km" && t.carrier_km_rate) {
        const km = t.distance_km || 0;
        rateInfo = `${Number(km).toFixed(0)} km x ${formatCurrency(Number(t.carrier_km_rate))}`;
      } else {
        rateInfo = "Vast tarief";
      }

      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(t.order_number)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatDate(t.trip_date)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(t.pickup_city)} - ${escapeHtml(t.delivery_city)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(rateInfo)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-variant-numeric:tabular-nums;">${formatCurrency(Number(t.purchase_total))}</td>
        </tr>`;
    }).join("");

    const selfBillingNote = isSelfBilling
      ? `<div style="margin-top:16px;padding:12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:11px;color:#92400e;">
           <strong>Self-billing factuur</strong> - Deze factuur is opgesteld door de opdrachtgever namens de vervoerder conform artikel 224 Btw-richtlijn.
         </div>`
      : "";

    const footnoteHtml = invoice.footnote
      ? `<div style="margin-top:16px;padding:12px;background:#f3f4f6;border-radius:6px;font-size:11px;color:#6b7280;">${escapeHtml(invoice.footnote)}</div>`
      : "";

    const periodStr = invoice.period_from && invoice.period_to
      ? `${formatDate(invoice.period_from)} t/m ${formatDate(invoice.period_to)}`
      : "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Helvetica,Arial,sans-serif; font-size:12px; color:#1f2937; padding:40px; }
  .header { display:flex; justify-content:space-between; margin-bottom:40px; }
  .title { font-size:24px; font-weight:bold; color:#111827; }
  .subtitle { font-size:11px; color:#6b7280; margin-top:4px; }
  .parties { display:flex; justify-content:space-between; margin-bottom:32px; }
  .party { width:45%; }
  .party-label { font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#9ca3af; margin-bottom:6px; font-weight:600; }
  .party-name { font-size:14px; font-weight:bold; margin-bottom:4px; }
  .party-detail { font-size:11px; color:#6b7280; line-height:1.6; }
  .meta { display:flex; gap:32px; margin-bottom:24px; padding:16px; background:#f9fafb; border-radius:8px; }
  .meta-item label { display:block; font-size:10px; text-transform:uppercase; color:#9ca3af; font-weight:600; }
  .meta-item span { font-size:13px; font-weight:600; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  th { text-align:left; padding:10px 12px; background:#f3f4f6; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; font-weight:600; border-bottom:2px solid #d1d5db; }
  th:last-child { text-align:right; }
  .totals { margin-left:auto; width:280px; }
  .total-row { display:flex; justify-content:space-between; padding:8px 0; font-size:12px; }
  .total-row.grand { border-top:2px solid #111827; padding-top:12px; margin-top:4px; font-size:16px; font-weight:bold; }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:10px; color:#9ca3af; text-align:center; }
</style></head><body>
  <div class="header">
    <div>
      <div class="title">${isSelfBilling ? "Self-billing Inkoopfactuur" : "Inkoopfactuur"}</div>
      <div class="subtitle">${escapeHtml(invoice.invoice_number)}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Van</div>
      <div class="party-name">${escapeHtml(sender.name)}</div>
      <div class="party-detail">
        ${escapeHtml(sender.address || "")}<br>
        ${escapeHtml(sender.postal || "")} ${escapeHtml(sender.city || "")}<br>
        ${sender.vat ? `BTW: ${escapeHtml(sender.vat)}<br>` : ""}
        ${sender.kvk ? `KvK: ${escapeHtml(sender.kvk)}` : ""}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Aan</div>
      <div class="party-name">${escapeHtml(receiver.name)}</div>
      <div class="party-detail">
        ${escapeHtml(receiver.address || "")}<br>
        ${escapeHtml(receiver.postal || "")} ${escapeHtml(receiver.city || "")}<br>
        ${receiver.vat ? `BTW: ${escapeHtml(receiver.vat)}<br>` : ""}
        ${receiver.kvk ? `KvK: ${escapeHtml(receiver.kvk)}` : ""}
      </div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><label>Factuurdatum</label><span>${formatDate(invoice.invoice_date)}</span></div>
    <div class="meta-item"><label>Vervaldatum</label><span>${invoice.due_date ? formatDate(invoice.due_date) : "-"}</span></div>
    ${periodStr ? `<div class="meta-item"><label>Periode</label><span>${periodStr}</span></div>` : ""}
    <div class="meta-item"><label>Aantal ritten</label><span>${trips?.length || 0}</span></div>
  </div>

  <table>
    <thead><tr>
      <th>Order</th><th>Datum</th><th>Route</th><th>Tarief</th><th>Bedrag</th>
    </tr></thead>
    <tbody>${tripRows}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotaal</span><span style="font-variant-numeric:tabular-nums;">${formatCurrency(invoice.subtotal || 0)}</span></div>
    <div class="total-row"><span>BTW ${invoice.vat_percentage ?? 21}%${invoice.vat_type === 'verlegd' ? ' (verlegd)' : ''}</span><span style="font-variant-numeric:tabular-nums;">${formatCurrency(invoice.vat_amount || 0)}</span></div>
    <div class="total-row grand"><span>Totaal</span><span style="font-variant-numeric:tabular-nums;">${formatCurrency(invoice.total_amount || 0)}</span></div>
  </div>

  ${selfBillingNote}
  ${footnoteHtml}

  ${carrier?.iban ? `<div style="margin-top:24px;padding:12px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:11px;">
    <strong>Betaling naar:</strong> ${escapeHtml(carrier.company_name)} - IBAN: ${escapeHtml(carrier.iban)}${carrier.bic ? ` / BIC: ${escapeHtml(carrier.bic)}` : ""}
  </div>` : ""}

  <div class="footer">
    ${escapeHtml(company?.name || "")} | ${escapeHtml(company?.address || "")} ${escapeHtml(company?.postal_code || "")} ${escapeHtml(company?.city || "")}
    ${company?.vat_number ? ` | BTW: ${escapeHtml(company.vat_number)}` : ""}
    ${company?.kvk_number ? ` | KvK: ${escapeHtml(company.kvk_number)}` : ""}
  </div>
</body></html>`;

    // Convert HTML to base64 PDF using a simple approach
    // We'll encode the HTML as a data URI-style PDF wrapper
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);
    let binary = '';
    for (let i = 0; i < htmlBytes.length; i++) {
      binary += String.fromCharCode(htmlBytes[i]);
    }
    const base64Html = btoa(binary);

    return new Response(
      JSON.stringify({ pdf: base64Html, html: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("PDF generation error:", err);
    return new Response(JSON.stringify({ error: "PDF generatie mislukt" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

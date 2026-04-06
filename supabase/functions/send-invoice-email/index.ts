import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Generate UBL 2.1 Invoice XML */
function generateUBLXml(invoice: any, company: any, customer: any, lines: any[]): string {
  const issueDate = invoice.invoice_date || new Date().toISOString().split("T")[0];
  const dueDate = invoice.due_date || issueDate;
  const currencyCode = "EUR";
  const taxPercent = invoice.vat_percentage ?? 21;
  const taxableAmount = (Number(invoice.subtotal_amount) || Number(invoice.total_amount) / 1.21).toFixed(2);
  const taxAmount = (Number(invoice.total_amount) - Number(taxableAmount)).toFixed(2);
  const totalAmount = Number(invoice.total_amount).toFixed(2);

  const escXml = (s: string | null | undefined) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const invoiceLines = (lines || []).map((line: any, i: number) => `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="EA">${line.quantity || 1}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currencyCode}">${Number(line.line_total || line.amount || 0).toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description>${escXml(line.description)}</cbc:Description>
        <cbc:Name>${escXml(line.description || "Transport")}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${taxPercent}</cbc:Percent>
          <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currencyCode}">${Number(line.unit_price || line.amount || 0).toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escXml(invoice.invoice_number)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currencyCode}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escXml(company?.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(company?.address)}</cbc:StreetName>
        <cbc:CityName>${escXml(company?.city)}</cbc:CityName>
        <cbc:PostalZone>${escXml(company?.postal_code)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${escXml(company?.country || "NL")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escXml(company?.vat_number)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escXml(company?.name)}</cbc:RegistrationName>
        <cbc:CompanyID>${escXml(company?.kvk_number)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escXml(customer?.company_name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escXml(customer?.address)}</cbc:StreetName>
        <cbc:CityName>${escXml(customer?.city)}</cbc:CityName>
        <cbc:PostalZone>${escXml(customer?.postal_code)}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>${escXml(customer?.country || "NL")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escXml(customer?.vat_number)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escXml(customer?.company_name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escXml(company?.iban)}</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyCode}">${taxAmount}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currencyCode}">${taxableAmount}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currencyCode}">${taxAmount}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${taxPercent}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${taxableAmount}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currencyCode}">${taxableAmount}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currencyCode}">${totalAmount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currencyCode}">${totalAmount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${invoiceLines}
</Invoice>`;
}

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
    const { data: { user }, error: claimsError } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (claimsError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = user.id;

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

    const reqBody = await req.json();
    const invoiceId = reqBody.invoiceId || reqBody.invoice_id;
    const to = reqBody.to || reqBody.recipient_emails;
    const subject = reqBody.subject || reqBody.email_subject;
    const body = reqBody.body || reqBody.email_body;
    const cc = reqBody.cc;
    const bcc = reqBody.bcc;
    const includeUbl = reqBody.include_ubl ?? false;
    if (!invoiceId || !to || !subject) {
      return new Response(JSON.stringify({ error: "invoiceId, to en subject zijn verplicht" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-invoice-email] Sending invoice ${invoiceId} to ${to}, UBL: ${includeUbl}`);

    // Fetch full invoice with customer and company data
    const { data: invoice } = await supabaseAdmin
      .from("invoices").select("*, customers(*), companies(*)")
      .eq("id", invoiceId).single();

    if (!invoice || invoice.company_id !== uc.company_id) {
      return new Response(JSON.stringify({ error: "Factuur niet gevonden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-invoice-email] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "E-mail service niet geconfigureerd" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@resend.dev";
    const sanitizedFrom = fromEmail.replace(/[<>"']/g, "");

    const emailPayload: Record<string, unknown> = {
      from: sanitizedFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: body || `<p>Bijgaand ontvangt u factuur ${invoice.invoice_number}.</p>`,
    };

    if (cc) emailPayload.cc = Array.isArray(cc) ? cc : [cc];
    if (bcc) emailPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];

    // Build attachments array
    const attachments: { filename: string; content: string }[] = [];

    // Generate UBL 2.1 XML if requested
    if (includeUbl) {
      // Fetch invoice lines for UBL
      const { data: invoiceLines } = await supabaseAdmin
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId);

      const ublXml = generateUBLXml(invoice, invoice.companies, invoice.customers, invoiceLines || []);
      const ublBase64 = btoa(unescape(encodeURIComponent(ublXml)));
      attachments.push({
        filename: `${invoice.invoice_number}.xml`,
        content: ublBase64,
      });
      console.log(`[send-invoice-email] UBL XML generated for ${invoice.invoice_number}`);
    }

    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-invoice-email] Resend error:", JSON.stringify(resendData));
      return new Response(
        JSON.stringify({ error: resendData.message || "E-mail verzenden mislukt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the send
    await supabaseAdmin.from("email_send_log").insert({
      template_name: "invoice_email",
      recipient_email: Array.isArray(to) ? to[0] : to,
      status: "sent",
      message_id: resendData.id,
      metadata: { invoice_id: invoiceId, invoice_number: invoice.invoice_number, subject, include_ubl: includeUbl },
    }).then(() => {}).catch(() => {});

    // Update invoice email status
    await supabaseAdmin.from("invoices")
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq("id", invoiceId);

    console.log(`[send-invoice-email] Success: ${resendData.id}`);

    return new Response(
      JSON.stringify({ success: true, message_id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-invoice-email] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Interne serverfout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

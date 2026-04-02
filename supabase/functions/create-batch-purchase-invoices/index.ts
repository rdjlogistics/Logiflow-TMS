import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// BTW logic for purchase invoices
const EU_LANDEN = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
  'DE','GR','HU','IE','IT','LV','LT','LU','MT','NL',
  'PL','PT','RO','SK','SI','ES','SE',
];

const LAND_NAAM_NAAR_ISO: Record<string, string> = {
  'nederland': 'NL', 'the netherlands': 'NL', 'netherlands': 'NL', 'holland': 'NL',
  'belgie': 'BE', 'belgium': 'BE', 'duitsland': 'DE', 'germany': 'DE',
  'frankrijk': 'FR', 'france': 'FR', 'spanje': 'ES', 'spain': 'ES',
  'italië': 'IT', 'italie': 'IT', 'italy': 'IT',
  'oostenrijk': 'AT', 'austria': 'AT', 'portugal': 'PT',
  'polen': 'PL', 'poland': 'PL', 'tsjechië': 'CZ', 'tsjechie': 'CZ',
  'hongarije': 'HU', 'hungary': 'HU', 'roemenië': 'RO', 'roemenie': 'RO', 'romania': 'RO',
  'bulgarije': 'BG', 'bulgaria': 'BG', 'kroatië': 'HR', 'kroatie': 'HR', 'croatia': 'HR',
  'griekenland': 'GR', 'greece': 'GR', 'ierland': 'IE', 'ireland': 'IE',
  'denemarken': 'DK', 'denmark': 'DK', 'zweden': 'SE', 'sweden': 'SE',
  'finland': 'FI', 'noorwegen': 'NO', 'norway': 'NO', 'zwitserland': 'CH', 'switzerland': 'CH',
};

function normaliseerLand(land: string | null | undefined): string {
  if (!land || land.trim() === '') return 'NL';
  const cleaned = land.trim();
  if (cleaned.length === 2) return cleaned.toUpperCase();
  const lower = cleaned.toLowerCase();
  if (LAND_NAAM_NAAR_ISO[lower]) return LAND_NAAM_NAAR_ISO[lower];
  return cleaned.toUpperCase().substring(0, 2);
}

function isGeldigBTWnummer(nr: string | null | undefined): boolean {
  if (!nr) return false;
  return /^[A-Z]{2}[A-Z0-9]{8,}$/i.test(nr.replace(/[\s.-]/g, ''));
}

function berekenBTW(ontvangerLand: string | null, ontvangerBTW: string | null): { tarief: 0 | 9 | 21; type: string; factuurVermelding: string } {
  const ontvanger = normaliseerLand(ontvangerLand);
  if (ontvanger === 'NL') return { tarief: 21, type: 'normaal', factuurVermelding: '' };
  if (EU_LANDEN.includes(ontvanger) && isGeldigBTWnummer(ontvangerBTW)) {
    return { tarief: 0, type: 'verlegd', factuurVermelding: 'BTW verlegd - Intracommunautaire dienst art. 44 BTW-richtlijn 2006/112/EG' };
  }
  if (EU_LANDEN.includes(ontvanger)) return { tarief: 21, type: 'normaal', factuurVermelding: '' };
  return { tarief: 0, type: 'vrijgesteld', factuurVermelding: 'Vrijgesteld van BTW - dienst buiten de EU' };
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

    // Get tenant
    const { data: uc } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .single();

    if (!uc) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gevonden" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = uc.company_id;
    const body = await req.json();
    const { carrier_id, period_from, period_to, invoice_date, is_self_billing, footnote } = body;

    if (!carrier_id || !period_from || !period_to || !invoice_date) {
      return new Response(JSON.stringify({ error: "Ontbrekende parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find eligible trips
    const { data: trips, error: tripsError } = await supabase
      .from("trips")
      .select("id, order_number, purchase_total, carrier_id, carriers!inner(company_name, country, vat_number)")
      .eq("company_id", companyId)
      .eq("carrier_id", carrier_id)
      .in("status", ["afgerond", "gecontroleerd"])
      .is("purchase_invoice_id", null)
      .not("purchase_total", "is", null)
      .gt("purchase_total", 0)
      .gte("trip_date", period_from)
      .lte("trip_date", period_to);

    if (tripsError) {
      console.error("Error fetching trips:", tripsError);
      return new Response(JSON.stringify({ error: "Kon orders niet ophalen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!trips || trips.length === 0) {
      return new Response(
        JSON.stringify({ error: "Geen factureerbare orders gevonden voor deze carrier/periode" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const carrier = trips[0].carriers as any;
    const carrierName = carrier?.company_name || "Onbekend";

    // Smart VAT calculation based on carrier country
    const carrierCountry = carrier?.country || "NL";
    const carrierVat = carrier?.vat_number || null;
    const btwResult = berekenBTW(carrierCountry, carrierVat);
    // For purchase invoices: "verlegd" means the NL buyer must self-assess 21% VAT
    const vatPercentage = btwResult.type === 'verlegd' ? 21 : btwResult.tarief;
    const vatType = btwResult.type;
    const vatNote = btwResult.factuurVermelding || null;

    // Calculate totals
    const subtotal = trips.reduce((sum, t) => sum + Number(t.purchase_total || 0), 0);
    const vatAmount = Math.round(subtotal * (vatPercentage / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

    // Generate invoice number
    const { data: invoiceNumber, error: numError } = await supabase.rpc(
      "get_next_purchase_invoice_number",
      { p_company_id: companyId }
    );

    if (numError || !invoiceNumber) {
      console.error("Error generating invoice number:", numError);
      return new Response(JSON.stringify({ error: "Kon factuurnummer niet genereren" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get payment terms
    const { data: settings } = await supabase
      .from("purchase_invoice_settings")
      .select("default_payment_terms_days")
      .eq("company_id", companyId)
      .single();

    const paymentDays = settings?.default_payment_terms_days || 30;
    const dueDate = new Date(invoice_date);
    dueDate.setDate(dueDate.getDate() + paymentDays);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Create purchase invoice
    const { data: invoice, error: insertError } = await supabase
      .from("purchase_invoices")
      .insert({
        company_id: companyId,
        carrier_id: carrier_id,
        invoice_number: invoiceNumber,
        invoice_date: invoice_date,
        due_date: dueDateStr,
        period_from: period_from,
        period_to: period_to,
        subtotal: subtotal,
        vat_percentage: vatPercentage,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        is_self_billing: is_self_billing || false,
        footnote: footnote || null,
        vat_type: vatType,
        vat_note: vatNote,
        status: "concept",
        created_by: user.id,
      })
      .select("id, invoice_number")
      .single();

    if (insertError || !invoice) {
      console.error("Error creating invoice:", insertError);
      return new Response(JSON.stringify({ error: "Kon factuur niet aanmaken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create invoice lines per trip
    const invoiceLines = trips.map((t) => {
      const unitPrice = Number(t.purchase_total || 0);
      const lineVat = Math.round(unitPrice * (vatPercentage / 100) * 100) / 100;
      return {
        purchase_invoice_id: invoice.id,
        trip_id: t.id,
        description: `Order ${t.order_number || t.id}`,
        quantity: 1,
        unit_price: unitPrice,
        total_price: unitPrice,
        vat_percentage: vatPercentage,
        vat_amount: lineVat,
        line_type: "trip",
      };
    });

    const { error: linesError } = await supabase
      .from("purchase_invoice_lines")
      .insert(invoiceLines);

    if (linesError) {
      console.error("Error creating invoice lines:", linesError);
      await supabase.from("purchase_invoices").delete().eq("id", invoice.id);
      return new Response(JSON.stringify({ error: "Kon factuurregels niet aanmaken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link trips to invoice
    const tripIds = trips.map((t) => t.id);
    const { error: linkError } = await supabase
      .from("trips")
      .update({ purchase_invoice_id: invoice.id })
      .in("id", tripIds);

    if (linkError) {
      console.error("Error linking trips:", linkError);
      // Rollback: delete invoice (cascade deletes lines)
      await supabase.from("purchase_invoices").delete().eq("id", invoice.id);
      return new Response(JSON.stringify({ error: "Kon orders niet koppelen aan factuur" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        invoices: [
          {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            carrier_name: carrierName,
            total_amount: totalAmount,
          },
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Interne serverfout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// BTW logic (inline — cannot import from src/)
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
  'finland': 'FI', 'estland': 'EE', 'estonia': 'EE',
  'letland': 'LV', 'latvia': 'LV', 'litouwen': 'LT', 'lithuania': 'LT',
  'luxemburg': 'LU', 'luxembourg': 'LU', 'malta': 'MT', 'cyprus': 'CY',
  'slowakije': 'SK', 'slovakia': 'SK', 'slovenië': 'SI', 'slovenie': 'SI', 'slovenia': 'SI',
  'verenigd koninkrijk': 'GB', 'united kingdom': 'GB', 'uk': 'GB',
  'noorwegen': 'NO', 'norway': 'NO', 'zwitserland': 'CH', 'switzerland': 'CH',
  'turkije': 'TR', 'turkey': 'TR', 'marokko': 'MA', 'morocco': 'MA',
};

function normaliseerLand(land: string | null | undefined): string {
  if (!land || land.trim() === '') return 'NL';
  const cleaned = land.trim();
  if (cleaned.length === 2) return cleaned.toUpperCase();
  const lower = cleaned.toLowerCase();
  if (LAND_NAAM_NAAR_ISO[lower]) return LAND_NAAM_NAAR_ISO[lower];
  for (const [naam, iso] of Object.entries(LAND_NAAM_NAAR_ISO)) {
    if (lower.includes(naam) || naam.includes(lower)) return iso;
  }
  return cleaned.toUpperCase().substring(0, 2);
}

function isEuLand(code: string): boolean {
  return EU_LANDEN.includes(code.toUpperCase());
}

function isGeldigBTWnummer(nr: string | null | undefined): boolean {
  if (!nr) return false;
  return /^[A-Z]{2}[A-Z0-9]{8,}$/i.test(nr.replace(/[\s.-]/g, ''));
}

interface BtwResult {
  tarief: 0 | 9 | 21;
  type: 'normaal' | 'verlegd' | 'vrijgesteld';
  factuurVermelding: string;
}

function berekenBTW(ontvangerLand: string | null, ontvangerBTW: string | null): BtwResult {
  const ontvanger = normaliseerLand(ontvangerLand);

  // NL → NL
  if (ontvanger === 'NL') {
    return { tarief: 21, type: 'normaal', factuurVermelding: '' };
  }
  // NL → EU + geldig BTW
  if (isEuLand(ontvanger) && isGeldigBTWnummer(ontvangerBTW)) {
    return { tarief: 0, type: 'verlegd', factuurVermelding: 'BTW verlegd - Intracommunautaire dienst art. 44 BTW-richtlijn 2006/112/EG' };
  }
  // NL → EU zonder BTW
  if (isEuLand(ontvanger)) {
    return { tarief: 21, type: 'normaal', factuurVermelding: '' };
  }
  // NL → buiten EU
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
    const {
      selected_customer_ids,
      period_from,
      period_to,
      invoice_date,
      is_proforma,
      footnote,
      include_unverified,
    } = body;

    if (!selected_customer_ids?.length || !period_from || !period_to || !invoice_date) {
      return new Response(JSON.stringify({ error: "Ontbrekende parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statuses = include_unverified
      ? ["gecontroleerd", "afgerond", "afgeleverd"]
      : ["gecontroleerd", "afgerond"];

    const createdInvoices: { id: string; invoice_number: string; customer_name: string; total_amount: number }[] = [];
    let grandTotal = 0;

    for (const customerId of selected_customer_ids) {
      // Fetch eligible trips for this customer
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("id, order_number, sales_total, customer_id, customers!inner(company_name, country, vat_number, payment_terms_days)")
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .in("status", statuses)
        .is("invoice_id", null)
        .not("sales_total", "is", null)
        .gt("sales_total", 0)
        .gte("trip_date", period_from)
        .lte("trip_date", period_to);

      if (tripsError) {
        console.error("Error fetching trips for customer:", customerId, tripsError);
        continue;
      }

      if (!trips || trips.length === 0) continue;

      const customerData = (trips[0].customers as any);
      const customerName = customerData?.company_name || "Onbekend";
      const customerCountry = customerData?.country || null;
      const customerVat = customerData?.vat_number || null;
      const paymentDays = customerData?.payment_terms_days || 30;

      // BTW
      const btw = berekenBTW(customerCountry, customerVat);
      const subtotal = trips.reduce((sum, t) => sum + Number(t.sales_total || 0), 0);
      const vatAmount = Math.round(subtotal * (btw.tarief / 100) * 100) / 100;
      const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

      // Invoice number
      const { data: invoiceNumber, error: numError } = await supabase.rpc(
        "get_next_invoice_number",
        { p_company_id: companyId }
      );

      if (numError || !invoiceNumber) {
        console.error("Error generating invoice number:", numError);
        continue;
      }

      // Due date
      const dueDate = new Date(invoice_date);
      dueDate.setDate(dueDate.getDate() + paymentDays);
      const dueDateStr = dueDate.toISOString().split("T")[0];

      // Create invoice
      const { data: invoice, error: insertError } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId,
          customer_id: customerId,
          invoice_number: invoiceNumber,
          invoice_date: invoice_date,
          due_date: dueDateStr,
          period_from: period_from,
          period_to: period_to,
          subtotal: subtotal,
          vat_percentage: btw.tarief,
          vat_amount: vatAmount,
          vat_type: btw.type,
          vat_note: btw.factuurVermelding || null,
          total_amount: totalAmount,
          invoice_type: is_proforma ? "proforma" : "standaard",
          footnote: footnote || null,
          status: "concept",
        })
        .select("id, invoice_number")
        .single();

      if (insertError || !invoice) {
        console.error("Error creating invoice for customer:", customerId, insertError);
        continue;
      }

      // Create invoice lines per trip
      const lines = trips.map((t) => ({
        invoice_id: invoice.id,
        trip_id: t.id,
        description: `Order ${t.order_number || t.id}`,
        quantity: 1,
        unit_price: Number(t.sales_total || 0),
        total_price: Number(t.sales_total || 0),
        vat_percentage: btw.tarief,
        vat_amount: Math.round(Number(t.sales_total || 0) * (btw.tarief / 100) * 100) / 100,
        vat_type: btw.type,
        line_type: "transport",
      }));

      const { error: linesError } = await supabase.from("invoice_lines").insert(lines);

      if (linesError) {
        console.error("Error creating invoice lines:", linesError);
        // Rollback invoice
        await supabase.from("invoices").delete().eq("id", invoice.id);
        continue;
      }

      // Link trips to invoice
      const tripIds = trips.map((t) => t.id);
      const { error: linkError } = await supabase
        .from("trips")
        .update({ invoice_id: invoice.id, status: "gefactureerd" })
        .in("id", tripIds);

      if (linkError) {
        console.error("Error linking trips:", linkError);
        // Rollback
        await supabase.from("invoice_lines").delete().eq("invoice_id", invoice.id);
        await supabase.from("invoices").delete().eq("id", invoice.id);
        continue;
      }

      createdInvoices.push({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: customerName,
        total_amount: totalAmount,
      });
      grandTotal += totalAmount;
    }

    if (createdInvoices.length === 0) {
      return new Response(
        JSON.stringify({ error: "Geen facturen aangemaakt — geen factureerbare orders gevonden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        invoices_created: createdInvoices.length,
        total_amount: grandTotal,
        invoices: createdInvoices,
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

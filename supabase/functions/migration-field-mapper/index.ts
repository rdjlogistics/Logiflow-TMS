import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Known field mappings for common TMS/ERP systems
const KNOWN_MAPPINGS: Record<string, Record<string, string>> = {
  trips: {
    order_number: "order_number",
    ordernummer: "order_number",
    referentie: "reference",
    reference: "reference",
    ophaaladres: "pickup_address",
    pickup_address: "pickup_address",
    afleveradres: "delivery_address",
    delivery_address: "delivery_address",
    ophaalstad: "pickup_city",
    pickup_city: "pickup_city",
    afleverstad: "delivery_city",
    delivery_city: "delivery_city",
    datum: "trip_date",
    trip_date: "trip_date",
    date: "trip_date",
    klant: "customer_name",
    customer: "customer_name",
    chauffeur: "driver_name",
    driver: "driver_name",
    prijs: "price",
    price: "price",
    revenue: "revenue",
    omzet: "revenue",
    kosten: "cost",
    cost: "cost",
    status: "status",
    gewicht: "weight_kg",
    weight: "weight_kg",
  },
  customers: {
    bedrijfsnaam: "company_name",
    company_name: "company_name",
    naam: "name",
    name: "name",
    email: "email",
    telefoon: "phone",
    phone: "phone",
    adres: "address",
    address: "address",
    stad: "city",
    city: "city",
    postcode: "postal_code",
    postal_code: "postal_code",
    kvk: "kvk_number",
    btw: "vat_number",
    vat: "vat_number",
  },
  drivers: {
    naam: "name",
    name: "name",
    telefoon: "phone",
    phone: "phone",
    email: "email",
    rijbewijs: "license_number",
    license: "license_number",
    categorie: "driver_category",
    category: "driver_category",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { sourceFields, targetTable } = await req.json();

    if (!sourceFields || !Array.isArray(sourceFields) || !targetTable) {
      return new Response(JSON.stringify({ error: "sourceFields (array) en targetTable vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const knownMap = KNOWN_MAPPINGS[targetTable] || {};
    const mappings = sourceFields.map((field: string) => {
      const normalized = field.toLowerCase().trim().replace(/[\s_-]+/g, "_");
      const match = knownMap[normalized];
      return {
        sourceField: field,
        targetField: match || null,
        confidence: match ? 95 : 0,
        suggestion: match ? `Auto-mapped naar ${match}` : "Geen match gevonden - handmatig koppelen",
      };
    });

    const autoMapped = mappings.filter((m: any) => m.targetField).length;

    return new Response(JSON.stringify({
      success: true,
      mappings,
      autoMapped,
      total: sourceFields.length,
      message: `${autoMapped}/${sourceFields.length} velden automatisch gekoppeld`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[migration-field-mapper] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

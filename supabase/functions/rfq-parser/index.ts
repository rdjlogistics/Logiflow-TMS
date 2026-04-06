import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pattern-based extraction for common RFQ/transport request formats
function extractRFQFields(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const result: Record<string, string | null> = {
    pickup_city: null,
    delivery_city: null,
    date: null,
    weight: null,
    reference: null,
    vehicle_type: null,
    goods_description: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
  };

  const fullText = text.toLowerCase();

  // Route patterns: "van X naar Y", "from X to Y", "ophalen X - leveren Y"
  const routePatterns = [
    /(?:van|from|ophalen|laden)\s*[:.]?\s*([A-Za-zÀ-ÿ\s]+?)(?:\s*[-–→>]\s*|\s+(?:naar|to|leveren|lossen)\s+)([A-Za-zÀ-ÿ\s]+?)(?:\s*$|\s*[,.\n])/im,
    /(?:route|traject)\s*[:.]?\s*([A-Za-zÀ-ÿ\s]+?)[-–→>]+([A-Za-zÀ-ÿ\s]+?)(?:$|[,.\n])/im,
  ];
  for (const pat of routePatterns) {
    const m = text.match(pat);
    if (m) { result.pickup_city = m[1].trim(); result.delivery_city = m[2].trim(); break; }
  }

  // Date patterns
  const datePatterns = [
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
    /(\d{1,2}\s+(?:jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\w*\s*\d{2,4})/i,
  ];
  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) { result.date = m[1]; break; }
  }

  // Weight
  const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|ton|kilo)/i);
  if (weightMatch) result.weight = weightMatch[1].replace(",", ".");

  // Reference
  const refMatch = text.match(/(?:ref|referentie|order|bestelling)\s*[:.#]?\s*([A-Za-z0-9\-_]+)/i);
  if (refMatch) result.reference = refMatch[1];

  // Vehicle type
  const vehicleTypes = ["vrachtwagen", "bakwagen", "bus", "trailer", "trekker", "bestelbus", "koelwagen", "truck", "van"];
  for (const vt of vehicleTypes) {
    if (fullText.includes(vt)) { result.vehicle_type = vt; break; }
  }

  // Email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) result.contact_email = emailMatch[0];

  // Phone (NL)
  const phoneMatch = text.match(/(?:\+31|0031|0)\s*[1-9][\s.-]?\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/);
  if (phoneMatch) result.contact_phone = phoneMatch[0].replace(/[\s.-]/g, "");

  // Goods description
  const goodsMatch = text.match(/(?:goederen|lading|cargo|goods|product)\s*[:.]?\s*(.+?)(?:\n|$)/i);
  if (goodsMatch) result.goods_description = goodsMatch[1].trim();

  const confidence = Object.values(result).filter(v => v !== null).length / Object.keys(result).length * 100;

  return { fields: result, confidence: Math.round(confidence) };
}

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

    const { text, emailBody, subject } = await req.json();
    const content = text || emailBody || subject || "";

    if (!content.trim()) {
      return new Response(JSON.stringify({ error: "Geen tekst om te verwerken", success: false }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[rfq-parser] Parsing ${content.length} chars`);
    const { fields, confidence } = extractRFQFields(content);

    return new Response(JSON.stringify({
      success: true,
      parsed: fields,
      confidence,
      fieldsFound: Object.values(fields).filter(v => v !== null).length,
      totalFields: Object.keys(fields).length,
      message: confidence >= 50 ? `${confidence}% vertrouwen - ${Object.values(fields).filter(v => v !== null).length} velden herkend` : "Weinig velden herkend - controleer handmatig",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[rfq-parser] Error:", err);
    return new Response(JSON.stringify({ error: err.message, success: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

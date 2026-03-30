import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: cd, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !cd?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { fileBase64, fileName, mimeType } = await req.json();
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "fileBase64 is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[smart-document-ocr] Processing file: ${fileName || "unknown"}, mime: ${mimeType || "unknown"}, user: ${cd.claims.sub}`);

    const isImage = mimeType?.startsWith("image/");
    const messages: any[] = [
      {
        role: "system",
        content: `Je bent een document OCR specialist. Analyseer het document en extraheer alle relevante gegevens. Retourneer een JSON object met:
- documentType: type document (factuur, vrachtbrief, CMR, pakbon, rijbewijs, kentekenbewijs, etc.)
- confidence: betrouwbaarheid 0-1
- extractedData: object met alle gevonden velden zoals datum, bedragen, adressen, namen, referenties, etc.
- rawText: de volledige tekst uit het document

Antwoord ALLEEN met valid JSON.`,
      },
    ];

    if (isImage) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `Analyseer dit document (${fileName || "document"}):` },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
        ],
      });
    } else {
      const textContent = atob(fileBase64);
      messages.push({
        role: "user",
        content: `Analyseer dit document (${fileName || "document"}):\n\n${textContent.substring(0, 10000)}`,
      });
    }

    const model = isImage ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";
    console.log(`[smart-document-ocr] Using model: ${model}`);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages }),
    });

    if (!resp.ok) {
      const status = resp.status;
      console.error(`[smart-document-ocr] AI gateway error: ${status}`);
      if (status === 429) return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer later opnieuw" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits onvoldoende" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI niet beschikbaar" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let parsed: any;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch {
      parsed = { documentType: "onbekend", confidence: 0.5, extractedData: {}, rawText: content };
    }

    console.log(`[smart-document-ocr] Result: type=${parsed.documentType}, confidence=${parsed.confidence}`);

    return new Response(JSON.stringify({
      success: true,
      documentType: parsed.documentType || "onbekend",
      confidence: parsed.confidence || 0.5,
      extractedData: parsed.extractedData || {},
      rawText: parsed.rawText || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[smart-document-ocr] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

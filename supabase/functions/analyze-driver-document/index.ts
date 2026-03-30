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

    const { documentId, imageUrl, documentType, fileBase64, mimeType } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[analyze-driver-document] documentId=${documentId}, type=${documentType || "unknown"}, user=${cd.claims.sub}`);

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const messages: any[] = [
      {
        role: "system",
        content: `Je bent een document verificatie specialist voor transportbedrijven. Analyseer het chauffeursdocument en controleer:
1. Type document (rijbewijs, ADR certificaat, Code 95, identiteitsbewijs, etc.)
2. Geldigheid: is het document verlopen?
3. Vervaldatum indien zichtbaar
4. Naam van de houder
5. Documentnummer
6. Categorieën (voor rijbewijs: B, C, CE, etc.)
7. Eventuele problemen of waarschuwingen

Retourneer ALLEEN valid JSON met: { documentType, holderName, documentNumber, expiryDate, categories, isValid, warnings, confidence }`,
      },
    ];

    if (fileBase64 && mimeType) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `Analyseer dit ${documentType || "chauffeurs"} document:` },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
        ],
      });
    } else if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `Analyseer dit ${documentType || "chauffeurs"} document:` },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      });
    } else {
      return new Response(JSON.stringify({ error: "imageUrl of fileBase64 is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });

    if (!resp.ok) {
      const status = resp.status;
      console.error(`[analyze-driver-document] AI gateway error: ${status}`);
      if (status === 429) return new Response(JSON.stringify({ error: "Te veel verzoeken" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits onvoldoende" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI niet beschikbaar" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    let analysis: any;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch {
      analysis = { documentType: documentType || "onbekend", isValid: false, confidence: 0.3, warnings: ["Kon document niet analyseren"] };
    }

    // Update driver_documents table with analysis
    const { error: updateError } = await supabaseAdmin
      .from("driver_documents")
      .update({
        ai_analysis_json: analysis,
        ai_analyzed_at: new Date().toISOString(),
        verification_status: analysis.isValid ? "verified" : "needs_review",
      })
      .eq("id", documentId);

    if (updateError) {
      console.warn(`[analyze-driver-document] Could not update document ${documentId}:`, updateError.message);
    }

    console.log(`[analyze-driver-document] Result: valid=${analysis.isValid}, confidence=${analysis.confidence}`);

    return new Response(JSON.stringify({
      success: true,
      analysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[analyze-driver-document] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

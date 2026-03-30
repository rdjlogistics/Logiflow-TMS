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

    const { message, portalType, conversationId, context } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "message is verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const portal = portalType || "customer";
    console.log(`[portal-ai] portal=${portal}, user=${cd.claims.sub}, conversationId=${conversationId || "new"}`);

    const systemPrompts: Record<string, string> = {
      customer: `Je bent een behulpzame klantenservice assistent voor een transportbedrijf. Je helpt klanten met:
- Status van hun zendingen opvragen
- Nieuwe transportopdrachten aanvragen
- Facturen en documenten vinden
- Algemene vragen over transport en logistiek
Antwoord altijd in het Nederlands, beknopt en professioneel.`,
      driver: `Je bent een assistent voor chauffeurs van een transportbedrijf. Je helpt met:
- Route informatie en navigatie tips
- Status updates van opdrachten
- Documentatie en administratie
- Technische vragen over het voertuig
Antwoord altijd in het Nederlands, kort en praktisch.`,
      carrier: `Je bent een assistent voor onderaannemers/carriers van een transportbedrijf. Je helpt met:
- Beschikbare opdrachten en tenders bekijken
- Facturen en betalingen
- Documentatie en compliance
- Samenwerkingsvragen
Antwoord altijd in het Nederlands, professioneel.`,
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompts[portal] || systemPrompts.customer },
          ...(context?.previousMessages || []),
          { role: "user", content: message },
        ],
      }),
    });

    if (!resp.ok) {
      const status = resp.status;
      console.error(`[portal-ai] AI gateway error: ${status}`);
      if (status === 429) return new Response(JSON.stringify({ error: "Te veel verzoeken" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits onvoldoende" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI niet beschikbaar" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "Sorry, ik kon geen antwoord genereren.";

    console.log(`[portal-ai] Response generated, length=${assistantMessage.length}`);

    return new Response(JSON.stringify({
      success: true,
      assistantMessage,
      conversationId: conversationId || crypto.randomUUID(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[portal-ai] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

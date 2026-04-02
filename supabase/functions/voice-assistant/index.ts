import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: ce } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(authHeader.replace("Bearer ", ""));
    if (ce || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const cd = { claims: { sub: user.id } };
    if (ce || !cd?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, audio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "transcribe") {
      if (!audio) {
        return new Response(JSON.stringify({ error: "Geen audio ontvangen" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Use Gemini to transcribe audio by sending it as a data URI
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "Je bent een spraak-naar-tekst transcriber. Transcribeer de audio nauwkeurig naar tekst. Geef ALLEEN de getranscribeerde tekst terug, geen extra uitleg of formatting. Als je geen spraak kunt detecteren, antwoord dan met een lege string."
            },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: audio,
                    format: "webm"
                  }
                },
                {
                  type: "text",
                  text: "Transcribeer deze audio naar Nederlandse tekst."
                }
              ]
            }
          ],
        }),
      });

      if (!resp.ok) {
        const status = resp.status;
        console.error(`[voice-assistant] AI gateway error: ${status}`);
        if (status === 429) return new Response(JSON.stringify({ error: "Te veel verzoeken" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits onvoldoende" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "Transcriptie mislukt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content?.trim() || "";

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Onbekende actie" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[voice-assistant] Error:", error);
    return new Response(JSON.stringify({ error: "Interne fout" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const COPILOT_SYSTEM = `LogiFlow Co-Pilot. Nederlands. Max 150 woorden. Bondig, concreet, actionable. Marges <15%: waarschuw.`;

function detectComplexity(message: string): "none" | "low" | "medium" {
  const lower = message.toLowerCase();
  if (/waarom|analyseer|vergelijk|optimaliseer|advies|strategie/.test(lower)) return "medium";
  if (/hoeveel|wat is|toon|lijst|status/.test(lower)) return "low";
  return "none";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No tenant" }), { status: 403, headers: corsHeaders });
    }

    const { messages: rawMessages, context } = await req.json();
    const messages = (rawMessages || []).slice(-15);
    const pageCtx = context?.currentPage ? `\nPagina: ${context.currentPage}` : "";

    // Detect complexity from last user message
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const complexity = detectComplexity(lastUserMsg);
    const reasoning = complexity === "medium" ? { effort: "medium" } : undefined;

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: COPILOT_SYSTEM + pageCtx },
          ...messages,
        ],
        stream: true,
        ...(reasoning ? { reasoning } : {}),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("Copilot AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    // Deduct 1 credit
    await supabase.rpc("deduct_ai_credits", {
      p_tenant_id: profile.company_id, p_user_id: userId, p_credits: 1,
      p_action_type: "copilot", p_complexity: "simple", p_model: "gemini-3-flash",
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("copilot error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

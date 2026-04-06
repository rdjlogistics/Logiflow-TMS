import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function makeSupabase(authHeader: string) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
}

async function getUser(authHeader: string) {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user }, error } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !user) throw new Error("Unauthorized");
  return user;
}

function scoreDriver(driver: any, trip: any): { score: number; reasoning: string[] } {
  let score = 50;
  const reasoning: string[] = [];

  // Rating score (0-25 points)
  const rating = driver.rating ?? 3;
  const ratingScore = (rating / 5) * 25;
  score += ratingScore - 12.5;
  reasoning.push(`Rating ${rating}/5 → +${ratingScore.toFixed(0)}pt`);

  // City match (0-20 points)
  if (trip.pickup_city && driver.current_city) {
    if (driver.current_city.toLowerCase() === trip.pickup_city.toLowerCase()) {
      score += 20;
      reasoning.push(`Stad match: ${driver.current_city} → +20pt`);
    } else {
      reasoning.push(`Andere stad: ${driver.current_city} vs ${trip.pickup_city}`);
    }
  }

  // Category match (0-10 points)
  if (trip.vehicle_type && driver.driver_category) {
    if (driver.driver_category.toLowerCase().includes(trip.vehicle_type.toLowerCase())) {
      score += 10;
      reasoning.push(`Voertuigtype match → +10pt`);
    }
  }

  // Active trip penalty
  if (driver.active_trip_count > 0) {
    const penalty = Math.min(driver.active_trip_count * 10, 30);
    score -= penalty;
    reasoning.push(`${driver.active_trip_count} actieve ritten → -${penalty}pt`);
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasoning };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const user = await getUser(authHeader);
    const supabase = makeSupabase(authHeader);
    const body = await req.json();
    const { action, tripId, driverId, conversationId, responseText } = body;

    console.log(`[ai-dispatch-engine] action=${action} tripId=${tripId}`);

    // Get user's company
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    const tenantId = profile?.company_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "analyze") {
      // Fetch trip
      const { data: trip, error: tripErr } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (tripErr || !trip) {
        return new Response(JSON.stringify({ error: "Rit niet gevonden", success: false }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch available drivers
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, name, phone, current_city, rating, driver_category, is_active")
        .eq("company_id", tenantId)
        .eq("is_active", true);

      if (!drivers || drivers.length === 0) {
        return new Response(JSON.stringify({ success: true, candidates: [], aiAnalysis: null, message: "Geen actieve chauffeurs gevonden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Count active trips per driver
      const { data: activeTripCounts } = await supabase
        .from("trips")
        .select("driver_id")
        .in("status", ["gepland", "onderweg", "laden"])
        .not("driver_id", "is", null);

      const tripCountMap: Record<string, number> = {};
      (activeTripCounts || []).forEach((t: any) => {
        tripCountMap[t.driver_id] = (tripCountMap[t.driver_id] || 0) + 1;
      });

      // Score each driver
      const candidates = drivers.map((driver: any) => {
        const driverWithCount = { ...driver, active_trip_count: tripCountMap[driver.id] || 0 };
        const { score, reasoning } = scoreDriver(driverWithCount, trip);
        const recommendation = score >= 80 ? "highly_recommended" : score >= 60 ? "recommended" : score >= 40 ? "acceptable" : "not_recommended";
        return {
          driver: { id: driver.id, name: driver.name, phone: driver.phone, current_city: driver.current_city, rating: driver.rating ?? 3, driver_category: driver.driver_category },
          scores: { distance: score > 70 ? 80 : 40, availability: tripCountMap[driver.id] ? 30 : 90, workload: 70, rating: (driver.rating ?? 3) * 20, history: 60 },
          overallScore: score,
          confidence: Math.min(95, score + 10),
          reasoning,
          recommendation,
        };
      });

      candidates.sort((a: any, b: any) => b.overallScore - a.overallScore);
      const topCandidates = candidates.slice(0, 10);
      const top = topCandidates[0];

      const aiAnalysis = {
        topPick: top?.driver?.name || "Geen",
        confidence: top?.confidence || 0,
        reasoning: `${top?.driver?.name} scoort ${top?.overallScore}/100 op basis van rating, locatie en beschikbaarheid.`,
        automationAdvice: (top?.overallScore || 0) >= 85 ? "auto_assign" : (top?.overallScore || 0) >= 60 ? "send_whatsapp" : "manual_review",
        riskFactors: top?.overallScore < 60 ? ["Lage match score", "Handmatige review aanbevolen"] : [],
      };

      return new Response(JSON.stringify({ success: true, candidates: topCandidates, aiAnalysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "initiate") {
      // Get driver info
      const { data: driver } = await supabase.from("drivers").select("name, phone").eq("id", driverId).single();
      const { data: trip } = await supabase.from("trips").select("pickup_city, delivery_city, trip_date, order_number").eq("id", tripId).single();

      if (!driver || !trip) {
        return new Response(JSON.stringify({ error: "Chauffeur of rit niet gevonden", success: false }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Create conversation
      const { data: conv, error: convErr } = await supabase.from("dispatch_conversations").insert({
        trip_id: tripId,
        driver_id: driverId,
        tenant_id: tenantId,
        status: "awaiting_response",
        ai_confidence: 75,
        ai_reasoning: `Dispatch gestart voor ${driver.name}`,
        initiated_at: new Date().toISOString(),
      }).select("id").single();

      if (convErr) throw convErr;

      const whatsappMessage = `Hallo ${driver.name}, er is een nieuwe rit beschikbaar:\n📍 ${trip.pickup_city} → ${trip.delivery_city}\n📅 ${trip.trip_date}\n📦 Order: ${trip.order_number || "N/B"}\n\nKun je deze rit rijden? Antwoord met JA of NEE.`;

      // Store outbound message
      await supabase.from("dispatch_messages").insert({
        conversation_id: conv!.id,
        direction: "outbound",
        message_type: "template",
        content: whatsappMessage,
        tenant_id: tenantId,
      });

      return new Response(JSON.stringify({
        success: true,
        conversationId: conv!.id,
        whatsappMessage,
        driverPhone: driver.phone,
        message: `Dispatch gestart naar ${driver.name}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "process_response") {
      if (!conversationId || !responseText) {
        return new Response(JSON.stringify({ error: "conversationId en responseText vereist", success: false }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const lower = responseText.toLowerCase().trim();
      const yesWords = ["ja", "yes", "ok", "oke", "prima", "akkoord", "goed", "kan", "doe ik", "komt goed", "top", "is goed", "deal"];
      const noWords = ["nee", "no", "niet", "kan niet", "helaas", "sorry", "lukt niet", "geen tijd", "bezet"];

      let intent: "yes" | "no" | "unclear" = "unclear";
      let confidence = 50;

      if (yesWords.some(w => lower.includes(w))) {
        intent = "yes";
        confidence = lower === "ja" || lower === "ok" ? 98 : 85;
      } else if (noWords.some(w => lower.includes(w))) {
        intent = "no";
        confidence = lower === "nee" || lower === "no" ? 98 : 85;
      }

      // Store inbound message
      await supabase.from("dispatch_messages").insert({
        conversation_id: conversationId,
        direction: "inbound",
        message_type: "text",
        content: responseText,
        ai_interpretation: { intent, confidence, sentiment: intent === "yes" ? "positive" : intent === "no" ? "negative" : "neutral" },
        tenant_id: tenantId,
      });

      // Update conversation status
      const newStatus = intent === "yes" ? "confirmed" : intent === "no" ? "declined" : "awaiting_response";
      await supabase.from("dispatch_conversations").update({
        status: newStatus,
        responded_at: new Date().toISOString(),
        ...(intent === "yes" ? { confirmed_at: new Date().toISOString() } : {}),
      }).eq("id", conversationId);

      return new Response(JSON.stringify({
        success: true,
        interpretation: { intent, confidence, sentiment: intent === "yes" ? "positive" : "negative" },
        newStatus,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "confirm_assign") {
      if (!conversationId) {
        return new Response(JSON.stringify({ error: "conversationId vereist", success: false }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: conv } = await supabase.from("dispatch_conversations").select("trip_id, driver_id").eq("id", conversationId).single();
      if (!conv) {
        return new Response(JSON.stringify({ error: "Gesprek niet gevonden", success: false }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Assign driver to trip
      const { error: updateErr } = await supabase.from("trips").update({
        driver_id: conv.driver_id,
        status: "gepland",
      }).eq("id", conv.trip_id);

      if (updateErr) throw updateErr;

      // Update conversation
      await supabase.from("dispatch_conversations").update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      }).eq("id", conversationId);

      const { data: driver } = await supabase.from("drivers").select("name").eq("id", conv.driver_id).single();

      return new Response(JSON.stringify({
        success: true,
        message: `${driver?.name || "Chauffeur"} is toegewezen aan de rit`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "cancel") {
      if (!conversationId) {
        return new Response(JSON.stringify({ error: "conversationId vereist", success: false }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("dispatch_conversations").update({ status: "cancelled" }).eq("id", conversationId);
      return new Response(JSON.stringify({ success: true, message: "Dispatch geannuleerd" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Onbekende actie: ${action}`, success: false }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[ai-dispatch-engine] Error:", err);
    return new Response(JSON.stringify({ error: err.message, success: false }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

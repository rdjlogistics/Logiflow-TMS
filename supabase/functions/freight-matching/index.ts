import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listingId } = await req.json();
    if (!listingId) {
      return new Response(JSON.stringify({ error: "listingId is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the source listing
    const { data: listing, error: listingErr } = await supabase
      .from("freight_listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: "Listing niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find opposite type listings that are active
    const oppositeType = listing.listing_type === "capacity" ? "load" : "capacity";

    const { data: candidates, error: candErr } = await supabase
      .from("freight_listings")
      .select("*")
      .eq("listing_type", oppositeType)
      .eq("status", "active")
      .neq("tenant_id", listing.tenant_id);

    if (candErr) throw candErr;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ matchesFound: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score each candidate
    const scored = candidates.map((c: any) => {
      let score = 0;
      const reasons: Record<string, string> = {};

      // Route match: same origin/destination city
      const originMatch = listing.origin_city?.toLowerCase() === c.origin_city?.toLowerCase();
      const destMatch = listing.destination_city?.toLowerCase() === c.destination_city?.toLowerCase();
      if (originMatch && destMatch) {
        score += 40;
        reasons.route_overlap = "Exacte route match";
      } else if (originMatch || destMatch) {
        score += 20;
        reasons.route_overlap = originMatch ? "Zelfde ophaallocatie" : "Zelfde afleverlocatie";
      }

      // Same country bonus
      if (listing.origin_country === c.origin_country) score += 5;
      if (listing.destination_country === c.destination_country) score += 5;

      // Vehicle type match
      if (listing.vehicle_type && c.vehicle_type && listing.vehicle_type === c.vehicle_type) {
        score += 15;
        reasons.vehicle_match = `Voertuigtype: ${c.vehicle_type}`;
      }

      // Date compatibility
      if (listing.pickup_date === c.pickup_date) {
        score += 20;
        reasons.time_match = "Zelfde ophaaldatum";
      } else {
        const diff = Math.abs(
          new Date(listing.pickup_date).getTime() - new Date(c.pickup_date).getTime()
        );
        const daysDiff = diff / (1000 * 60 * 60 * 24);
        if (daysDiff <= 1) {
          score += 10;
          reasons.time_match = "Datum binnen 1 dag";
        } else if (daysDiff <= 3) {
          score += 5;
          reasons.time_match = "Datum binnen 3 dagen";
        }
      }

      // Weight compatibility
      if (listing.weight_kg && c.weight_kg) {
        const ratio = Math.min(listing.weight_kg, c.weight_kg) / Math.max(listing.weight_kg, c.weight_kg);
        if (ratio > 0.7) {
          score += 10;
        }
      }

      // Price estimate
      if (listing.price_amount && c.price_amount) {
        reasons.price_estimate = `€${Math.min(listing.price_amount, c.price_amount)} - €${Math.max(listing.price_amount, c.price_amount)}`;
      }

      return { candidate: c, score, reasons };
    });

    // Filter and sort: only matches with score >= 20
    const matches = scored
      .filter((s: any) => s.score >= 20)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10);

    // Insert matches into freight_matches
    let matchesFound = 0;
    for (const m of matches) {
      const capacityId = listing.listing_type === "capacity" ? listing.id : m.candidate.id;
      const loadId = listing.listing_type === "load" ? listing.id : m.candidate.id;

      // Check if match already exists
      const { data: existing } = await supabase
        .from("freight_matches")
        .select("id")
        .eq("capacity_listing_id", capacityId)
        .eq("load_listing_id", loadId)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase.from("freight_matches").insert({
          capacity_listing_id: capacityId,
          load_listing_id: loadId,
          match_score: m.score,
          match_reasons: m.reasons,
          status: "suggested",
        });
        if (!insertErr) matchesFound++;
      }
    }

    return new Response(JSON.stringify({ matchesFound }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[freight-matching] Error:", err);
    return new Response(JSON.stringify({ error: "Matching mislukt" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

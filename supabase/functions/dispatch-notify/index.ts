import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const authClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: ce } = await authClient.auth.getUser(token);
    if (ce || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const driverId = body.driverId || body.driver_id;
    const tripId = body.tripId || body.trip_id || body.orderId || body.order_id;
    const type = body.type || "dispatch";
    const message = body.message;

    console.log(`[dispatch-notify] type=${type}, driver=${driverId}, trip=${tripId}`);

    if (!driverId) {
      return new Response(JSON.stringify({ error: "driverId of driver_id is vereist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve driver's user_id
    let targetUserId = driverId;
    const { data: driver } = await supabaseAdmin
      .from("drivers")
      .select("user_id, name")
      .eq("id", driverId)
      .single();

    if (driver?.user_id) {
      targetUserId = driver.user_id;
    }

    const title = type === "unassign" ? "Rit verwijderd" : "Nieuwe rit toegewezen";
    const notifBody = message || (type === "unassign"
      ? "Een rit is van je planning verwijderd."
      : "Er is een nieuwe rit aan je toegewezen.");

    // Create in-app notification directly (no sub-function call needed)
    const { error: insertErr } = await supabaseAdmin.from("notifications").insert({
      user_id: targetUserId,
      title,
      message: notifBody,
      type: "dispatch",
      channel: "in_app",
      status: "pending",
      entity_type: "trip",
      entity_id: tripId || null,
      metadata: { tripId, orderId: tripId, notifyType: type },
    });

    if (insertErr) {
      console.error("[dispatch-notify] Notification insert error:", insertErr);
      // Don't fail — notification is non-critical
    }

    console.log(`[dispatch-notify] Notification sent to ${targetUserId} (driver: ${driverId})`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[dispatch-notify] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

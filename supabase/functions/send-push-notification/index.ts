import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user: callerUser }, error: ce } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ce || !callerUser) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    // Accept both userId and driver_id
    let targetUserId = body.userId;
    const driverId = body.driver_id;
    const title = body.title || "Notificatie";
    const notifBody = body.body || body.message || "";
    const data = body.data || {};

    // If driver_id is provided instead of userId, resolve to the driver's user_id
    if (!targetUserId && driverId) {
      const { data: driver } = await supabaseAdmin
        .from("drivers")
        .select("user_id")
        .eq("id", driverId)
        .single();
      
      if (driver?.user_id) {
        targetUserId = driver.user_id;
      } else {
        console.warn(`[send-push-notification] Driver ${driverId} has no linked user_id, storing notification with driver_id as fallback`);
        targetUserId = driverId; // fallback for legacy data
      }
    }

    console.log(`[send-push-notification] To user ${targetUserId}: ${title}`);

    if (!targetUserId) return new Response(JSON.stringify({ error: "userId of driver_id verplicht" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create in-app notification
    const { error: insertErr } = await supabaseAdmin.from("notifications").insert({
      user_id: targetUserId,
      title: title,
      message: notifBody,
      type: data.type || "push",
      channel: "in_app",
      status: "pending",
      metadata: data,
    });

    if (insertErr) {
      console.error("[send-push-notification] Insert error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message: "Notificatie verzonden" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[send-push-notification] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
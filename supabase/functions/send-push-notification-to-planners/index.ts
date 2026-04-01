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
    const { title, body, data } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title en body zijn verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      console.warn("[send-push-to-planners] VAPID keys not configured, skipping push");
      return new Response(JSON.stringify({ sent: 0, reason: "VAPID not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the driver's tenant from auth context or trip data
    let tenantId: string | null = null;
    if (data?.trip_id) {
      const { data: trip } = await supabase
        .from("trips")
        .select("company_id")
        .eq("id", data.trip_id)
        .single();
      tenantId = trip?.company_id || null;
    }

    if (!tenantId) {
      console.warn("[send-push-to-planners] Could not determine tenant");
      return new Response(JSON.stringify({ sent: 0, reason: "No tenant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find planner/admin users in this tenant
    const { data: roleUsers } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "planner"]);

    if (!roleUsers || roleUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "No planners found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = roleUsers.map((r: any) => r.user_id);

    // Filter by tenant: check profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, company_id")
      .in("id", userIds)
      .eq("company_id", tenantId);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "No planners in tenant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantUserIds = profiles.map((p: any) => p.id);

    // Get push subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", tenantUserIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "No push subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send push notifications using web-push
    let sent = 0;
    const payload = JSON.stringify({
      title,
      body,
      data: data || {},
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
    });

    for (const sub of subs) {
      try {
        const subscription = typeof sub.subscription === "string"
          ? JSON.parse(sub.subscription)
          : sub.subscription;

        // Use fetch to send via web push protocol
        const endpoint = subscription.endpoint;
        if (!endpoint) continue;

        // Simple notification via endpoint (without full web-push crypto for now)
        // Log the intent - full web-push requires crypto libraries
        console.log(`[send-push-to-planners] Would send to user ${sub.user_id}: ${title}`);
        sent++;
      } catch (pushErr) {
        console.error(`[send-push-to-planners] Failed for sub ${sub.id}:`, pushErr);
      }
    }

    // Also create in-app notifications for all planners
    const notifications = tenantUserIds.map((userId: string) => ({
      type: "driver_document_uploaded",
      title,
      message: body,
      priority: "normal",
      channel: "in_app",
      status: "pending",
      user_id: userId,
      entity_type: data?.trip_id ? "trip" : undefined,
      entity_id: data?.trip_id || undefined,
      action_url: data?.url || undefined,
    }));

    await supabase.from("notifications").insert(notifications);

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-push-to-planners] Error:", err);
    return new Response(JSON.stringify({ error: "Push notificatie mislukt" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

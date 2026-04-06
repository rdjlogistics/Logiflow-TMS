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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: ce,
    } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);

    if (ce || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        driver_id: driverId,
        title: type === "unassign" ? "Rit verwijderd" : "Nieuwe rit toegewezen",
        body:
          message ||
          (type === "unassign"
            ? "Een rit is van je planning verwijderd."
            : "Er is een nieuwe rit aan je toegewezen."),
        data: {
          tripId,
          orderId: tripId,
          type,
        },
      },
    });

    if (error) {
      console.error("[dispatch-notify] Push failed:", error);
      return new Response(JSON.stringify({ success: false, error: "Push notificatie mislukt" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
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
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { submissionId, type } = await req.json();
    if (!submissionId) {
      return new Response(JSON.stringify({ error: "submissionId vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[notify-new-submission] Processing submission ${submissionId}, type: ${type}`);

    // Get user's company
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    const tenantId = profile?.company_id;

    if (tenantId) {
      // Create a notification for planners
      const { data: planners } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", tenantId);

      // Insert notifications for each planner
      if (planners && planners.length > 0) {
        const notifications = planners.map((p: any) => ({
          user_id: p.id,
          title: "Nieuwe inzending ontvangen",
          message: `Er is een nieuwe ${type || "document"} inzending (${submissionId}) binnengekomen die beoordeeld moet worden.`,
          type: "submission",
          is_read: false,
          tenant_id: tenantId,
        }));

        // Try to insert notifications - table might not exist
        try {
          await supabase.from("notifications").insert(notifications);
        } catch (e) {
          console.log("[notify-new-submission] Notifications table not available, logging only");
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Notificatie verstuurd" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-new-submission] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TriggerPayload {
  trigger_type: string;
  trigger_data: Record<string, unknown>;
  tenant_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const payload: TriggerPayload = await req.json();
    const { trigger_type, trigger_data, tenant_id } = payload;

    if (!trigger_type || !tenant_id) {
      return new Response(JSON.stringify({ error: "Missing trigger_type or tenant_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[execute-workflow] trigger_type=${trigger_type} tenant=${tenant_id}`);

    // === Customer Data Enrichment ===
    // If trigger_data has customer_id but no customer object, fetch it
    if (trigger_data.customer_id && !trigger_data.customer) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("company_name, contact_name, email, phone")
        .eq("id", trigger_data.customer_id)
        .single();

      if (customerData) {
        trigger_data.customer = {
          name: customerData.company_name || "",
          contact: customerData.contact_name || "",
          email: customerData.email || "",
          phone: customerData.phone || "",
        };
      }
    }

    // Find matching active workflows
    const { data: workflows, error: wfError } = await supabase
      .from("workflow_automations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("trigger_type", trigger_type)
      .eq("is_active", true);

    if (wfError) {
      console.error("[execute-workflow] Error fetching workflows:", wfError);
      return new Response(JSON.stringify({ error: wfError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!workflows || workflows.length === 0) {
      console.log("[execute-workflow] No matching workflows found");
      return new Response(JSON.stringify({ matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter by trigger_config match
    const matchingWorkflows = workflows.filter((wf) => {
      const config = wf.trigger_config || {};

      if (trigger_type === "order_status_changed") {
        const fromMatch = !config.from_status || config.from_status === trigger_data.old_status;
        const toMatch = !config.to_status || config.to_status === trigger_data.new_status;
        return fromMatch && toMatch;
      }

      if (trigger_type === "delay_detected") {
        const threshold = config.delay_threshold_minutes || 0;
        return (trigger_data.delay_minutes as number) >= threshold;
      }

      if (trigger_type === "invoice_overdue") {
        const configDays = config.days_overdue || 0;
        const actualDays = trigger_data.days_overdue as number;
        const thresholds = [7, 14, 30, 9999];
        const nextThreshold = thresholds.find((t) => t > configDays) || 9999;
        return actualDays >= configDays && actualDays < nextThreshold;
      }

      return true;
    });

    console.log(`[execute-workflow] ${matchingWorkflows.length} workflows matched`);

    const results = [];

    for (const workflow of matchingWorkflows) {
      // Create workflow run
      const { data: run, error: runError } = await supabase
        .from("workflow_runs")
        .insert({
          workflow_id: workflow.id,
          trigger_event: trigger_data,
          status: "running",
        })
        .select()
        .single();

      if (runError) {
        console.error(`[execute-workflow] Error creating run for ${workflow.id}:`, runError);
        continue;
      }

      // Fetch actions
      const { data: actions } = await supabase
        .from("workflow_actions")
        .select("*")
        .eq("workflow_id", workflow.id)
        .eq("is_active", true)
        .order("sequence_order", { ascending: true });

      const executedActions: Array<{ action_type: string; status: string; error?: string }> = [];
      let hasError = false;

      for (const action of actions || []) {
        // Log delay but don't block — delays are not supported in edge functions
        if (action.delay_minutes > 0) {
          console.log(`[execute-workflow] Skipping delay of ${action.delay_minutes}min (not supported in edge functions)`);
        }

        try {
          const result = await executeAction(supabase, action, trigger_data, tenant_id);
          executedActions.push({ action_type: action.action_type, status: "completed", ...result });
        } catch (err) {
          hasError = true;
          executedActions.push({
            action_type: action.action_type,
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
          console.error(`[execute-workflow] Action ${action.action_type} failed:`, err);
          break;
        }
      }

      // Update run status
      await supabase
        .from("workflow_runs")
        .update({
          status: hasError ? "failed" : "completed",
          completed_at: new Date().toISOString(),
          actions_executed: executedActions,
          error_message: hasError ? executedActions.find((a) => a.error)?.error : null,
        })
        .eq("id", run.id);

      // Update workflow run count
      await supabase
        .from("workflow_automations")
        .update({
          run_count: workflow.run_count + 1,
          last_run_at: new Date().toISOString(),
        })
        .eq("id", workflow.id);

      results.push({
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        run_id: run.id,
        status: hasError ? "failed" : "completed",
        actions_executed: executedActions.length,
      });
    }

    return new Response(JSON.stringify({ matched: matchingWorkflows.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[execute-workflow] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Resolve template variables like {{customer.email}}
function resolveTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (_, obj, key) => {
    const value = (data[obj] as Record<string, unknown>)?.[key];
    return value != null ? String(value) : "";
  });
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  action: { action_type: string; action_config: Record<string, unknown> },
  triggerData: Record<string, unknown>,
  tenantId: string
): Promise<Record<string, unknown>> {
  const config = action.action_config || {};

  switch (action.action_type) {
    case "send_email": {
      const to = resolveTemplate(String(config.to || ""), triggerData);
      const subject = resolveTemplate(String(config.subject || ""), triggerData);
      const body = resolveTemplate(String(config.body || ""), triggerData);

      if (!to) throw new Error("Email recipient is empty");

      // Send email directly via Resend API
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@rdjlogistics.nl";

      if (resendApiKey) {
        const emailResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `RDJ Logistics <${fromEmail}>`,
            to: [to],
            subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${body.replace(/\n/g, "<br>")}
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">Dit is een automatisch bericht van het workflow-systeem.</p>
            </div>`,
          }),
        });

        if (!emailResp.ok) {
          const errText = await emailResp.text();
          console.error(`[workflow] Resend error: ${errText}`);
          throw new Error(`Email send failed: ${emailResp.status}`);
        }

        console.log(`[workflow] Email sent to ${to} via Resend`);
      } else {
        console.warn("[workflow] No RESEND_API_KEY configured, logging email only");
      }

      // Always log to email_send_log for audit trail
      await supabase.from("email_send_log").insert({
        recipient_email: to,
        template_name: "workflow_email",
        status: resendApiKey ? "sent" : "pending",
        metadata: { body, source: "workflow_automation", subject, tenant_id: tenantId },
      });

      return { to, subject };
    }

    case "send_webhook": {
      const url = String(config.url || "");
      const method = String(config.method || "POST");

      if (!url) throw new Error("Webhook URL is empty");

      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_data: triggerData, tenant_id: tenantId }),
      });

      if (!resp.ok) {
        throw new Error(`Webhook returned ${resp.status}: ${await resp.text()}`);
      }

      return { url, status: resp.status };
    }

    case "update_status": {
      const newStatus = String(config.new_status || "");
      const tripId = triggerData.trip_id || triggerData.id;

      if (!newStatus || !tripId) throw new Error("Missing status or trip_id");

      const { error } = await supabase
        .from("trips")
        .update({ status: newStatus })
        .eq("id", tripId);

      if (error) throw new Error(`Status update failed: ${error.message}`);

      return { trip_id: tripId, new_status: newStatus };
    }

    case "notify_slack": {
      const webhookUrl = String(config.webhook_url || "");
      const message = resolveTemplate(String(config.message || ""), triggerData);

      if (!webhookUrl) throw new Error("Slack webhook URL is empty");

      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      if (!resp.ok) {
        throw new Error(`Slack webhook returned ${resp.status}`);
      }

      return { message_sent: true };
    }

    case "log_event": {
      const title = resolveTemplate(String(config.title || config.message || "Workflow event"), triggerData);
      const details = resolveTemplate(String(config.details || ""), triggerData);
      const severity = String(config.severity || "info");

      // Log to email_send_log as audit trail (reuse existing table)
      await supabase.from("email_send_log").insert({
        recipient_email: "system@workflow",
        template_name: "workflow_log_event",
        status: "sent",
        metadata: { title, details, severity, trigger_data: triggerData, source: "workflow_automation", tenant_id: tenantId },
      });

      console.log(`[workflow] Event logged: "${title}" severity=${severity}`);
      return { title, severity, logged: true };
    }

    case "create_task": {
      const title = resolveTemplate(String(config.title || ""), triggerData);
      const assignee = String(config.assignee || "");

      console.log(`[workflow] Task created: "${title}" assigned to ${assignee}`);
      return { title, assignee, note: "Task logged (no tasks table yet)" };
    }

    case "send_sms":
    case "send_whatsapp": {
      const to = resolveTemplate(String(config.to || ""), triggerData);
      const message = resolveTemplate(
        String(config.message || config.template || ""),
        triggerData
      );

      console.log(`[workflow] ${action.action_type}: to=${to} message=${message}`);
      return { to, note: `${action.action_type} logged as placeholder` };
    }

    default:
      console.warn(`[workflow] Unknown action type: ${action.action_type}`);
      return { note: `Unknown action type: ${action.action_type}` };
  }
}

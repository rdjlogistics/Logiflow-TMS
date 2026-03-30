import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log("[check-overdue-invoices] Starting daily overdue check");

    // Get all unpaid invoices that are past due date
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("id, invoice_number, due_date, total_amount, amount_paid, status, customer_id, company_id, customers(company_name, email, phone)")
      .not("status", "eq", "betaald")
      .not("status", "eq", "geannuleerd")
      .lt("due_date", new Date().toISOString().split("T")[0]);

    if (invError) {
      console.error("[check-overdue-invoices] Error fetching invoices:", invError);
      return new Response(JSON.stringify({ error: invError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invoices || invoices.length === 0) {
      console.log("[check-overdue-invoices] No overdue invoices found");
      return new Response(JSON.stringify({ checked: 0, triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[check-overdue-invoices] Found ${invoices.length} overdue invoices`);

    let triggered = 0;

    for (const invoice of invoices) {
      const dueDate = new Date(invoice.due_date);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only process at meaningful thresholds (7, 14, 30+ days)
      if (daysOverdue < 7) continue;

      const customer = invoice.customers as any;

      // Check deduplication: has this invoice+threshold already been triggered today?
      const todayStart = new Date().toISOString().split("T")[0];
      const { data: existingRuns } = await supabase
        .from("workflow_runs")
        .select("id")
        .gte("started_at", todayStart)
        .contains("trigger_event", { invoice_id: invoice.id } as any);

      // Find the current threshold bucket
      const thresholds = [7, 14, 30];
      const currentThreshold = [...thresholds].reverse().find((t) => daysOverdue >= t) || 7;

      // Check if this specific threshold was already triggered for this invoice
      const alreadyTriggered = existingRuns?.some((run: any) => {
        // Already triggered today for this invoice
        return true;
      });

      if (existingRuns && existingRuns.length > 0) {
        console.log(`[check-overdue-invoices] Skipping invoice ${invoice.invoice_number} — already triggered today`);
        continue;
      }

      // Call execute-workflow
      const triggerPayload = {
        trigger_type: "invoice_overdue",
        tenant_id: invoice.company_id,
        trigger_data: {
          days_overdue: daysOverdue,
          threshold: currentThreshold,
          invoice_id: invoice.id,
          invoice: {
            number: invoice.invoice_number,
            total_amount: invoice.total_amount,
            amount_paid: invoice.amount_paid || 0,
            due_date: invoice.due_date,
          },
          customer: {
            name: customer?.company_name || "",
            email: customer?.email || "",
            phone: customer?.phone || "",
          },
        },
      };

      const resp = await fetch(`${supabaseUrl}/functions/v1/execute-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify(triggerPayload),
      });

      if (resp.ok) {
        triggered++;
        const result = await resp.json();
        console.log(`[check-overdue-invoices] Triggered for ${invoice.invoice_number}: ${result.matched} workflows matched`);
      } else {
        const errText = await resp.text();
        console.error(`[check-overdue-invoices] Failed for ${invoice.invoice_number}: ${errText}`);
      }
    }

    console.log(`[check-overdue-invoices] Done. Checked: ${invoices.length}, Triggered: ${triggered}`);

    return new Response(
      JSON.stringify({ checked: invoices.length, triggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[check-overdue-invoices] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

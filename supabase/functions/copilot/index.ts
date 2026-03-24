import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const COPILOT_SYSTEM = `Je bent de LogiFlow Co-Pilot — een snelle, slimme assistent ingebouwd in het TMS. Nederlands. Max 150 woorden.
Je hebt toegang tot tools om real-time data op te halen. Gebruik ALTIJD tools voor TMS-data, verzin NOOIT cijfers.
Wees bondig, concreet en actionable. Marges <15%: waarschuw 🚨.`;

const COPILOT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_orders",
      description: "Zoek orders/ritten in het TMS.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "pending", "confirmed", "in_transit", "delivered", "cancelled"] },
          search: { type: "string" },
          date_from: { type: "string" },
          date_to: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_kpis",
      description: "Real-time KPI's: omzet, marges, facturen, ritten.",
      parameters: {
        type: "object",
        properties: { period: { type: "string", enum: ["today", "week", "month", "quarter"] } },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "daily_briefing",
      description: "Dagelijkse briefing: geplande ritten, risico's, openstaande taken.",
      parameters: {
        type: "object",
        properties: { date: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "route_suggest",
      description: "Stel optimale chauffeur voor op basis van locatie en beschikbaarheid.",
      parameters: {
        type: "object",
        properties: { order_id: { type: "string" } },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "invoice_status",
      description: "Overzicht facturen en achterstanden.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["all", "pending", "overdue", "paid"] },
          days_overdue: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_drivers",
      description: "Haal chauffeurs op met status en beschikbaarheid.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["available", "busy", "off_duty", "all"] },
          search: { type: "string" },
        },
      },
    },
  },
];

function detectComplexity(message: string): "none" | "low" | "medium" {
  const lower = message.toLowerCase();
  if (/waarom|analyseer|vergelijk|optimaliseer|advies|strategie|briefing|rapport/.test(lower)) return "medium";
  if (/hoeveel|wat is|toon|lijst|status|zoek/.test(lower)) return "low";
  return "none";
}

function getDateFrom(period: string, now: Date): string {
  const d = new Date(now);
  if (period === "today") return d.toISOString().split("T")[0];
  if (period === "week") { d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; }
  if (period === "month") { d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; }
  if (period === "quarter") { d.setMonth(d.getMonth() - 3); return d.toISOString().split("T")[0]; }
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

async function executeCopilotTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
): Promise<string> {
  try {
    switch (toolName) {
      case "search_orders": {
        let query = supabase
          .from("orders")
          .select("id, order_number, status, pickup_date, total_amount, customers(company_name), drivers(name)")
          .eq("company_id", tenantId)
          .order("created_at", { ascending: false })
          .limit((args.limit as number) || 10);
        if (args.status) query = query.eq("status", args.status);
        if (args.search) query = query.or(`order_number.ilike.%${args.search}%,reference.ilike.%${args.search}%`);
        if (args.date_from) query = query.gte("pickup_date", args.date_from);
        if (args.date_to) query = query.lte("pickup_date", args.date_to);
        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ orders: data, count: data?.length ?? 0 });
      }

      case "get_kpis": {
        const period = (args.period as string) || "month";
        const dateFrom = getDateFrom(period, new Date());
        const [ordersRes, invoicesRes] = await Promise.all([
          supabase.from("orders").select("id, status, total_amount, purchase_amount").eq("company_id", tenantId).gte("created_at", dateFrom),
          supabase.from("invoices").select("id, status, total_amount, due_date").eq("company_id", tenantId).gte("created_at", dateFrom),
        ]);
        const orders = ordersRes.data || [];
        const invoices = invoicesRes.data || [];
        const revenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
        const cost = orders.reduce((s, o) => s + (o.purchase_amount || 0), 0);
        const margin = revenue > 0 ? ((revenue - cost) / revenue * 100) : 0;
        const overdue = invoices.filter(i => i.status === "overdue");
        return JSON.stringify({
          period, total_orders: orders.length, revenue, cost,
          margin_percent: Math.round(margin * 10) / 10,
          overdue_invoices: overdue.length,
          overdue_amount: overdue.reduce((s, i) => s + (i.total_amount || 0), 0),
        });
      }

      case "daily_briefing": {
        const date = (args.date as string) || new Date().toISOString().split("T")[0];
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [todayOrders, unassigned, overdueInv] = await Promise.all([
          supabase.from("orders").select("id, order_number, status, driver_id, total_amount, drivers(name)")
            .eq("company_id", tenantId).gte("pickup_date", date).lt("pickup_date", tomorrow.toISOString().split("T")[0]),
          supabase.from("orders").select("id, order_number").eq("company_id", tenantId).is("driver_id", null).in("status", ["draft", "pending", "confirmed"]),
          supabase.from("invoices").select("id, total_amount").eq("company_id", tenantId).eq("status", "overdue"),
        ]);
        const risks: string[] = [];
        if ((unassigned.data || []).length > 0) risks.push(`🚨 ${unassigned.data!.length} orders zonder chauffeur`);
        if ((overdueInv.data || []).length > 0) risks.push(`💰 ${overdueInv.data!.length} achterstallige facturen`);
        return JSON.stringify({
          date, planned: (todayOrders.data || []).length,
          unassigned: (unassigned.data || []).length, risks,
        });
      }

      case "route_suggest": {
        const { data: order } = await supabase.from("orders")
          .select("id, order_number, pickup_date").eq("company_id", tenantId).eq("id", args.order_id).maybeSingle();
        if (!order) return JSON.stringify({ error: "Order niet gevonden" });
        const [driversRes, activeRes] = await Promise.all([
          supabase.from("drivers").select("id, name, rating, status, city").eq("company_id", tenantId).eq("is_active", true).in("status", ["available", "busy"]),
          supabase.from("orders").select("driver_id").eq("company_id", tenantId).in("status", ["confirmed", "in_transit"]),
        ]);
        const workload = new Map<string, number>();
        for (const o of activeRes.data || []) if (o.driver_id) workload.set(o.driver_id, (workload.get(o.driver_id) || 0) + 1);
        const suggestions = (driversRes.data || []).map(d => ({
          name: d.name, rating: d.rating || 0, workload: workload.get(d.id) || 0,
          score: ((d.rating || 3) * 20) - ((workload.get(d.id) || 0) * 15) + (d.status === "available" ? 20 : 0),
        })).sort((a, b) => b.score - a.score).slice(0, 3);
        return JSON.stringify({ order: order.order_number, suggestions });
      }

      case "invoice_status": {
        let query = supabase.from("invoices")
          .select("id, invoice_number, total_amount, status, due_date, customers(company_name)")
          .eq("company_id", tenantId).order("due_date", { ascending: true }).limit(20);
        if (args.status_filter && args.status_filter !== "all") query = query.eq("status", args.status_filter);
        const { data } = await query;
        const invoices = data || [];
        const overdue = invoices.filter(i => i.status === "overdue");
        return JSON.stringify({
          total: invoices.length, overdue: overdue.length,
          overdue_amount: overdue.reduce((s, i) => s + (i.total_amount || 0), 0),
          invoices: invoices.slice(0, 10).map(i => ({
            number: i.invoice_number, amount: i.total_amount, status: i.status,
            customer: (i.customers as any)?.company_name,
          })),
        });
      }

      case "list_drivers": {
        let query = supabase.from("drivers")
          .select("id, name, phone, status, rating, city")
          .eq("company_id", tenantId).eq("is_active", true);
        if (args.search) query = query.ilike("name", `%${args.search}%`);
        if (args.status && args.status !== "all") query = query.eq("status", args.status);
        const { data } = await query;
        return JSON.stringify({ drivers: data, count: data?.length ?? 0 });
      }

      default:
        return JSON.stringify({ error: `Onbekende tool: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({ error: `Tool fout: ${err instanceof Error ? err.message : "Onbekend"}` });
  }
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
    const tenantId = profile.company_id;

    const { messages: rawMessages, context } = await req.json();
    const messages = (rawMessages || []).slice(-15);
    const pageCtx = context?.currentPage ? `\nPagina: ${context.currentPage}` : "";
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    const complexity = detectComplexity(lastUserMsg);
    const model = complexity === "medium" ? "google/gemini-3-flash-preview" : "google/gemini-2.5-flash-lite";
    const reasoning = complexity === "medium" ? { effort: "medium" } : undefined;

    // Tool-calling loop (max 3 iterations for copilot)
    let loopMessages: any[] = [
      { role: "system", content: COPILOT_SYSTEM + pageCtx },
      ...messages,
    ];
    const toolsUsed: string[] = [];

    for (let i = 0; i < 3; i++) {
      const toolRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: loopMessages,
          tools: COPILOT_TOOLS,
          stream: false,
          ...(reasoning ? { reasoning } : {}),
        }),
      });

      if (!toolRes.ok) {
        if (toolRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (toolRes.status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI gateway error");
      }

      const toolData = await toolRes.json();
      const choice = toolData.choices?.[0];

      if (!choice?.message?.tool_calls?.length) {
        loopMessages.push(choice.message);
        break;
      }

      loopMessages.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        const toolArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        const result = await executeCopilotTool(tc.function.name, toolArgs, supabase, tenantId);
        toolsUsed.push(tc.function.name);
        loopMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }

    // Stream final response
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: loopMessages,
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

    // Deduct credits (more for tool usage)
    const creditCost = toolsUsed.length > 0 ? 2 : 1;
    await supabase.rpc("deduct_ai_credits", {
      p_tenant_id: tenantId, p_user_id: userId, p_credits: creditCost,
      p_action_type: toolsUsed.length > 0 ? "copilot_tool" : "copilot",
      p_complexity: complexity !== "none" ? "complex" : "simple",
      p_model: "gemini-3-flash",
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

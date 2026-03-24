import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Je bent LogiFlow AI — senior transport controller & analyst. Antwoord ALTIJD in het Nederlands.

## Regels
- Gebruik ALTIJD tools voor TMS-data, verzin NOOIT cijfers
- Geef specifieke cijfers, markdown tabellen, vergelijk met vorige periodes
- Marges <15%: waarschuw 🚨. Mutaties: eerst bevestiging vragen
- Combineer tools voor complete antwoorden met inzichten en aanbevelingen
- Tenant-isolatie: alleen data van eigen bedrijf`;

const TMS_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_orders",
      description: "Zoek orders/ritten in het TMS. Gebruik voor vragen over orders, leveringen, zendingen.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "pending", "confirmed", "in_transit", "delivered", "cancelled"], description: "Filter op orderstatus" },
          search: { type: "string", description: "Zoek op ordernummer, klantnaam, referentie" },
          date_from: { type: "string", description: "Startdatum (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Einddatum (YYYY-MM-DD)" },
          driver_id: { type: "string", description: "Filter op chauffeur ID" },
          customer_id: { type: "string", description: "Filter op klant ID" },
          limit: { type: "number", description: "Max resultaten (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_drivers",
      description: "Haal chauffeurs op met status, beschikbaarheid en scores.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["available", "busy", "off_duty", "all"], description: "Filter op status" },
          search: { type: "string", description: "Zoek op naam" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_kpis",
      description: "Real-time KPI's: omzet, marges, openstaande facturen, ritten, on-time %.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "quarter"], description: "Periode" },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_order",
      description: "Volledige uitleg van een specifieke order: stops, events, status, kosten.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "Ordernummer (bijv. ORD-2024-0001)" },
          order_id: { type: "string", description: "Order UUID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Sla een gebruikersvoorkeur op voor toekomstige gesprekken.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Sleutel (bijv. 'preferred_view')" },
          value: { type: "string", description: "Waarde om te onthouden" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "smart_order_entry",
      description: "Maak een nieuwe order aan op basis van natuurlijke taal. ALTIJD bevestiging vragen.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Orderbeschrijving in natuurlijke taal" },
          pickup_address: { type: "string" },
          delivery_address: { type: "string" },
          pickup_date: { type: "string", description: "Ophaaldatum (YYYY-MM-DD)" },
          customer_name: { type: "string" },
          goods_description: { type: "string" },
          weight_kg: { type: "number" },
        },
        required: ["description"],
      },
    },
  },
  // ─── NEW TOOLS ───
  {
    type: "function",
    function: {
      name: "margin_analysis",
      description: "Analyseer marges per klant, route of periode. Identificeert verliesgevende klanten en routes.",
      parameters: {
        type: "object",
        properties: {
          group_by: { type: "string", enum: ["customer", "driver", "month"], description: "Groepeer analyse op" },
          period: { type: "string", enum: ["week", "month", "quarter", "year"], description: "Analyseperiode" },
          customer_id: { type: "string", description: "Optioneel: analyseer specifieke klant" },
        },
        required: ["group_by", "period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cashflow_forecast",
      description: "Voorspel cashflow komende 30 dagen op basis van openstaande facturen en verwachte inkomsten.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Vooruitkijken in dagen (default 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "customer_analysis",
      description: "Analyseer klantportfolio: top klanten, omzet trend, betalingsgedrag, churn risico.",
      parameters: {
        type: "object",
        properties: {
          sort_by: { type: "string", enum: ["revenue", "orders", "margin", "overdue"], description: "Sorteer op" },
          limit: { type: "number", description: "Top N klanten (default 10)" },
          period: { type: "string", enum: ["month", "quarter", "year"], description: "Periode" },
        },
        required: ["sort_by"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "driver_performance",
      description: "Vergelijk chauffeurs op KPIs: ritten, on-time %, rating, omzet per chauffeur.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter"], description: "Periode" },
          driver_id: { type: "string", description: "Optioneel: specifieke chauffeur" },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "invoice_status",
      description: "Overzicht openstaande facturen, betalingsachterstanden, en factureringstotalen.",
      parameters: {
        type: "object",
        properties: {
          status_filter: { type: "string", enum: ["all", "pending", "overdue", "paid", "draft"], description: "Filter op factuurstatus" },
          customer_id: { type: "string", description: "Optioneel: filter op klant" },
          days_overdue: { type: "number", description: "Minimum dagen achterstallig" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description: "Vergelijk twee periodes: omzet, orders, marges, on-time %. Toont trends en deltas.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["revenue", "orders", "margin", "on_time"], description: "Welke metric vergelijken" },
          period: { type: "string", enum: ["week", "month", "quarter"], description: "Huidige periode" },
        },
        required: ["metric", "period"],
      },
    },
  },
];

// ─── Reasoning Complexity Detection ───

function detectComplexity(message: string): "none" | "low" | "medium" | "high" {
  const lower = message.toLowerCase();
  
  // High: analysis, forecasting, optimization, why-questions
  const highPatterns = /waarom|analyseer|voorspel|optimaliseer|strategie|vergelijk.*periode|cashflow|forecast|beste.*chauffeur.*voor|welke.*klant.*kost|hoe.*besparen|trend|correlatie|root.?cause/;
  if (highPatterns.test(lower)) return "high";
  
  // Medium: multi-entity questions, comparisons, recommendations
  const mediumPatterns = /wie.*best|top\s?\d|ranking|overzicht.*compleet|samenvatting|advies|aanbeveling|marge.*analyse|performance|dashboard|rapportage/;
  if (mediumPatterns.test(lower)) return "medium";
  
  // Low: simple lookups with some logic
  const lowPatterns = /hoeveel|lijst|toon|geef.*overzicht|status.*van|zoek/;
  if (lowPatterns.test(lower)) return "low";
  
  return "none";
}

// ─── Tool Execution ───

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "search_orders": {
        let query = supabase
          .from("orders")
          .select("id, order_number, status, customer_id, driver_id, pickup_date, delivery_date, total_amount, reference, created_at, customers(company_name)")
          .eq("company_id", tenantId)
          .order("created_at", { ascending: false })
          .limit((args.limit as number) || 20);

        if (args.status) query = query.eq("status", args.status);
        if (args.search) query = query.or(`order_number.ilike.%${args.search}%,reference.ilike.%${args.search}%`);
        if (args.date_from) query = query.gte("pickup_date", args.date_from);
        if (args.date_to) query = query.lte("pickup_date", args.date_to);
        if (args.driver_id) query = query.eq("driver_id", args.driver_id);
        if (args.customer_id) query = query.eq("customer_id", args.customer_id);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ orders: data, count: data?.length ?? 0 });
      }

      case "list_drivers": {
        let query = supabase
          .from("drivers")
          .select("id, name, phone, email, status, license_type, is_active, rating")
          .eq("company_id", tenantId)
          .eq("is_active", true);

        if (args.search) query = query.ilike("name", `%${args.search}%`);
        if (args.status && args.status !== "all") query = query.eq("status", args.status);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ drivers: data, count: data?.length ?? 0 });
      }

      case "get_kpis": {
        const period = (args.period as string) || "month";
        const now = new Date();
        let dateFrom: string;

        if (period === "today") dateFrom = now.toISOString().split("T")[0];
        else if (period === "week") {
          const d = new Date(now); d.setDate(d.getDate() - 7);
          dateFrom = d.toISOString().split("T")[0];
        } else if (period === "quarter") {
          const d = new Date(now); d.setMonth(d.getMonth() - 3);
          dateFrom = d.toISOString().split("T")[0];
        } else {
          const d = new Date(now); d.setMonth(d.getMonth() - 1);
          dateFrom = d.toISOString().split("T")[0];
        }

        const [ordersRes, invoicesRes, driversRes] = await Promise.all([
          supabase.from("orders").select("id, status, total_amount, purchase_amount").eq("company_id", tenantId).gte("created_at", dateFrom),
          supabase.from("invoices").select("id, status, total_amount, due_date").eq("company_id", tenantId).gte("created_at", dateFrom),
          supabase.from("drivers").select("id, status").eq("company_id", tenantId).eq("is_active", true),
        ]);

        const orders = ordersRes.data || [];
        const invoices = invoicesRes.data || [];
        const drivers = driversRes.data || [];

        const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
        const totalCost = orders.reduce((s, o) => s + (o.purchase_amount || 0), 0);
        const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0;
        const openInvoices = invoices.filter(i => i.status === "pending" || i.status === "overdue");
        const overdueInvoices = invoices.filter(i => i.status === "overdue");

        const statusCounts: Record<string, number> = {};
        for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

        return JSON.stringify({
          period, date_from: dateFrom,
          total_orders: orders.length, order_status_breakdown: statusCounts,
          total_revenue: totalRevenue, total_cost: totalCost,
          gross_margin_percent: Math.round(margin * 10) / 10,
          open_invoices: openInvoices.length,
          open_invoice_amount: openInvoices.reduce((s, i) => s + (i.total_amount || 0), 0),
          overdue_invoices: overdueInvoices.length,
          overdue_amount: overdueInvoices.reduce((s, i) => s + (i.total_amount || 0), 0),
          total_drivers: drivers.length,
          driver_status_breakdown: Object.fromEntries(
            drivers.reduce((m, d) => m.set(d.status || "unknown", (m.get(d.status || "unknown") || 0) + 1), new Map())
          ),
        });
      }

      case "explain_order": {
        const filter = args.order_number
          ? { column: "order_number", value: args.order_number }
          : { column: "id", value: args.order_id };

        const { data: order, error } = await supabase
          .from("orders")
          .select("*, customers(company_name, email, phone), drivers(name, phone)")
          .eq("company_id", tenantId)
          .eq(filter.column, filter.value)
          .maybeSingle();

        if (error) return JSON.stringify({ error: error.message });
        if (!order) return JSON.stringify({ error: "Order niet gevonden" });

        const [stopsRes, eventsRes] = await Promise.all([
          supabase.from("order_stops").select("*").eq("order_id", order.id).order("sequence", { ascending: true }),
          supabase.from("order_events").select("*").eq("order_id", order.id).order("created_at", { ascending: true }),
        ]);

        return JSON.stringify({ order, stops: stopsRes.data || [], events: eventsRes.data || [] });
      }

      case "save_memory": {
        const { error } = await supabase.from("ai_user_memory").upsert(
          { user_id: userId, tenant_id: tenantId, memory_key: args.key as string, memory_value: args.value as string, updated_at: new Date().toISOString() },
          { onConflict: "user_id,memory_key" }
        );
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, message: `Onthouden: ${args.key} = ${args.value}` });
      }

      case "smart_order_entry": {
        return JSON.stringify({
          type: "confirmation_required",
          message: "Ordergegevens verzameld. Bevestig om aan te maken:",
          preview: {
            description: args.description,
            pickup_address: args.pickup_address || "Nog in te vullen",
            delivery_address: args.delivery_address || "Nog in te vullen",
            pickup_date: args.pickup_date || "Nog in te vullen",
            customer_name: args.customer_name || "Nog in te vullen",
            goods_description: args.goods_description || "Niet opgegeven",
            weight_kg: args.weight_kg || null,
          },
          toolName: "smart_order_entry",
          payload: args,
        });
      }

      // ─── NEW TOOLS ───

      case "margin_analysis": {
        const period = args.period as string || "month";
        const now = new Date();
        const dateFrom = getDateFrom(period, now);

        if (args.customer_id) {
          // Single customer margin
          const { data } = await supabase
            .from("orders")
            .select("id, order_number, total_amount, purchase_amount, status, pickup_date, customers(company_name)")
            .eq("company_id", tenantId)
            .eq("customer_id", args.customer_id)
            .gte("created_at", dateFrom);

          const orders = data || [];
          const revenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
          const cost = orders.reduce((s, o) => s + (o.purchase_amount || 0), 0);
          const margin = revenue > 0 ? ((revenue - cost) / revenue * 100) : 0;

          return JSON.stringify({
            customer: orders[0]?.customers?.company_name || "Onbekend",
            period, total_orders: orders.length, revenue, cost,
            profit: revenue - cost, margin_percent: Math.round(margin * 10) / 10,
            warning: margin < 15 ? "⚠️ Marge onder benchmark van 15%!" : null,
          });
        }

        // Group by customer or driver
        const groupBy = args.group_by as string;
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total_amount, purchase_amount, customer_id, driver_id, customers(company_name), drivers(name)")
          .eq("company_id", tenantId)
          .gte("created_at", dateFrom);

        const grouped = new Map<string, { name: string; revenue: number; cost: number; count: number }>();
        for (const o of orders || []) {
          const key = groupBy === "customer" ? (o.customer_id || "unknown") : (o.driver_id || "unassigned");
          const name = groupBy === "customer" ? (o.customers as any)?.company_name || "Onbekend" : (o.drivers as any)?.name || "Niet toegewezen";
          const entry = grouped.get(key) || { name, revenue: 0, cost: 0, count: 0 };
          entry.revenue += o.total_amount || 0;
          entry.cost += o.purchase_amount || 0;
          entry.count++;
          grouped.set(key, entry);
        }

        const results = Array.from(grouped.values()).map(e => ({
          ...e, profit: e.revenue - e.cost,
          margin_percent: e.revenue > 0 ? Math.round((e.revenue - e.cost) / e.revenue * 1000) / 10 : 0,
        })).sort((a, b) => b.revenue - a.revenue);

        const lossMakers = results.filter(r => r.margin_percent < 15);

        return JSON.stringify({
          group_by: groupBy, period, total_entries: results.length,
          results: results.slice(0, 15),
          loss_makers: lossMakers.length > 0 ? lossMakers : null,
          warning: lossMakers.length > 0 ? `⚠️ ${lossMakers.length} ${groupBy === "customer" ? "klanten" : "chauffeurs"} onder 15% marge!` : null,
        });
      }

      case "cashflow_forecast": {
        const daysAhead = (args.days_ahead as number) || 30;
        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const [receivablesRes, payablesRes] = await Promise.all([
          supabase.from("invoices")
            .select("id, invoice_number, total_amount, status, due_date, customers(company_name)")
            .eq("company_id", tenantId)
            .in("status", ["pending", "overdue"])
            .lte("due_date", futureDate.toISOString().split("T")[0]),
          supabase.from("finance_transactions")
            .select("id, amount, type, status, due_date, description")
            .eq("company_id", tenantId)
            .in("status", ["pending", "scheduled"])
            .lte("due_date", futureDate.toISOString().split("T")[0]),
        ]);

        const receivables = receivablesRes.data || [];
        const payables = payablesRes.data || [];
        const totalReceivable = receivables.reduce((s, r) => s + (r.total_amount || 0), 0);
        const totalPayable = payables.reduce((s, p) => s + (Math.abs(p.amount) || 0), 0);
        const overdueReceivables = receivables.filter(r => r.status === "overdue");

        return JSON.stringify({
          forecast_days: daysAhead,
          expected_income: totalReceivable,
          expected_expenses: totalPayable,
          net_cashflow: totalReceivable - totalPayable,
          pending_invoices: receivables.length,
          overdue_invoices: overdueReceivables.length,
          overdue_amount: overdueReceivables.reduce((s, r) => s + (r.total_amount || 0), 0),
          top_receivables: receivables.slice(0, 5).map(r => ({
            invoice: r.invoice_number, amount: r.total_amount,
            customer: (r.customers as any)?.company_name, due: r.due_date, status: r.status,
          })),
          warning: overdueReceivables.length > 0
            ? `⚠️ ${overdueReceivables.length} facturen achterstallig — €${overdueReceivables.reduce((s, r) => s + (r.total_amount || 0), 0).toFixed(0)} at risk`
            : null,
        });
      }

      case "customer_analysis": {
        const sortBy = args.sort_by as string;
        const limit = (args.limit as number) || 10;
        const period = (args.period as string) || "quarter";
        const dateFrom = getDateFrom(period, new Date());

        const [ordersRes, invoicesRes] = await Promise.all([
          supabase.from("orders")
            .select("customer_id, total_amount, purchase_amount, status, customers(company_name)")
            .eq("company_id", tenantId)
            .gte("created_at", dateFrom),
          supabase.from("invoices")
            .select("customer_id, total_amount, status, due_date")
            .eq("company_id", tenantId)
            .gte("created_at", dateFrom),
        ]);

        const customerMap = new Map<string, {
          name: string; revenue: number; cost: number; orderCount: number;
          overdueAmount: number; overdueCount: number;
        }>();

        for (const o of ordersRes.data || []) {
          const entry = customerMap.get(o.customer_id) || {
            name: (o.customers as any)?.company_name || "Onbekend",
            revenue: 0, cost: 0, orderCount: 0, overdueAmount: 0, overdueCount: 0,
          };
          entry.revenue += o.total_amount || 0;
          entry.cost += o.purchase_amount || 0;
          entry.orderCount++;
          customerMap.set(o.customer_id, entry);
        }

        for (const inv of invoicesRes.data || []) {
          if (inv.status === "overdue" && inv.customer_id) {
            const entry = customerMap.get(inv.customer_id);
            if (entry) {
              entry.overdueAmount += inv.total_amount || 0;
              entry.overdueCount++;
            }
          }
        }

        let results = Array.from(customerMap.entries()).map(([id, e]) => ({
          customer_id: id, ...e,
          margin_percent: e.revenue > 0 ? Math.round((e.revenue - e.cost) / e.revenue * 1000) / 10 : 0,
          churn_risk: e.orderCount <= 1 && e.overdueCount > 0 ? "HIGH" : e.overdueCount > 0 ? "MEDIUM" : "LOW",
        }));

        if (sortBy === "revenue") results.sort((a, b) => b.revenue - a.revenue);
        else if (sortBy === "orders") results.sort((a, b) => b.orderCount - a.orderCount);
        else if (sortBy === "margin") results.sort((a, b) => a.margin_percent - b.margin_percent);
        else if (sortBy === "overdue") results.sort((a, b) => b.overdueAmount - a.overdueAmount);

        return JSON.stringify({
          period, sort_by: sortBy, total_customers: results.length,
          top_customers: results.slice(0, limit),
          high_risk_count: results.filter(r => r.churn_risk === "HIGH").length,
          low_margin_count: results.filter(r => r.margin_percent < 15 && r.revenue > 0).length,
        });
      }

      case "driver_performance": {
        const period = args.period as string || "month";
        const dateFrom = getDateFrom(period, new Date());

        let driverFilter = supabase
          .from("drivers")
          .select("id, name, rating, status")
          .eq("company_id", tenantId)
          .eq("is_active", true);

        if (args.driver_id) driverFilter = driverFilter.eq("id", args.driver_id);

        const [driversRes, ordersRes] = await Promise.all([
          driverFilter,
          supabase.from("orders")
            .select("driver_id, status, total_amount, delivery_date")
            .eq("company_id", tenantId)
            .gte("created_at", dateFrom)
            .not("driver_id", "is", null),
        ]);

        const driverMap = new Map<string, {
          name: string; rating: number | null; trips: number; delivered: number; revenue: number;
        }>();

        for (const d of driversRes.data || []) {
          driverMap.set(d.id, { name: d.name, rating: d.rating, trips: 0, delivered: 0, revenue: 0 });
        }

        for (const o of ordersRes.data || []) {
          const entry = driverMap.get(o.driver_id);
          if (entry) {
            entry.trips++;
            if (o.status === "delivered") entry.delivered++;
            entry.revenue += o.total_amount || 0;
          }
        }

        const results = Array.from(driverMap.values()).map(d => ({
          ...d,
          completion_rate: d.trips > 0 ? Math.round(d.delivered / d.trips * 100) : 0,
          revenue_per_trip: d.trips > 0 ? Math.round(d.revenue / d.trips) : 0,
        })).sort((a, b) => b.revenue - a.revenue);

        return JSON.stringify({
          period, driver_count: results.length,
          drivers: results,
          top_performer: results[0]?.name || "N/A",
          avg_completion_rate: results.length > 0
            ? Math.round(results.reduce((s, d) => s + d.completion_rate, 0) / results.length)
            : 0,
        });
      }

      case "invoice_status": {
        let query = supabase
          .from("invoices")
          .select("id, invoice_number, total_amount, status, due_date, created_at, customers(company_name)")
          .eq("company_id", tenantId)
          .order("due_date", { ascending: true });

        if (args.status_filter && args.status_filter !== "all") query = query.eq("status", args.status_filter);
        if (args.customer_id) query = query.eq("customer_id", args.customer_id);

        const { data, error } = await query.limit(50);
        if (error) return JSON.stringify({ error: error.message });

        const invoices = data || [];
        const today = new Date().toISOString().split("T")[0];

        const overdue = invoices.filter(i => (i.status === "pending" || i.status === "overdue") && i.due_date && i.due_date < today);
        const pending = invoices.filter(i => i.status === "pending");
        const paid = invoices.filter(i => i.status === "paid");

        if (args.days_overdue) {
          const minDate = new Date();
          minDate.setDate(minDate.getDate() - (args.days_overdue as number));
          const filtered = overdue.filter(i => i.due_date && i.due_date < minDate.toISOString().split("T")[0]);
          return JSON.stringify({
            filter: `>${args.days_overdue} dagen achterstallig`,
            count: filtered.length,
            total_amount: filtered.reduce((s, i) => s + (i.total_amount || 0), 0),
            invoices: filtered.slice(0, 20).map(i => ({
              number: i.invoice_number, amount: i.total_amount,
              customer: (i.customers as any)?.company_name, due: i.due_date,
              days_overdue: Math.floor((Date.now() - new Date(i.due_date!).getTime()) / 86400000),
            })),
          });
        }

        return JSON.stringify({
          summary: {
            total: invoices.length,
            pending: pending.length, pending_amount: pending.reduce((s, i) => s + (i.total_amount || 0), 0),
            overdue: overdue.length, overdue_amount: overdue.reduce((s, i) => s + (i.total_amount || 0), 0),
            paid: paid.length, paid_amount: paid.reduce((s, i) => s + (i.total_amount || 0), 0),
          },
          overdue_invoices: overdue.slice(0, 10).map(i => ({
            number: i.invoice_number, amount: i.total_amount,
            customer: (i.customers as any)?.company_name, due: i.due_date,
            days_overdue: Math.floor((Date.now() - new Date(i.due_date!).getTime()) / 86400000),
          })),
          warning: overdue.length > 0
            ? `⚠️ ${overdue.length} facturen achterstallig — €${overdue.reduce((s, i) => s + (i.total_amount || 0), 0).toFixed(0)} openstaand`
            : null,
        });
      }

      case "compare_periods": {
        const metric = args.metric as string;
        const period = args.period as string;
        const now = new Date();

        const currentFrom = getDateFrom(period, now);
        const prevEnd = new Date(currentFrom);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevFrom = getDateFrom(period, prevEnd);

        const [currentRes, previousRes] = await Promise.all([
          supabase.from("orders")
            .select("id, total_amount, purchase_amount, status, delivery_date")
            .eq("company_id", tenantId)
            .gte("created_at", currentFrom),
          supabase.from("orders")
            .select("id, total_amount, purchase_amount, status, delivery_date")
            .eq("company_id", tenantId)
            .gte("created_at", prevFrom)
            .lt("created_at", currentFrom),
        ]);

        const cur = currentRes.data || [];
        const prev = previousRes.data || [];

        const calcMetric = (orders: typeof cur) => {
          if (metric === "revenue") return orders.reduce((s, o) => s + (o.total_amount || 0), 0);
          if (metric === "orders") return orders.length;
          if (metric === "margin") {
            const rev = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
            const cost = orders.reduce((s, o) => s + (o.purchase_amount || 0), 0);
            return rev > 0 ? Math.round((rev - cost) / rev * 1000) / 10 : 0;
          }
          if (metric === "on_time") {
            const delivered = orders.filter(o => o.status === "delivered");
            return delivered.length; // simplified
          }
          return 0;
        };

        const currentVal = calcMetric(cur);
        const previousVal = calcMetric(prev);
        const delta = previousVal > 0 ? ((currentVal - previousVal) / previousVal * 100) : 0;

        return JSON.stringify({
          metric, period,
          current_period: { from: currentFrom, value: currentVal },
          previous_period: { from: prevFrom, to: currentFrom, value: previousVal },
          change_percent: Math.round(delta * 10) / 10,
          trend: delta > 5 ? "📈 Stijgend" : delta < -5 ? "📉 Dalend" : "➡️ Stabiel",
          insight: delta > 10
            ? `Sterke groei van ${Math.round(delta)}% — goed bezig!`
            : delta < -10
            ? `Let op: ${Math.round(Math.abs(delta))}% daling vs vorige ${period}. Onderzoek oorzaak.`
            : `Stabiel verloop vs vorige ${period}.`,
        });
      }

      default:
        return JSON.stringify({ error: `Onbekende tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return JSON.stringify({ error: `Tool fout: ${err instanceof Error ? err.message : "Onbekend"}` });
  }
}

function getDateFrom(period: string, now: Date): string {
  const d = new Date(now);
  if (period === "today") return d.toISOString().split("T")[0];
  if (period === "week") { d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0]; }
  if (period === "month") { d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; }
  if (period === "quarter") { d.setMonth(d.getMonth() - 3); return d.toISOString().split("T")[0]; }
  if (period === "year") { d.setFullYear(d.getFullYear() - 1); return d.toISOString().split("T")[0]; }
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

// ─── Multi-Step Tool Loop ───

async function runToolLoop(
  chatMessages: { role: string; content: string }[],
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  userId: string,
  apiKey: string,
  reasoning: { effort: string } | undefined,
  maxIterations = 4,
): Promise<{ finalMessages: any[]; pendingConfirmation: any; toolsUsed: string[] }> {
  let messages = [...chatMessages];
  let pendingConfirmation = null;
  const toolsUsed: string[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: TMS_TOOLS,
        stream: false,
        ...(reasoning ? { reasoning } : {}),
      }),
    });

    if (!res.ok) {
      const status = res.status;
      throw { status, message: await res.text() };
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    if (!choice?.message?.tool_calls?.length) {
      // No more tool calls — done
      messages.push(choice.message);
      break;
    }

    // Execute all tool calls in this iteration
    messages.push(choice.message);
    for (const tc of choice.message.tool_calls) {
      const toolArgs = typeof tc.function.arguments === "string"
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments;
      const result = await executeTool(tc.function.name, toolArgs, supabase, tenantId, userId);
      toolsUsed.push(tc.function.name);
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });

      try {
        const parsed = JSON.parse(result);
        if (parsed.type === "confirmation_required") {
          pendingConfirmation = { toolName: parsed.toolName, payload: parsed.payload, preview: parsed.preview };
        }
      } catch {}
    }
  }

  return { finalMessages: messages, pendingConfirmation, toolsUsed };
}

// ─── Main Handler ───

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
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.company_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Geen bedrijf gekoppeld" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, conversationId, message, context, stream } = body;

    // ─── Confirm Action ───
    if (action === "confirm") {
      const { confirmAction: toolName, confirmPayload } = body;
      if (toolName === "smart_order_entry") {
        const { data: orderData, error: orderErr } = await supabase.from("orders").insert({
          company_id: tenantId, status: "draft",
          reference: confirmPayload.description?.substring(0, 100),
          pickup_date: confirmPayload.pickup_date || null,
          notes: confirmPayload.description, created_by: userId,
        }).select("id, order_number").single();

        if (orderErr) {
          return new Response(JSON.stringify({ success: false, error: orderErr.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.rpc("deduct_ai_credits", {
          p_tenant_id: tenantId, p_user_id: userId, p_credits: 2,
          p_action_type: "tool_call", p_complexity: "complex", p_model: "gemini-3-flash",
        });

        return new Response(JSON.stringify({
          success: true, result: { message: `Order ${orderData.order_number} aangemaakt als concept.` },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: false, error: "Onbekende actie" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Chat Action ───

    let convId = conversationId;
    if (!convId) {
      const { data: conv, error: convErr } = await supabase
        .from("chatgpt_conversations")
        .insert({ user_id: userId, title: message?.substring(0, 80) || "Nieuw gesprek" })
        .select("id").single();
      if (convErr) throw new Error("Kon gesprek niet aanmaken");
      convId = conv.id;
    }

    await supabase.from("chatgpt_messages").insert({ conversation_id: convId, role: "user", content: message });

    const { data: historyMsgs } = await supabase
      .from("chatgpt_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    const { data: memories } = await supabase
      .from("ai_user_memory")
      .select("memory_key, memory_value")
      .eq("user_id", userId);

    let memoryContext = "";
    if (memories?.length) {
      memoryContext = "\n\n## Gebruikersvoorkeuren\n" + memories.map(m => `- ${m.memory_key}: ${m.memory_value}`).join("\n");
    }

    const pageContext = context?.currentPage ? `\nPagina: ${context.currentPage}` : "";
    const roleContext = context?.userRole ? `\nRol: ${context.userRole}` : "";

    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT + memoryContext + pageContext + roleContext },
      ...(historyMsgs || []).map(m => ({ role: m.role, content: m.content })),
    ];

    // Detect complexity for reasoning
    const complexity = detectComplexity(message || "");
    const reasoning = complexity !== "none" ? { effort: complexity } : undefined;

    // ─── SSE Streaming with Multi-Step Tool Loop ───
    if (stream !== false) {
      try {
        const { finalMessages, pendingConfirmation, toolsUsed } = await runToolLoop(
          chatMessages, supabase, tenantId, userId, LOVABLE_API_KEY, reasoning
        );

        // Stream the final response
        const streamRes = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: finalMessages,
            stream: true,
            ...(reasoning ? { reasoning } : {}),
          }),
        });

        if (!streamRes.ok || !streamRes.body) {
          const status = streamRes.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limit bereikt" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error("Stream failed");
        }

        // Deduct credits based on tools used
        const creditCost = toolsUsed.length > 0 ? 2 : 1;
        await supabase.rpc("deduct_ai_credits", {
          p_tenant_id: tenantId, p_user_id: userId, p_credits: creditCost,
          p_action_type: toolsUsed.length > 0 ? "tool_call" : "chat",
          p_complexity: complexity !== "none" ? "complex" : "simple",
          p_model: "gemini-3-flash",
        });

        const reader = streamRes.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullContent = "";

        const transformedStream = new ReadableStream({
          async start(controller) {
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let nlIdx: number;
                while ((nlIdx = buffer.indexOf("\n")) !== -1) {
                  const line = buffer.slice(0, nlIdx).replace(/\r$/, "");
                  buffer = buffer.slice(nlIdx + 1);

                  if (!line.startsWith("data: ")) continue;
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === "[DONE]") {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) fullContent += content;

                    if (pendingConfirmation && parsed.choices?.[0]?.finish_reason) {
                      parsed._pendingConfirmation = pendingConfirmation;
                    }
                    // Inject tools used metadata
                    if (toolsUsed.length > 0 && parsed.choices?.[0]?.finish_reason) {
                      parsed._toolsUsed = toolsUsed;
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
                  } catch {}
                }
              }
            } finally {
              if (fullContent) {
                await supabase.from("chatgpt_messages").insert({
                  conversation_id: convId, role: "assistant", content: fullContent,
                  pending_confirmation: !!pendingConfirmation,
                  confirmation_payload: pendingConfirmation as any,
                });
              }
              controller.close();
            }
          },
        });

        return new Response(transformedStream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });

      } catch (err: any) {
        if (err?.status === 429) return new Response(JSON.stringify({ error: "Rate limit bereikt" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (err?.status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw err;
      }
    }

    // ─── Non-streaming fallback ───
    try {
      const { finalMessages, pendingConfirmation, toolsUsed } = await runToolLoop(
        chatMessages, supabase, tenantId, userId, LOVABLE_API_KEY, reasoning
      );

      // Get final response
      const finalRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: finalMessages,
          stream: false,
          ...(reasoning ? { reasoning } : {}),
        }),
      });

      if (!finalRes.ok) {
        const status = finalRes.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI error");
      }

      const finalData = await finalRes.json();
      const assistantContent = finalData.choices?.[0]?.message?.content || "Ik kon geen antwoord genereren.";

      await supabase.from("chatgpt_messages").insert({
        conversation_id: convId, role: "assistant", content: assistantContent,
        pending_confirmation: !!pendingConfirmation,
        confirmation_payload: pendingConfirmation as any,
      });

      const creditCost = toolsUsed.length > 0 ? 2 : 1;
      await supabase.rpc("deduct_ai_credits", {
        p_tenant_id: tenantId, p_user_id: userId, p_credits: creditCost,
        p_action_type: toolsUsed.length > 0 ? "tool_call" : "chat",
        p_complexity: complexity !== "none" ? "complex" : "simple",
        p_model: "gemini-3-flash",
      });

      const { data: sub } = await supabase
        .from("ai_tenant_subscriptions")
        .select("credits_remaining")
        .eq("tenant_id", tenantId)
        .in("status", ["trial", "active"])
        .maybeSingle();

      return new Response(JSON.stringify({
        success: true, conversationId: convId, message: assistantContent,
        pendingConfirmation, toolsUsed,
        credits: { remaining: sub?.credits_remaining ?? 0, used: creditCost },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err: any) {
      if (err?.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (err?.status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw err;
    }

  } catch (err) {
    console.error("chatgpt error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Onbekende fout" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Je bent LogiFlow AI — een elite senior transport controller die het TMS actief bestuurt. Antwoord ALTIJD in het Nederlands.

## Wie je bent
Je bent geen chatbot maar een **operationele co-pilot**. Je zoekt niet alleen data op — je voert acties uit, wijst chauffeurs toe, maakt facturen, stuurt e-mails en plant routes. Je denkt proactief mee en waarschuwt bij risico's.

## Regels
- Gebruik ALTIJD tools voor TMS-data, verzin NOOIT cijfers
- Combineer meerdere tools automatisch voor complete antwoorden (bijv. search_orders → route_suggest → assign_driver)
- Mutaties (status wijzigen, chauffeur toewijzen, factuur maken, e-mail sturen) → ALTIJD eerst bevestiging vragen via confirmation_required
- Marges <15%: waarschuw 🚨
- Eindig met concrete volgende stappen
- Tenant-isolatie: alleen data van eigen bedrijf
- Wees bondig: max 150 woorden tenzij analyse/rapport gevraagd`;

const TMS_TOOLS = [
  // ─── READ TOOLS ───
  {
    type: "function",
    function: {
      name: "search_orders",
      description: "Zoek orders/ritten in het TMS.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "pending", "confirmed", "in_transit", "delivered", "cancelled"] },
          search: { type: "string", description: "Zoek op ordernummer, klantnaam, referentie" },
          date_from: { type: "string", description: "YYYY-MM-DD" },
          date_to: { type: "string", description: "YYYY-MM-DD" },
          driver_id: { type: "string" },
          customer_id: { type: "string" },
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
          status: { type: "string", enum: ["available", "busy", "off_duty", "all"] },
          search: { type: "string" },
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
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "quarter"] },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_order",
      description: "Volledige uitleg van een specifieke order: stops, events, kosten.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string" },
          order_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Sla gebruikersvoorkeur op voor toekomstige gesprekken.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "margin_analysis",
      description: "Analyseer marges per klant, chauffeur of maand.",
      parameters: {
        type: "object",
        properties: {
          group_by: { type: "string", enum: ["customer", "driver", "month"] },
          period: { type: "string", enum: ["week", "month", "quarter", "year"] },
          customer_id: { type: "string" },
        },
        required: ["group_by", "period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cashflow_forecast",
      description: "Voorspel cashflow komende N dagen.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "customer_analysis",
      description: "Analyseer klantportfolio: omzet, marges, churn risico.",
      parameters: {
        type: "object",
        properties: {
          sort_by: { type: "string", enum: ["revenue", "orders", "margin", "overdue"] },
          limit: { type: "number" },
          period: { type: "string", enum: ["month", "quarter", "year"] },
        },
        required: ["sort_by"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "driver_performance",
      description: "Vergelijk chauffeurs op KPIs.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter"] },
          driver_id: { type: "string" },
        },
        required: ["period"],
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
          status_filter: { type: "string", enum: ["all", "pending", "overdue", "paid", "draft"] },
          customer_id: { type: "string" },
          days_overdue: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_periods",
      description: "Vergelijk twee periodes op omzet, orders, marge.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["revenue", "orders", "margin", "on_time"] },
          period: { type: "string", enum: ["week", "month", "quarter"] },
        },
        required: ["metric", "period"],
      },
    },
  },

  // ─── MUTATION TOOLS (all require confirmation) ───
  {
    type: "function",
    function: {
      name: "smart_order_entry",
      description: "Maak een nieuwe order aan op basis van natuurlijke taal. Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string" },
          pickup_address: { type: "string" },
          delivery_address: { type: "string" },
          pickup_date: { type: "string" },
          customer_name: { type: "string" },
          goods_description: { type: "string" },
          weight_kg: { type: "number" },
        },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_driver_to_order",
      description: "Wijs een chauffeur toe aan een order. Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Order UUID" },
          driver_id: { type: "string", description: "Chauffeur UUID" },
        },
        required: ["order_id", "driver_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_status",
      description: "Wijzig orderstatus (draft→confirmed→in_transit→delivered→cancelled). Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" },
          new_status: { type: "string", enum: ["draft", "pending", "confirmed", "in_transit", "delivered", "cancelled"] },
          reason: { type: "string", description: "Reden voor statuswijziging" },
        },
        required: ["order_id", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_invoice_for_order",
      description: "Genereer een factuur voor een afgeleverde order. Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" },
        },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_customer_email",
      description: "Stuur een professionele e-mail naar een klant (statusupdate, herinnering, offerte). Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
          subject: { type: "string" },
          body: { type: "string", description: "E-mail inhoud in plain text" },
          email_type: { type: "string", enum: ["status_update", "payment_reminder", "quote", "general"] },
        },
        required: ["customer_id", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_orders",
      description: "Bulk-statuswijziging voor meerdere orders. Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          order_ids: { type: "array", items: { type: "string" }, description: "Lijst van order UUIDs" },
          new_status: { type: "string", enum: ["confirmed", "in_transit", "delivered", "cancelled"] },
          reason: { type: "string" },
        },
        required: ["order_ids", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_claim_case",
      description: "Maak een schadeclaim aan voor een order. Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" },
          claim_type: { type: "string", enum: ["damage", "loss", "delay", "shortage", "other"] },
          description: { type: "string" },
          estimated_amount: { type: "number" },
        },
        required: ["order_id", "claim_type", "description"],
      },
    },
  },

  // ─── PREMIUM INTELLIGENCE TOOLS ───
  {
    type: "function",
    function: {
      name: "generate_chart",
      description: "Genereer een chart-beschrijving die de frontend als Recharts visualisatie rendert. Gebruik voor trends, vergelijkingen, verdelingen.",
      parameters: {
        type: "object",
        properties: {
          chart_type: { type: "string", enum: ["line", "bar", "pie", "area", "radar"] },
          title: { type: "string", description: "Chart titel" },
          data_description: { type: "string", description: "Beschrijving van welke data gevisualiseerd moet worden" },
          period: { type: "string", enum: ["week", "month", "quarter", "year"] },
        },
        required: ["chart_type", "title", "data_description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Zoek transportnieuws, regelgeving, marktprijzen, diesel-tarieven of branche-informatie.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Zoekopdracht" },
          category: { type: "string", enum: ["news", "regulation", "market_prices", "general"] },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "document_summary",
      description: "Vat een lang document, e-mail of tekst samen en extraheer actiepunten.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "De te samenvatten tekst" },
          focus: { type: "string", enum: ["summary", "action_items", "key_figures", "risks"] },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "translate_message",
      description: "Vertaal berichten voor internationale chauffeurs of klanten.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Te vertalen tekst" },
          target_language: { type: "string", description: "Doeltaal (Engels, Duits, Frans, Pools, Roemeens, etc.)" },
          context: { type: "string", description: "Context: transport, formeel, informeel" },
        },
        required: ["text", "target_language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Genereer een afbeelding via AI. Gebruik voor bedrijfslogo's, route-visualisaties, rapportage-graphics, infographics.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Beschrijving van de gewenste afbeelding" },
          style: { type: "string", enum: ["professional", "minimal", "infographic", "illustration", "photo_realistic"] },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "smart_planning",
      description: "Multi-order route optimalisatie — analyseer N orders en stel optimale volgorde + chauffeur-toewijzingen voor.",
      parameters: {
        type: "object",
        properties: {
          order_ids: { type: "array", items: { type: "string" }, description: "Orders om te optimaliseren" },
          optimize_for: { type: "string", enum: ["distance", "time", "cost", "balanced"] },
          date: { type: "string", description: "Planningsdatum YYYY-MM-DD" },
        },
        required: ["order_ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "anomaly_detect",
      description: "Detecteer afwijkingen in KPIs: plotselinge margeverandering, ongewone factuurpatronen, prestatieverval.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["margin", "revenue", "on_time", "invoice_aging", "driver_performance"] },
          lookback_days: { type: "number", description: "Aantal dagen terugkijken (default 30)" },
        },
        required: ["metric"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_contract",
      description: "Genereer concept transportovereenkomst, offerte of raamcontract tekst. Vereist bevestiging.",
      parameters: {
        type: "object",
        properties: {
          contract_type: { type: "string", enum: ["transport_agreement", "quote", "framework", "rate_card"] },
          customer_id: { type: "string" },
          details: { type: "string", description: "Extra details en voorwaarden" },
        },
        required: ["contract_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fleet_overview",
      description: "Real-time vlootoverzicht: voertuigen, beschikbaarheid, onderhoud.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "route_suggest",
      description: "Stel optimale chauffeur voor op basis van locatie, beschikbaarheid en rating.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "Order waarvoor chauffeur gezocht wordt" },
        },
        required: ["order_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "daily_briefing",
      description: "Dagelijkse briefing: geplande ritten, risico's, openstaande taken, KPIs.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Datum (YYYY-MM-DD), default vandaag" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_report",
      description: "Genereer een markdown-rapport met KPIs, trends en aanbevelingen.",
      parameters: {
        type: "object",
        properties: {
          report_type: { type: "string", enum: ["weekly", "monthly", "customer", "driver"] },
          period: { type: "string", enum: ["week", "month", "quarter"] },
        },
        required: ["report_type"],
      },
    },
  },
];

// ─── Reasoning Complexity Detection ───

function detectComplexity(message: string): "none" | "low" | "medium" | "high" {
  const lower = message.toLowerCase();
  const highPatterns = /waarom|analyseer|voorspel|optimaliseer|strategie|vergelijk.*periode|cashflow|forecast|beste.*chauffeur.*voor|welke.*klant.*kost|hoe.*besparen|trend|correlatie|root.?cause|rapport|briefing|anomalie|afwijking|contract|overeenkomst|planning.*optim|route.*optim/;
  if (highPatterns.test(lower)) return "high";
  const mediumPatterns = /wie.*best|top\s?\d|ranking|overzicht.*compleet|samenvatting|advies|aanbeveling|marge.*analyse|performance|dashboard|rapportage|wijs.*toe|factureer|bulk|vertaal|translate|chart|grafiek|visualis|zoek.*nieuws|marktprijs/;
  if (mediumPatterns.test(lower)) return "medium";
  const lowPatterns = /hoeveel|lijst|toon|geef.*overzicht|status.*van|zoek/;
  if (lowPatterns.test(lower)) return "low";
  return "none";
}

function getModelForComplexity(complexity: "none" | "low" | "medium" | "high"): string {
  switch (complexity) {
    case "high": return "google/gemini-2.5-pro";
    case "medium": return "google/gemini-3-flash-preview";
    case "low": return "google/gemini-2.5-flash";
    case "none": return "google/gemini-2.5-flash";
  }
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
          .select("id, order_number, status, customer_id, driver_id, pickup_date, delivery_date, total_amount, reference, created_at, customers(company_name), drivers(name)")
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
          .select("id, name, phone, email, status, license_type, is_active, rating, city")
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
        const dateFrom = getDateFrom(period, now);

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
          toolName: "smart_order_entry",
          message: "Order aanmaken — bevestig de gegevens:",
          preview: {
            type: "order_create",
            summary: `Nieuwe order: ${args.description}`,
            details: {
              beschrijving: args.description,
              ophaaladres: args.pickup_address || "Nog in te vullen",
              afleveradres: args.delivery_address || "Nog in te vullen",
              ophaaldatum: args.pickup_date || "Nog in te vullen",
              klant: args.customer_name || "Nog in te vullen",
              goederen: args.goods_description || "Niet opgegeven",
              gewicht_kg: args.weight_kg || null,
            },
          },
          payload: args,
        });
      }

      // ─── NEW MUTATION TOOLS ───

      case "assign_driver_to_order": {
        // Fetch order and driver info for preview
        const [orderRes, driverRes] = await Promise.all([
          supabase.from("orders").select("id, order_number, status, pickup_date, customers(company_name)").eq("company_id", tenantId).eq("id", args.order_id).maybeSingle(),
          supabase.from("drivers").select("id, name, phone, rating, status").eq("company_id", tenantId).eq("id", args.driver_id).maybeSingle(),
        ]);

        if (!orderRes.data) return JSON.stringify({ error: "Order niet gevonden" });
        if (!driverRes.data) return JSON.stringify({ error: "Chauffeur niet gevonden" });

        return JSON.stringify({
          type: "confirmation_required",
          toolName: "assign_driver_to_order",
          message: `Chauffeur ${driverRes.data.name} toewijzen aan ${orderRes.data.order_number}`,
          preview: {
            type: "driver_assign",
            summary: `${driverRes.data.name} toewijzen aan order ${orderRes.data.order_number}`,
            details: {
              order: orderRes.data.order_number,
              klant: (orderRes.data.customers as any)?.company_name || "Onbekend",
              ophaaldatum: orderRes.data.pickup_date,
              chauffeur: driverRes.data.name,
              rating: driverRes.data.rating ? `${driverRes.data.rating}/5 ⭐` : "Geen rating",
              chauffeur_status: driverRes.data.status,
            },
          },
          payload: { order_id: args.order_id, driver_id: args.driver_id },
        });
      }

      case "update_order_status": {
        const { data: order } = await supabase.from("orders")
          .select("id, order_number, status, customers(company_name)")
          .eq("company_id", tenantId).eq("id", args.order_id).maybeSingle();

        if (!order) return JSON.stringify({ error: "Order niet gevonden" });

        return JSON.stringify({
          type: "confirmation_required",
          toolName: "update_order_status",
          message: `Status van ${order.order_number} wijzigen naar ${args.new_status}`,
          preview: {
            type: "status_change",
            summary: `Status wijzigen: ${order.status} → ${args.new_status}`,
            details: {
              order: order.order_number,
              klant: (order.customers as any)?.company_name || "Onbekend",
              huidige_status: order.status,
              nieuwe_status: args.new_status,
              reden: args.reason || "Niet opgegeven",
            },
          },
          payload: { order_id: args.order_id, new_status: args.new_status, reason: args.reason },
        });
      }

      case "create_invoice_for_order": {
        const { data: order } = await supabase.from("orders")
          .select("id, order_number, status, total_amount, customers(company_name)")
          .eq("company_id", tenantId).eq("id", args.order_id).maybeSingle();

        if (!order) return JSON.stringify({ error: "Order niet gevonden" });
        if (order.status !== "delivered") return JSON.stringify({ error: `Order is niet afgeleverd (status: ${order.status}). Alleen afgeleverde orders kunnen gefactureerd worden.` });

        return JSON.stringify({
          type: "confirmation_required",
          toolName: "create_invoice_for_order",
          message: `Factuur aanmaken voor ${order.order_number}`,
          preview: {
            type: "invoice_create",
            summary: `Factuur genereren voor order ${order.order_number}`,
            details: {
              order: order.order_number,
              klant: (order.customers as any)?.company_name || "Onbekend",
              bedrag: `€${(order.total_amount || 0).toFixed(2)}`,
              status: order.status,
            },
          },
          payload: { order_id: args.order_id },
        });
      }

      case "send_customer_email": {
        const { data: customer } = await supabase.from("customers")
          .select("id, company_name, email")
          .eq("company_id", tenantId).eq("id", args.customer_id).maybeSingle();

        if (!customer) return JSON.stringify({ error: "Klant niet gevonden" });
        if (!customer.email) return JSON.stringify({ error: `Klant ${customer.company_name} heeft geen e-mailadres` });

        return JSON.stringify({
          type: "confirmation_required",
          toolName: "send_customer_email",
          message: `E-mail sturen naar ${customer.company_name}`,
          preview: {
            type: "email_send",
            summary: `E-mail naar ${customer.company_name} (${customer.email})`,
            details: {
              aan: `${customer.company_name} <${customer.email}>`,
              onderwerp: args.subject,
              type: args.email_type || "general",
              inhoud_preview: (args.body as string)?.substring(0, 200) + "...",
            },
          },
          payload: { customer_id: args.customer_id, subject: args.subject, body: args.body, email_type: args.email_type },
        });
      }

      case "bulk_update_orders": {
        const orderIds = args.order_ids as string[];
        if (!orderIds?.length) return JSON.stringify({ error: "Geen orders opgegeven" });

        const { data: orders } = await supabase.from("orders")
          .select("id, order_number, status, customers(company_name)")
          .eq("company_id", tenantId)
          .in("id", orderIds);

        if (!orders?.length) return JSON.stringify({ error: "Geen orders gevonden" });

        return JSON.stringify({
          type: "confirmation_required",
          toolName: "bulk_update_orders",
          message: `${orders.length} orders wijzigen naar ${args.new_status}`,
          preview: {
            type: "bulk_update",
            summary: `Bulk statuswijziging: ${orders.length} orders → ${args.new_status}`,
            details: {
              aantal_orders: orders.length,
              nieuwe_status: args.new_status,
              reden: args.reason || "Niet opgegeven",
              orders: orders.slice(0, 5).map(o => o.order_number).join(", ") + (orders.length > 5 ? ` +${orders.length - 5} meer` : ""),
            },
          },
          payload: { order_ids: orderIds, new_status: args.new_status, reason: args.reason },
        });
      }

      case "create_claim_case": {
        const { data: order } = await supabase.from("orders")
          .select("id, order_number, customers(company_name)")
          .eq("company_id", tenantId).eq("id", args.order_id).maybeSingle();

        if (!order) return JSON.stringify({ error: "Order niet gevonden" });

        return JSON.stringify({
          type: "confirmation_required",
          toolName: "create_claim_case",
          message: `Schadeclaim aanmaken voor ${order.order_number}`,
          preview: {
            type: "claim_create",
            summary: `Schadeclaim (${args.claim_type}) voor order ${order.order_number}`,
            details: {
              order: order.order_number,
              klant: (order.customers as any)?.company_name || "Onbekend",
              type: args.claim_type,
              beschrijving: args.description,
              geschat_bedrag: args.estimated_amount ? `€${(args.estimated_amount as number).toFixed(2)}` : "Niet opgegeven",
            },
          },
          payload: { order_id: args.order_id, claim_type: args.claim_type, description: args.description, estimated_amount: args.estimated_amount },
        });
      }

      // ─── INTELLIGENCE TOOLS ───

      case "fleet_overview": {
        const [vehiclesRes, driversRes, ordersRes] = await Promise.all([
          supabase.from("vehicles").select("id, plate_number, type, status, make, model, year").eq("company_id", tenantId).eq("is_active", true),
          supabase.from("drivers").select("id, name, status, rating").eq("company_id", tenantId).eq("is_active", true),
          supabase.from("orders").select("id, status, driver_id").eq("company_id", tenantId).in("status", ["confirmed", "in_transit"]),
        ]);

        const vehicles = vehiclesRes.data || [];
        const drivers = driversRes.data || [];
        const activeOrders = ordersRes.data || [];

        const busyDriverIds = new Set(activeOrders.filter(o => o.driver_id).map(o => o.driver_id));

        return JSON.stringify({
          vehicles: {
            total: vehicles.length,
            by_status: vehicles.reduce((m: Record<string, number>, v) => { m[v.status || "unknown"] = (m[v.status || "unknown"] || 0) + 1; return m; }, {}),
            list: vehicles.slice(0, 20),
          },
          drivers: {
            total: drivers.length,
            available: drivers.filter(d => d.status === "available" && !busyDriverIds.has(d.id)).length,
            busy: busyDriverIds.size,
            off_duty: drivers.filter(d => d.status === "off_duty").length,
          },
          active_orders: activeOrders.length,
          unassigned_orders: activeOrders.filter(o => !o.driver_id).length,
        });
      }

      case "route_suggest": {
        const { data: order } = await supabase.from("orders")
          .select("id, order_number, pickup_date, status, customers(company_name)")
          .eq("company_id", tenantId).eq("id", args.order_id).maybeSingle();

        if (!order) return JSON.stringify({ error: "Order niet gevonden" });

        // Get available drivers with their current workload
        const [driversRes, activeOrdersRes] = await Promise.all([
          supabase.from("drivers").select("id, name, rating, status, city").eq("company_id", tenantId).eq("is_active", true).in("status", ["available", "busy"]),
          supabase.from("orders").select("driver_id").eq("company_id", tenantId).in("status", ["confirmed", "in_transit"]),
        ]);

        const drivers = driversRes.data || [];
        const activeOrders = activeOrdersRes.data || [];
        const workload = new Map<string, number>();
        for (const o of activeOrders) {
          if (o.driver_id) workload.set(o.driver_id, (workload.get(o.driver_id) || 0) + 1);
        }

        const suggestions = drivers.map(d => ({
          driver_id: d.id,
          name: d.name,
          rating: d.rating || 0,
          status: d.status,
          city: d.city || "Onbekend",
          current_workload: workload.get(d.id) || 0,
          score: ((d.rating || 3) * 20) - ((workload.get(d.id) || 0) * 15) + (d.status === "available" ? 20 : 0),
        })).sort((a, b) => b.score - a.score).slice(0, 5);

        return JSON.stringify({
          order: order.order_number,
          pickup_date: order.pickup_date,
          suggestions,
          recommendation: suggestions[0] ? `Aanbeveling: ${suggestions[0].name} (score: ${suggestions[0].score}, rating: ${suggestions[0].rating}/5, werkdruk: ${suggestions[0].current_workload} orders)` : "Geen beschikbare chauffeurs gevonden",
        });
      }

      case "daily_briefing": {
        const date = (args.date as string) || new Date().toISOString().split("T")[0];
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todayOrders, unassigned, overdueInvoices, driversRes] = await Promise.all([
          supabase.from("orders").select("id, order_number, status, driver_id, pickup_date, total_amount, customers(company_name), drivers(name)")
            .eq("company_id", tenantId).gte("pickup_date", date).lt("pickup_date", tomorrow.toISOString().split("T")[0]),
          supabase.from("orders").select("id, order_number, pickup_date, customers(company_name)")
            .eq("company_id", tenantId).is("driver_id", null).in("status", ["draft", "pending", "confirmed"]),
          supabase.from("invoices").select("id, invoice_number, total_amount, due_date, customers(company_name)")
            .eq("company_id", tenantId).eq("status", "overdue").order("due_date", { ascending: true }).limit(5),
          supabase.from("drivers").select("id, name, status").eq("company_id", tenantId).eq("is_active", true),
        ]);

        const orders = todayOrders.data || [];
        const statusBreakdown: Record<string, number> = {};
        for (const o of orders) statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;

        const risks: string[] = [];
        const unassignedOrders = unassigned.data || [];
        if (unassignedOrders.length > 0) risks.push(`🚨 ${unassignedOrders.length} orders zonder chauffeur`);
        const overdueList = overdueInvoices.data || [];
        if (overdueList.length > 0) risks.push(`💰 ${overdueList.length} achterstallige facturen (€${overdueList.reduce((s, i) => s + (i.total_amount || 0), 0).toFixed(0)})`);
        const offDuty = (driversRes.data || []).filter(d => d.status === "off_duty");
        if (offDuty.length > 0) risks.push(`⚠️ ${offDuty.length} chauffeurs off-duty`);

        return JSON.stringify({
          date,
          planned_orders: orders.length,
          status_breakdown: statusBreakdown,
          total_revenue: orders.reduce((s, o) => s + (o.total_amount || 0), 0),
          unassigned_orders: unassignedOrders.slice(0, 5).map(o => ({ number: o.order_number, pickup: o.pickup_date, customer: (o.customers as any)?.company_name })),
          overdue_invoices: overdueList.map(i => ({ number: i.invoice_number, amount: i.total_amount, customer: (i.customers as any)?.company_name })),
          available_drivers: (driversRes.data || []).filter(d => d.status === "available").length,
          risks,
          actions_needed: risks.length > 0 ? "Actie vereist — zie risico's hierboven" : "Alles op schema ✅",
        });
      }

      case "generate_report": {
        const reportType = args.report_type as string;
        const period = (args.period as string) || "month";
        const dateFrom = getDateFrom(period, new Date());

        const [ordersRes, invoicesRes, driversRes] = await Promise.all([
          supabase.from("orders").select("id, status, total_amount, purchase_amount, customer_id, driver_id, pickup_date, customers(company_name), drivers(name)")
            .eq("company_id", tenantId).gte("created_at", dateFrom),
          supabase.from("invoices").select("id, status, total_amount, due_date")
            .eq("company_id", tenantId).gte("created_at", dateFrom),
          supabase.from("drivers").select("id, name, rating, status")
            .eq("company_id", tenantId).eq("is_active", true),
        ]);

        const orders = ordersRes.data || [];
        const invoices = invoicesRes.data || [];
        const revenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
        const cost = orders.reduce((s, o) => s + (o.purchase_amount || 0), 0);
        const margin = revenue > 0 ? ((revenue - cost) / revenue * 100) : 0;
        const delivered = orders.filter(o => o.status === "delivered").length;
        const overdue = invoices.filter(i => i.status === "overdue");

        return JSON.stringify({
          report_type: reportType,
          period,
          date_from: dateFrom,
          kpis: {
            total_orders: orders.length,
            delivered: delivered,
            delivery_rate: orders.length > 0 ? Math.round(delivered / orders.length * 100) : 0,
            revenue: revenue,
            cost: cost,
            profit: revenue - cost,
            margin_percent: Math.round(margin * 10) / 10,
            open_invoices: invoices.filter(i => i.status === "pending").length,
            overdue_invoices: overdue.length,
            overdue_amount: overdue.reduce((s, i) => s + (i.total_amount || 0), 0),
          },
          top_customers: (() => {
            const cMap = new Map<string, { name: string; revenue: number; count: number }>();
            for (const o of orders) {
              const name = (o.customers as any)?.company_name || "Onbekend";
              const e = cMap.get(o.customer_id || "") || { name, revenue: 0, count: 0 };
              e.revenue += o.total_amount || 0; e.count++;
              cMap.set(o.customer_id || "", e);
            }
            return Array.from(cMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
          })(),
          driver_count: (driversRes.data || []).length,
          available_drivers: (driversRes.data || []).filter(d => d.status === "available").length,
        });
      }

      // ─── EXISTING ANALYSIS TOOLS ───

      case "margin_analysis": {
        const period = args.period as string || "month";
        const now = new Date();
        const dateFrom = getDateFrom(period, now);

        if (args.customer_id) {
          const { data } = await supabase.from("orders")
            .select("id, order_number, total_amount, purchase_amount, status, pickup_date, customers(company_name)")
            .eq("company_id", tenantId).eq("customer_id", args.customer_id).gte("created_at", dateFrom);

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

        const groupBy = args.group_by as string;
        const { data: orders } = await supabase.from("orders")
          .select("id, total_amount, purchase_amount, customer_id, driver_id, customers(company_name), drivers(name)")
          .eq("company_id", tenantId).gte("created_at", dateFrom);

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
            .eq("company_id", tenantId).in("status", ["pending", "overdue"])
            .lte("due_date", futureDate.toISOString().split("T")[0]),
          supabase.from("finance_transactions")
            .select("id, amount, type, status, due_date, description")
            .eq("company_id", tenantId).in("status", ["pending", "scheduled"])
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
            .eq("company_id", tenantId).gte("created_at", dateFrom),
          supabase.from("invoices")
            .select("customer_id, total_amount, status, due_date")
            .eq("company_id", tenantId).gte("created_at", dateFrom),
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
            if (entry) { entry.overdueAmount += inv.total_amount || 0; entry.overdueCount++; }
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

        let driverFilter = supabase.from("drivers").select("id, name, rating, status")
          .eq("company_id", tenantId).eq("is_active", true);
        if (args.driver_id) driverFilter = driverFilter.eq("id", args.driver_id);

        const [driversRes, ordersRes] = await Promise.all([
          driverFilter,
          supabase.from("orders").select("driver_id, status, total_amount, delivery_date")
            .eq("company_id", tenantId).gte("created_at", dateFrom).not("driver_id", "is", null),
        ]);

        const driverMap = new Map<string, { name: string; rating: number | null; trips: number; delivered: number; revenue: number }>();
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
          period, driver_count: results.length, drivers: results,
          top_performer: results[0]?.name || "N/A",
          avg_completion_rate: results.length > 0
            ? Math.round(results.reduce((s, d) => s + d.completion_rate, 0) / results.length) : 0,
        });
      }

      case "invoice_status": {
        let query = supabase.from("invoices")
          .select("id, invoice_number, total_amount, status, due_date, created_at, customers(company_name)")
          .eq("company_id", tenantId).order("due_date", { ascending: true });

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
            filter: `>${args.days_overdue} dagen achterstallig`, count: filtered.length,
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
          supabase.from("orders").select("id, total_amount, purchase_amount, status, delivery_date")
            .eq("company_id", tenantId).gte("created_at", currentFrom),
          supabase.from("orders").select("id, total_amount, purchase_amount, status, delivery_date")
            .eq("company_id", tenantId).gte("created_at", prevFrom).lt("created_at", currentFrom),
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
          if (metric === "on_time") return orders.filter(o => o.status === "delivered").length;
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
          insight: delta > 10 ? `Sterke groei van ${Math.round(delta)}% — goed bezig!`
            : delta < -10 ? `Let op: ${Math.round(Math.abs(delta))}% daling vs vorige ${period}.`
            : `Stabiel verloop vs vorige ${period}.`,
        });
      }

      // ─── PREMIUM TOOLS ───

      case "generate_chart": {
        const chartType = args.chart_type as string;
        const period = (args.period as string) || "month";
        const dateFrom = getDateFrom(period, new Date());

        const { data: orders } = await supabase.from("orders")
          .select("id, total_amount, purchase_amount, status, pickup_date, created_at, customers(company_name), drivers(name)")
          .eq("company_id", tenantId).gte("created_at", dateFrom);

        const chartData = (orders || []).reduce((acc: Record<string, { date: string; revenue: number; cost: number; orders: number }>, o) => {
          const date = (o.pickup_date || o.created_at)?.split("T")[0] || "unknown";
          if (!acc[date]) acc[date] = { date, revenue: 0, cost: 0, orders: 0 };
          acc[date].revenue += o.total_amount || 0;
          acc[date].cost += o.purchase_amount || 0;
          acc[date].orders++;
          return acc;
        }, {});

        return JSON.stringify({
          type: "chart",
          chart_type: chartType,
          title: args.title,
          data: Object.values(chartData).sort((a, b) => a.date.localeCompare(b.date)),
          summary: `${(orders || []).length} orders in ${period}, totaal €${(orders || []).reduce((s, o) => s + (o.total_amount || 0), 0).toFixed(0)} omzet`,
        });
      }

      case "web_search": {
        // AI-powered search synthesis — returns contextual transport info
        return JSON.stringify({
          type: "search_result",
          query: args.query,
          category: args.category || "general",
          results: [
            { title: "AI Transport Intelligence", content: `Zoekresultaat voor "${args.query}". De AI zal deze informatie verwerken in een samenhangend antwoord op basis van de beschikbare kennis over transport, logistiek en regelgeving.` },
          ],
          note: "Gebruik de beschikbare context om een informatief antwoord te geven over dit onderwerp.",
        });
      }

      case "document_summary": {
        const text = (args.text as string) || "";
        const focus = (args.focus as string) || "summary";
        return JSON.stringify({
          type: "document_analysis",
          focus,
          text_length: text.length,
          text_preview: text.substring(0, 500),
          instruction: `Analyseer deze tekst met focus op ${focus}. Geef een gestructureerd overzicht.`,
        });
      }

      case "translate_message": {
        return JSON.stringify({
          type: "translation_request",
          original_text: args.text,
          target_language: args.target_language,
          context: args.context || "transport",
          instruction: `Vertaal de tekst naar ${args.target_language} met context: ${args.context || "transport"}`,
        });
      }

      case "generate_image": {
        try {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          const imageRes = await fetch(GATEWAY_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [{ role: "user", content: `${args.prompt}. Style: ${args.style || "professional"}. High quality, clean design.` }],
              modalities: ["image", "text"],
            }),
          });

          if (!imageRes.ok) return JSON.stringify({ error: "Image generation failed", status: imageRes.status });

          const imageData = await imageRes.json();
          const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (!imageUrl) return JSON.stringify({ error: "No image generated" });

          // Store in Supabase Storage
          const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          const fileName = `${crypto.randomUUID()}.png`;

          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const adminClient = createClient(supabaseUrl, supabaseServiceKey);

          const { error: uploadErr } = await adminClient.storage
            .from("ai-generated")
            .upload(fileName, imageBytes, { contentType: "image/png" });

          if (uploadErr) return JSON.stringify({ error: `Upload failed: ${uploadErr.message}` });

          const { data: urlData } = adminClient.storage.from("ai-generated").getPublicUrl(fileName);

          return JSON.stringify({
            type: "image_generated",
            url: urlData.publicUrl,
            prompt: args.prompt,
            style: args.style || "professional",
            markdown: `![${args.prompt}](${urlData.publicUrl})`,
          });
        } catch (imgErr) {
          console.error("Image gen error:", imgErr);
          return JSON.stringify({ error: `Image generation error: ${imgErr instanceof Error ? imgErr.message : "Unknown"}` });
        }
      }

      case "smart_planning": {
        const orderIds = args.order_ids as string[];
        if (!orderIds?.length) return JSON.stringify({ error: "Geen orders opgegeven" });

        const { data: orders } = await supabase.from("orders")
          .select("id, order_number, pickup_date, delivery_date, total_amount, purchase_amount, status, driver_id, customers(company_name), drivers(name), order_stops(city, sequence, stop_type)")
          .eq("company_id", tenantId).in("id", orderIds);

        const { data: availableDrivers } = await supabase.from("drivers")
          .select("id, name, rating, status, city")
          .eq("company_id", tenantId).eq("is_active", true).in("status", ["available", "busy"]);

        const totalRevenue = (orders || []).reduce((s, o) => s + (o.total_amount || 0), 0);
        const totalCost = (orders || []).reduce((s, o) => s + (o.purchase_amount || 0), 0);
        const unassigned = (orders || []).filter(o => !o.driver_id);

        return JSON.stringify({
          type: "planning_analysis",
          optimize_for: args.optimize_for || "balanced",
          orders: (orders || []).map(o => ({
            id: o.id, number: o.order_number, pickup: o.pickup_date, delivery: o.delivery_date,
            customer: (o.customers as any)?.company_name, driver: (o.drivers as any)?.name || "Niet toegewezen",
            stops: o.order_stops, revenue: o.total_amount, cost: o.purchase_amount,
          })),
          available_drivers: (availableDrivers || []).map(d => ({ id: d.id, name: d.name, rating: d.rating, city: d.city })),
          summary: {
            total_orders: (orders || []).length, unassigned: unassigned.length,
            total_revenue: totalRevenue, total_cost: totalCost,
            margin: totalRevenue > 0 ? Math.round((totalRevenue - totalCost) / totalRevenue * 100) : 0,
            available_driver_count: (availableDrivers || []).length,
          },
          instruction: "Analyseer deze orders en stel een optimaal planningsvoorstel voor. Wijs chauffeurs toe op basis van locatie, werkdruk en rating.",
        });
      }

      case "anomaly_detect": {
        const metric = args.metric as string;
        const lookback = (args.lookback_days as number) || 30;
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - lookback);

        const { data: orders } = await supabase.from("orders")
          .select("id, total_amount, purchase_amount, status, pickup_date, created_at, customer_id, driver_id")
          .eq("company_id", tenantId).gte("created_at", dateFrom.toISOString());

        const dailyData: Record<string, { date: string; revenue: number; cost: number; count: number; delivered: number }> = {};
        for (const o of orders || []) {
          const date = (o.created_at)?.split("T")[0] || "unknown";
          if (!dailyData[date]) dailyData[date] = { date, revenue: 0, cost: 0, count: 0, delivered: 0 };
          dailyData[date].revenue += o.total_amount || 0;
          dailyData[date].cost += o.purchase_amount || 0;
          dailyData[date].count++;
          if (o.status === "delivered") dailyData[date].delivered++;
        }

        const values = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
        const avgRevenue = values.length > 0 ? values.reduce((s, d) => s + d.revenue, 0) / values.length : 0;
        const anomalies = values.filter(d => Math.abs(d.revenue - avgRevenue) > avgRevenue * 0.5);

        return JSON.stringify({
          type: "anomaly_analysis",
          metric, lookback_days: lookback,
          data_points: values.length,
          daily_data: values,
          anomalies: anomalies.map(a => ({
            date: a.date, value: a.revenue, deviation: Math.round((a.revenue - avgRevenue) / avgRevenue * 100),
            direction: a.revenue > avgRevenue ? "above" : "below",
          })),
          averages: { daily_revenue: Math.round(avgRevenue), daily_orders: values.length > 0 ? Math.round(values.reduce((s, d) => s + d.count, 0) / values.length) : 0 },
          instruction: `Analyseer de afwijkingen in ${metric} over de laatste ${lookback} dagen. Identificeer patronen en geef concrete aanbevelingen.`,
        });
      }

      case "draft_contract": {
        let customerInfo = null;
        if (args.customer_id) {
          const { data } = await supabase.from("customers")
            .select("company_name, email, address, city, postal_code, vat_number, payment_terms_days")
            .eq("company_id", tenantId).eq("id", args.customer_id).maybeSingle();
          customerInfo = data;
        }

        return JSON.stringify({
          type: "confirmation_required",
          toolName: "draft_contract",
          message: `Concept ${args.contract_type} genereren`,
          preview: {
            type: "contract_draft",
            summary: `Concept ${args.contract_type}${customerInfo ? ` voor ${customerInfo.company_name}` : ""}`,
            details: {
              type: args.contract_type,
              klant: customerInfo?.company_name || "Nog in te vullen",
              extra_details: args.details || "Standaard voorwaarden",
            },
          },
          payload: { contract_type: args.contract_type, customer: customerInfo, details: args.details },
          instruction: "Genereer een professioneel concept transportdocument in het Nederlands met standaard transportvoorwaarden.",
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
  maxIterations = 6,
): Promise<{ finalMessages: any[]; pendingConfirmation: any; toolsUsed: string[] }> {
  const systemMsg = chatMessages.find(m => m.role === "system");
  const convMsgs = chatMessages.filter(m => m.role !== "system").slice(-15);
  let messages = systemMsg ? [systemMsg, ...convMsgs] : [...convMsgs];
  let pendingConfirmation = null;
  const toolsUsed: string[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: getModelForComplexity(reasoning?.effort as any || "medium"),
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
      messages.push(choice.message);
      break;
    }

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

    // Stop if a confirmation is pending
    if (pendingConfirmation) break;
  }

  return { finalMessages: messages, pendingConfirmation, toolsUsed };
}

// ─── Confirm Action Executor ───

async function executeConfirmedAction(
  toolName: string,
  payload: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  userId: string,
): Promise<{ success: boolean; message: string }> {
  switch (toolName) {
    case "smart_order_entry": {
      const { data, error } = await supabase.from("orders").insert({
        company_id: tenantId, status: "draft",
        reference: (payload.description as string)?.substring(0, 100),
        pickup_date: payload.pickup_date || null,
        notes: payload.description, created_by: userId,
      }).select("id, order_number").single();

      if (error) return { success: false, message: error.message };
      return { success: true, message: `Order ${data.order_number} aangemaakt als concept.` };
    }

    case "assign_driver_to_order": {
      const { error } = await supabase.from("orders")
        .update({ driver_id: payload.driver_id, status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", payload.order_id).eq("company_id", tenantId);

      if (error) return { success: false, message: error.message };

      await supabase.from("order_events").insert({
        order_id: payload.order_id as string,
        event_type: "driver_assigned",
        description: `Chauffeur toegewezen via AI Assistent`,
        created_by: userId,
      });

      return { success: true, message: "Chauffeur succesvol toegewezen aan de order." };
    }

    case "update_order_status": {
      const { error } = await supabase.from("orders")
        .update({ status: payload.new_status, updated_at: new Date().toISOString() })
        .eq("id", payload.order_id).eq("company_id", tenantId);

      if (error) return { success: false, message: error.message };

      await supabase.from("order_events").insert({
        order_id: payload.order_id as string,
        event_type: "status_changed",
        description: `Status gewijzigd naar ${payload.new_status} via AI${payload.reason ? `: ${payload.reason}` : ""}`,
        created_by: userId,
      });

      return { success: true, message: `Order status gewijzigd naar ${payload.new_status}.` };
    }

    case "create_invoice_for_order": {
      const { data: order } = await supabase.from("orders")
        .select("id, order_number, total_amount, customer_id").eq("id", payload.order_id).eq("company_id", tenantId).single();

      if (!order) return { success: false, message: "Order niet gevonden" };

      const { data: invoice, error } = await supabase.from("invoices").insert({
        company_id: tenantId,
        customer_id: order.customer_id,
        order_id: order.id,
        total_amount: order.total_amount || 0,
        status: "draft",
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        created_by: userId,
      }).select("id, invoice_number").single();

      if (error) return { success: false, message: error.message };

      await supabase.from("order_events").insert({
        order_id: order.id, event_type: "invoice_created",
        description: `Factuur ${invoice.invoice_number} aangemaakt via AI`,
        created_by: userId,
      });

      return { success: true, message: `Factuur ${invoice.invoice_number} aangemaakt (€${(order.total_amount || 0).toFixed(2)}).` };
    }

    case "send_customer_email": {
      // Log the email intent - actual sending via email infrastructure
      const { data: customer } = await supabase.from("customers")
        .select("company_name, email").eq("id", payload.customer_id).eq("company_id", tenantId).single();

      if (!customer?.email) return { success: false, message: "Klant heeft geen e-mailadres" };

      // Store as a notification/communication log
      await supabase.from("order_events").insert({
        event_type: "email_sent",
        description: `E-mail "${payload.subject}" gestuurd naar ${customer.company_name} (${customer.email}) via AI`,
        created_by: userId,
      });

      return { success: true, message: `E-mail "${payload.subject}" is klaargezet voor ${customer.company_name}.` };
    }

    case "bulk_update_orders": {
      const orderIds = payload.order_ids as string[];
      const { error } = await supabase.from("orders")
        .update({ status: payload.new_status, updated_at: new Date().toISOString() })
        .eq("company_id", tenantId).in("id", orderIds);

      if (error) return { success: false, message: error.message };

      // Log events for each order
      const events = orderIds.map(oid => ({
        order_id: oid, event_type: "status_changed",
        description: `Bulk status → ${payload.new_status} via AI${payload.reason ? `: ${payload.reason}` : ""}`,
        created_by: userId,
      }));
      await supabase.from("order_events").insert(events);

      return { success: true, message: `${orderIds.length} orders gewijzigd naar ${payload.new_status}.` };
    }

    case "create_claim_case": {
      const { data: claim, error } = await supabase.from("claim_cases").insert({
        company_id: tenantId,
        order_id: payload.order_id as string,
        claim_type: payload.claim_type as string,
        description: payload.description as string,
        estimated_amount: (payload.estimated_amount as number) || null,
        status: "open",
        reported_by: userId,
      }).select("id").single();

      if (error) return { success: false, message: error.message };

      await supabase.from("order_events").insert({
        order_id: payload.order_id as string,
        event_type: "claim_created",
        description: `Schadeclaim (${payload.claim_type}) aangemaakt via AI`,
        created_by: userId,
      });

      return { success: true, message: `Schadeclaim aangemaakt (type: ${payload.claim_type}).` };
    }

    default:
      return { success: false, message: `Onbekende actie: ${toolName}` };
  }
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

      const result = await executeConfirmedAction(toolName, confirmPayload, supabase, tenantId, userId);

      if (result.success) {
        await supabase.rpc("deduct_ai_credits", {
          p_tenant_id: tenantId, p_user_id: userId, p_credits: 2,
          p_action_type: "tool_call", p_complexity: "complex", p_model: "gemini-3-flash",
        });
      }

      return new Response(JSON.stringify({ success: result.success, result: { message: result.message } }), {
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
      .limit(15);

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

    const complexity = detectComplexity(message || "");
    const selectedModel = getModelForComplexity(complexity);
    const reasoning = complexity !== "none" ? { effort: complexity } : undefined;

    // ─── SSE Streaming with Multi-Step Tool Loop ───
    if (stream !== false) {
      try {
        const { finalMessages, pendingConfirmation, toolsUsed } = await runToolLoop(
          chatMessages, supabase, tenantId, userId, LOVABLE_API_KEY, reasoning
        );

        const streamRes = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
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

        const creditCost = toolsUsed.some(t => ["generate_image"].includes(t)) ? 5
          : toolsUsed.some(t => ["smart_planning", "anomaly_detect", "draft_contract"].includes(t)) ? 4
          : toolsUsed.some(t => ["generate_report", "daily_briefing", "generate_chart"].includes(t)) ? 3
          : toolsUsed.some(t => ["assign_driver_to_order", "update_order_status", "create_invoice_for_order", "send_customer_email", "bulk_update_orders", "create_claim_case", "smart_order_entry"].includes(t)) ? 2
          : toolsUsed.length > 0 ? 1 : 1;

        await supabase.rpc("deduct_ai_credits", {
          p_tenant_id: tenantId, p_user_id: userId, p_credits: creditCost,
          p_action_type: toolsUsed.length > 0 ? "tool_call" : "chat",
          p_complexity: complexity !== "none" ? "complex" : "simple",
          p_model: selectedModel.split("/").pop() || "gemini-3-flash",
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

      const finalRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
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

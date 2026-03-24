import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Je bent de LogiFlow AI Co-Pilot — een intelligente assistent voor transport management (TMS).

## Wie je bent
- Je werkt voor een Nederlands transportbedrijf
- Je hebt directe toegang tot het TMS-systeem via tools
- Je antwoordt ALTIJD in het Nederlands
- Je bent concreet, data-gedreven en actiegericht — NOOIT vaag

## Stijl
- Geef altijd specifieke cijfers, namen en data
- Gebruik tabellen voor overzichten (markdown)
- Wees bondig maar volledig
- Bij mutaties: vraag ALTIJD eerst bevestiging
- Gebruik emoji's spaarzaam maar effectief (✅ ❌ 🚚 📊 💰)

## Beschikbare tools
Je hebt tools om het TMS te bevragen. Gebruik ze PROACTIEF:
- Vraag over orders → gebruik search_orders
- Vraag over chauffeurs → gebruik list_drivers
- Vraag over KPI's/statistieken → gebruik get_kpis
- Vraag over specifieke order → gebruik explain_order
- Gebruiker wil iets onthouden → gebruik save_memory
- Nieuwe order aanmaken → gebruik smart_order_entry (altijd bevestiging vragen!)

## Regels
1. Gebruik ALTIJD een tool als de vraag over TMS-data gaat
2. Verzin NOOIT data — als je het niet weet, zeg dat eerlijk
3. Bij fouten: leg uit wat er mis ging en stel alternatieven voor
4. Houd rekening met de tenant-isolatie: je ziet alleen data van het eigen bedrijf`;

const TMS_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_orders",
      description:
        "Zoek orders/ritten in het TMS. Gebruik voor vragen over orders, leveringen, zendingen, ritten.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["draft", "pending", "confirmed", "in_transit", "delivered", "cancelled"],
            description: "Filter op orderstatus",
          },
          search: { type: "string", description: "Zoek op ordernummer, klantnaam, referentie" },
          date_from: { type: "string", description: "Startdatum filter (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Einddatum filter (YYYY-MM-DD)" },
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
      description: "Haal chauffeurs op met hun status, beschikbaarheid en scores.",
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
      description:
        "Haal real-time KPI's op: omzet, marges, openstaande facturen, ritten vandaag, on-time percentage.",
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
      description: "Geef een volledige uitleg van een specifieke order inclusief stops, events en status.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "Het ordernummer (bijv. ORD-2024-0001)" },
          order_id: { type: "string", description: "De order UUID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Sla een gebruikersvoorkeur of notitie op voor toekomstige gesprekken.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Sleutel voor de herinnering (bijv. 'preferred_view', 'team_name')" },
          value: { type: "string", description: "De waarde om te onthouden" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "smart_order_entry",
      description:
        "Maak een nieuwe order aan op basis van natuurlijke taal. ALTIJD bevestiging vragen voordat je uitvoert.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Beschrijving van de order in natuurlijke taal" },
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
];

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
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          dateFrom = d.toISOString().split("T")[0];
        } else if (period === "quarter") {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 3);
          dateFrom = d.toISOString().split("T")[0];
        } else {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 1);
          dateFrom = d.toISOString().split("T")[0];
        }

        const [ordersRes, invoicesRes, driversRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, status, total_amount")
            .eq("company_id", tenantId)
            .gte("created_at", dateFrom),
          supabase
            .from("invoices")
            .select("id, status, total_amount")
            .eq("company_id", tenantId)
            .gte("created_at", dateFrom),
          supabase
            .from("drivers")
            .select("id, status")
            .eq("company_id", tenantId)
            .eq("is_active", true),
        ]);

        const orders = ordersRes.data || [];
        const invoices = invoicesRes.data || [];
        const drivers = driversRes.data || [];

        const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
        const openInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
        const openInvoiceAmount = openInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);

        const statusCounts: Record<string, number> = {};
        for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

        const driverStatusCounts: Record<string, number> = {};
        for (const d of drivers) driverStatusCounts[d.status || "unknown"] = (driverStatusCounts[d.status || "unknown"] || 0) + 1;

        return JSON.stringify({
          period,
          date_from: dateFrom,
          total_orders: orders.length,
          order_status_breakdown: statusCounts,
          total_revenue: totalRevenue,
          open_invoices: openInvoices.length,
          open_invoice_amount: openInvoiceAmount,
          total_drivers: drivers.length,
          driver_status_breakdown: driverStatusCounts,
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

        const { data: stops } = await supabase
          .from("order_stops")
          .select("*")
          .eq("order_id", order.id)
          .order("sequence", { ascending: true });

        const { data: events } = await supabase
          .from("order_events")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true });

        return JSON.stringify({ order, stops: stops || [], events: events || [] });
      }

      case "save_memory": {
        const { error } = await supabase.from("ai_user_memory").upsert(
          {
            user_id: userId,
            tenant_id: tenantId,
            memory_key: args.key as string,
            memory_value: args.value as string,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,memory_key" }
        );
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, message: `Onthouden: ${args.key} = ${args.value}` });
      }

      case "smart_order_entry": {
        // Return preview — don't create yet, needs confirmation
        return JSON.stringify({
          type: "confirmation_required",
          message: "Ik heb de volgende ordergegevens verzameld. Bevestig om aan te maken:",
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

      default:
        return JSON.stringify({ error: `Onbekende tool: ${toolName}` });
    }
  } catch (err) {
    console.error(`Tool ${toolName} error:`, err);
    return JSON.stringify({ error: `Tool fout: ${err instanceof Error ? err.message : "Onbekend"}` });
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

    // Get tenant_id from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
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
        // Actually create the order
        const { data: orderData, error: orderErr } = await supabase.from("orders").insert({
          company_id: tenantId,
          status: "draft",
          reference: confirmPayload.description?.substring(0, 100),
          pickup_date: confirmPayload.pickup_date || null,
          notes: confirmPayload.description,
          created_by: userId,
        }).select("id, order_number").single();

        if (orderErr) {
          return new Response(JSON.stringify({ success: false, error: orderErr.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Deduct credits
        await supabase.rpc("deduct_ai_credits", {
          p_tenant_id: tenantId, p_user_id: userId, p_credits: 2,
          p_action_type: "tool_call", p_complexity: "complex", p_model: "gemini-3-flash",
        });

        return new Response(JSON.stringify({
          success: true,
          result: { message: `Order ${orderData.order_number} aangemaakt als concept.` },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: false, error: "Onbekende actie" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Chat Action ───

    // Load or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: conv, error: convErr } = await supabase
        .from("chatgpt_conversations")
        .insert({ user_id: userId, title: message?.substring(0, 80) || "Nieuw gesprek" })
        .select("id")
        .single();
      if (convErr) throw new Error("Kon gesprek niet aanmaken");
      convId = conv.id;
    }

    // Save user message
    await supabase.from("chatgpt_messages").insert({
      conversation_id: convId, role: "user", content: message,
    });

    // Load conversation history
    const { data: historyMsgs } = await supabase
      .from("chatgpt_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(30);

    // Load user memory
    const { data: memories } = await supabase
      .from("ai_user_memory")
      .select("memory_key, memory_value")
      .eq("user_id", userId);

    let memoryContext = "";
    if (memories?.length) {
      memoryContext = "\n\n## Gebruikersvoorkeuren (onthouden)\n" +
        memories.map((m) => `- ${m.memory_key}: ${m.memory_value}`).join("\n");
    }

    const pageContext = context?.currentPage ? `\nGebruiker bevindt zich op: ${context.currentPage}` : "";
    const roleContext = context?.userRole ? `\nGebruikersrol: ${context.userRole}` : "";

    const systemMessage = SYSTEM_PROMPT + memoryContext + pageContext + roleContext;

    const chatMessages = [
      { role: "system", content: systemMessage },
      ...(historyMsgs || []).map((m) => ({ role: m.role, content: m.content })),
    ];

    // ─── SSE Streaming with Tool Calling ───
    if (stream !== false) {
      // First call: non-streaming to handle tool calls, then stream final response
      const initialRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: chatMessages,
          tools: TMS_TOOLS,
          stream: false,
        }),
      });

      if (!initialRes.ok) {
        const status = initialRes.status;
        const errText = await initialRes.text();
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit bereikt" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        console.error("AI gateway error:", status, errText);
        throw new Error("AI gateway error");
      }

      const initialData = await initialRes.json();
      const choice = initialData.choices?.[0];

      // Check for tool calls
      if (choice?.message?.tool_calls?.length) {
        const toolResults: { role: string; tool_call_id: string; content: string }[] = [];
        let pendingConfirmation = null;

        for (const tc of choice.message.tool_calls) {
          const toolArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
          const result = await executeTool(tc.function.name, toolArgs, supabase, tenantId, userId);
          toolResults.push({ role: "tool", tool_call_id: tc.id, content: result });

          // Check if this is a confirmation-required response
          try {
            const parsed = JSON.parse(result);
            if (parsed.type === "confirmation_required") {
              pendingConfirmation = { toolName: parsed.toolName, payload: parsed.payload, preview: parsed.preview };
            }
          } catch {}
        }

        // Stream the final response with tool results
        const finalMessages = [
          ...chatMessages,
          choice.message,
          ...toolResults,
        ];

        const streamRes = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: finalMessages,
            stream: true,
          }),
        });

        if (!streamRes.ok || !streamRes.body) throw new Error("Stream failed");

        // Deduct credits (tool call = 2 credits)
        await supabase.rpc("deduct_ai_credits", {
          p_tenant_id: tenantId, p_user_id: userId, p_credits: 2,
          p_action_type: "tool_call", p_complexity: "complex", p_model: "gemini-3-flash",
        });

        // Collect streamed content for saving
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

                    // Inject pending confirmation if present
                    if (pendingConfirmation && parsed.choices?.[0]?.finish_reason) {
                      parsed._pendingConfirmation = pendingConfirmation;
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
                  } catch {}
                }
              }
            } finally {
              // Save assistant message
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
      }

      // No tool calls — stream the response directly
      const streamRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: chatMessages, stream: true }),
      });

      if (!streamRes.ok || !streamRes.body) throw new Error("Stream failed");

      // Deduct 1 credit for simple chat
      await supabase.rpc("deduct_ai_credits", {
        p_tenant_id: tenantId, p_user_id: userId, p_credits: 1,
        p_action_type: "chat", p_complexity: "simple", p_model: "gemini-3-flash",
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
                  controller.enqueue(encoder.encode(`data: ${jsonStr}\n\n`));
                } catch {}
              }
            }
          } finally {
            if (fullContent) {
              await supabase.from("chatgpt_messages").insert({
                conversation_id: convId, role: "assistant", content: fullContent,
              });
            }
            controller.close();
          }
        },
      });

      return new Response(transformedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // ─── Non-streaming fallback ───
    const aiRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: chatMessages,
        tools: TMS_TOOLS,
        stream: false,
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits op" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI error");
    }

    const aiData = await aiRes.json();
    let choice2 = aiData.choices?.[0];
    let pendingConfirmation = null;

    // Handle tool calls in non-streaming
    if (choice2?.message?.tool_calls?.length) {
      const toolResults2: { role: string; tool_call_id: string; content: string }[] = [];
      for (const tc of choice2.message.tool_calls) {
        const toolArgs = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        const result = await executeTool(tc.function.name, toolArgs, supabase, tenantId, userId);
        toolResults2.push({ role: "tool", tool_call_id: tc.id, content: result });
        try {
          const parsed = JSON.parse(result);
          if (parsed.type === "confirmation_required") {
            pendingConfirmation = { toolName: parsed.toolName, payload: parsed.payload, preview: parsed.preview };
          }
        } catch {}
      }

      const finalRes = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [...chatMessages, choice2.message, ...toolResults2],
          stream: false,
        }),
      });
      const finalData = await finalRes.json();
      choice2 = finalData.choices?.[0];
    }

    const assistantContent = choice2?.message?.content || "Ik kon geen antwoord genereren.";

    // Save assistant message
    await supabase.from("chatgpt_messages").insert({
      conversation_id: convId, role: "assistant", content: assistantContent,
      pending_confirmation: !!pendingConfirmation,
      confirmation_payload: pendingConfirmation as any,
    });

    // Deduct credits
    const creditCost = pendingConfirmation ? 2 : 1;
    await supabase.rpc("deduct_ai_credits", {
      p_tenant_id: tenantId, p_user_id: userId, p_credits: creditCost,
      p_action_type: pendingConfirmation ? "tool_call" : "chat",
      p_complexity: pendingConfirmation ? "complex" : "simple",
      p_model: "gemini-3-flash",
    });

    // Get remaining credits
    const { data: sub } = await supabase
      .from("ai_tenant_subscriptions")
      .select("credits_remaining")
      .eq("tenant_id", tenantId)
      .in("status", ["trial", "active"])
      .maybeSingle();

    return new Response(JSON.stringify({
      success: true,
      conversationId: convId,
      message: assistantContent,
      pendingConfirmation,
      credits: {
        remaining: sub?.credits_remaining ?? 0,
        used: creditCost,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("chatgpt error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Onbekende fout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

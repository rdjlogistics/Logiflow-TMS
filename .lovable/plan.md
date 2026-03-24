

# Plan: Model Routing Logging in Copilot Edge Function

## Wat
Voeg structured logging toe aan de copilot edge function zodat in de logs zichtbaar is welk model, complexity level, tools en latency per request worden gebruikt.

## Bestand: `supabase/functions/copilot/index.ts`

### Wijzigingen

1. **Request start log** (na complexity detection, ~regel 268):
   ```
   console.log(JSON.stringify({
     event: "copilot_request",
     model, complexity, user_id: userId,
     message_preview: lastUserMsg.slice(0, 80),
     timestamp: new Date().toISOString()
   }));
   ```

2. **Tool execution log** (in tool loop, ~regel 309):
   ```
   console.log(JSON.stringify({
     event: "copilot_tool_call",
     tool: tc.function.name,
     args: toolArgs,
     iteration: i + 1
   }));
   ```

3. **Request complete log** (voor de return, ~regel 343):
   ```
   console.log(JSON.stringify({
     event: "copilot_complete",
     model, complexity,
     tools_used: toolsUsed,
     tool_count: toolsUsed.length,
     credit_cost: creditCost,
     duration_ms: Date.now() - startTime
   }));
   ```

4. **Timer** — Voeg `const startTime = Date.now();` toe aan het begin van de request handler (~regel 236).

### Resultaat
Elke copilot request produceert 2-3 gestructureerde JSON log regels die via de backend logs te inspecteren zijn:
- Welk model werd gekozen en waarom (complexity)
- Welke tools werden aangeroepen
- Totale latency

Geen frontend wijzigingen nodig.


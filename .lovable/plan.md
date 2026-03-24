

# Plan: AI Assistent van Chatbot naar Echte Co-Pilot

## Kernprobleem
De `supabase/functions/` directory is **leeg** — de `chatgpt` edge function die de frontend aanroept bestaat niet. Daarom krijg je geen echte antwoorden. De hele AI-infrastructuur (DB-tabellen, credit systeem, frontend UI) staat klaar, maar de backend ontbreekt.

## Wat we bouwen

### 1. `chatgpt` Edge Function — Het Brein
Een edge function die Lovable AI (Gemini 3 Flash) aanspreekt met:

**Tool Calling** — de AI kan daadwerkelijk data opvragen en acties uitvoeren:
- `search_orders` — Orders zoeken/filteren op status, klant, datum, chauffeur
- `list_drivers` — Beschikbare chauffeurs ophalen met scores en status
- `get_kpis` — Real-time KPI's: omzet, marges, openstaande facturen, ritten vandaag
- `explain_order` — Volledige order-timeline met alle events/stops
- `smart_order_entry` — Natuurlijke taal → order aanmaken (met bevestiging)
- `save_memory` — Gebruikersvoorkeuren onthouden (gebruikt `ai_user_memory` tabel)

**Intelligent Systeem Prompt** — specifiek voor transport/logistiek:
- Kent de TMS-structuur (orders, trips, stops, facturen, chauffeurs)
- Antwoordt in het Nederlands
- Geeft concrete data, niet vage tips
- Vraagt bevestiging voor mutaties (smart_order_entry)

**Credit Systeem** — gebruikt bestaande `deduct_ai_credits` DB-functie

**Conversation Persistence** — slaat berichten op in `chatgpt_messages` met tool_calls

### 2. `copilot` Edge Function — SSE Streaming
Dezelfde intelligentie maar met streaming (SSE) voor de Copilot sidebar. Ondersteunt dezelfde tools maar streamt tokens real-time.

### 3. Frontend Streaming voor ChatGPT
De huidige `useChatGPT` hook gebruikt `stream: false`. We upgraden naar SSE streaming zodat antwoorden token-voor-token verschijnen — professionelere UX.

## Bestanden

| Actie | Bestand |
|---|---|
| Nieuw | `supabase/functions/chatgpt/index.ts` — Hoofd AI met tool calling |
| Nieuw | `supabase/functions/copilot/index.ts` — SSE streaming copilot |
| Wijzig | `src/hooks/useChatGPT.ts` — SSE streaming support toevoegen |
| Wijzig | `src/components/chatgpt/ChatGPTPanel.tsx` — Streaming indicator |

## Technische Details

### Tool Calling Flow
```text
User: "Hoeveel orders staan er open deze week?"
    ↓
Edge Function: AI kiest tool `search_orders` met filters
    ↓
Tool: Query op `orders` tabel met status/datum filters
    ↓
AI: "Er staan 14 orders open deze week. 
     5 wachten op toewijzing, 9 zijn gepland.
     De oudste is order #ORD-2024-0847 van 3 dagen geleden."
```

### System Prompt (kern)
De AI krijgt een TMS-specifieke prompt die het volgende definieert:
- Rol: "Je bent de LogiFlow AI Co-Pilot voor transport management"
- Beschikbare tools en wanneer ze te gebruiken
- Antwoordstijl: concreet, met data, actiegericht
- Bevestigingsflow voor mutaties
- Tenant-isolatie (alleen data van het eigen bedrijf)

### Credit Deductie
Gebruikt de bestaande `deduct_ai_credits` Postgres functie. Simpele verzoeken kosten 1 credit, tool-calls 2 credits.

## Impact
- AI geeft **concrete antwoorden** met echte data uit de database
- Gebruiker kan orders zoeken, KPI's opvragen, chauffeurs checken — allemaal via chat
- Orders aanmaken via natuurlijke taal met bevestigingsstap
- Streaming voor vloeiende, professionele UX
- Memory voor gepersonaliseerde ervaring over sessies heen


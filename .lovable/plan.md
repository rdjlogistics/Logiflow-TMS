

# Plan: AI Functies Upgraden — Premium Skills & Image Generation

## Huidige Situatie

De `chatgpt` edge function heeft al 20+ tools (search_orders, margin_analysis, etc.) en tool-calling via Gemini 3 Flash. De `copilot` edge function is een simpele chat zonder tools. Geen image generation capabilities.

## Upgrades

### 1. Nieuwe Premium Tools toevoegen aan `chatgpt` edge function

**Nieuwe tools in `TMS_TOOLS` array:**

| Tool | Beschrijving | Type |
|---|---|---|
| `generate_chart` | AI genereert een beschrijving voor een visuele chart (omzet trend, marge vergelijking) — frontend rendert met Recharts | Intelligence |
| `web_search` | Zoek transportnieuws, regelgeving, marktprijzen via AI-samenvatting | Intelligence |
| `document_summary` | Vat een lang document/e-mail samen en extraheer actiepunten | Intelligence |
| `translate_message` | Vertaal berichten voor internationale chauffeurs/klanten | Intelligence |
| `generate_image` | Genereer afbeeldingen via Nano Banana 2 (bedrijfslogo's, route visualisaties, rapportage graphics) | Premium |
| `smart_planning` | Multi-order route optimalisatie — analyseer N orders en stel optimale volgorde + chauffeurs voor | Intelligence |
| `anomaly_detect` | Detecteer afwijkingen in KPIs (plotselinge margeverandering, ongewone factuurpatronen) | Intelligence |
| `draft_contract` | Genereer concept transportovereenkomst of offerte tekst | Mutation |

### 2. Image Generation met Nano Banana 2

In de `chatgpt` edge function:
- Tool `generate_image` roept de AI Gateway aan met model `google/gemini-3.1-flash-image-preview`
- Slaat gegenereerde afbeelding op in Supabase Storage bucket `ai-generated`
- Retourneert public URL die de frontend als inline image toont

### 3. Intelligent Model Routing upgraden

Huidige `detectComplexity` is basic. Upgrade naar:
- `"high"` complexity → `google/gemini-2.5-pro` (zwaar redeneren, rapportage, forecasts)
- `"medium"` → `google/gemini-3-flash-preview` (standaard tool-calling)
- `"low"` / `"none"` → `google/gemini-2.5-flash` (snelle lookups, simpele vragen)

Dit is hoe premium AI tools werken — intelligent routing per complexiteitsniveau.

### 4. Copilot Edge Function upgraden met tools

De `copilot` functie is nu een "domme" chat. Upgrade:
- Voeg een subset van tools toe (search_orders, get_kpis, daily_briefing, route_suggest)
- Tool-calling loop net als in chatgpt
- Maakt de Cmd+K copilot echt bruikbaar

### 5. Frontend: Image rendering in chat

Update `ChatGPTMessage.tsx` om gegenereerde afbeeldingen inline te tonen wanneer de response een `![image](url)` markdown bevat (al handled door ReactMarkdown, maar expliciete styling toevoegen).

### 6. Storage bucket aanmaken

Database migratie om `ai-generated` storage bucket te creëren voor opgeslagen AI-afbeeldingen.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/chatgpt/index.ts` | 8 nieuwe tools, intelligent model routing, image generation |
| `supabase/functions/copilot/index.ts` | Tool-calling loop + subset tools toevoegen |
| `src/components/chatgpt/ChatGPTMessage.tsx` | Image rendering styling |
| DB migratie | Storage bucket `ai-generated` aanmaken |


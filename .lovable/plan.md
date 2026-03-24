

# Plan: AI Van Basic Naar Krachtig — Differentiation Door Intelligentie

## Het Echte Probleem

Het model (`gemini-3-flash`) is al top-tier. Maar de huidige implementatie benut maar ~30% van de mogelijkheden. Iedereen kan een chatbot bouwen — het verschil zit in:

1. **Reasoning** — complexe vragen doordenken voordat je antwoordt
2. **Meer tools** — de AI kan nu maar 6 dingen, dat moeten er 15+ worden
3. **Multi-step chains** — de AI stopt nu na 1 tool call, zou 3-4 achter elkaar moeten doen
4. **Slimmere prompts** — meer domein-expertise inbakken

## Concrete Upgrades

### 1. Reasoning Inschakelen (Gratis — Zit Al In De Gateway)

De Lovable AI gateway ondersteunt een `reasoning` parameter. Bij complexe vragen (planning, analyse, forecasting) laat je het model eerst **nadenken** voordat het antwoordt. Dit maakt antwoorden drastisch beter.

```text
Simpele vraag: "hoeveel orders vandaag?" → geen reasoning
Complexe vraag: "welke chauffeur past het best bij deze 5 orders?" → reasoning: medium
Analyse vraag: "waarom is onze marge gedaald deze maand?" → reasoning: high
```

**Wijziging in `chatgpt/index.ts`**: Detecteer complexiteit van de vraag en voeg `reasoning: { effort: "medium" }` toe aan het request body voor complexe vragen.

### 2. Meer Tools Toevoegen (Grootste Impact)

Nu: 6 tools. Voeg toe:

| Tool | Wat het doet | Waarom krachtig |
|---|---|---|
| `margin_analysis` | Berekent marge per order/klant/route | "Welke klant kost me geld?" |
| `cashflow_forecast` | Voorspelt cashflow komende 30 dagen | Proactief financieel advies |
| `route_optimization` | Analyseert routes op efficiëntie | "Hoe kan ik 20% brandstof besparen?" |
| `customer_analysis` | Top klanten, churn risico, omzet trend | "Wie zijn mijn beste klanten?" |
| `driver_performance` | Vergelijk chauffeurs op KPIs | "Wie presteert het best?" |
| `invoice_status` | Openstaande facturen, betalingsgedrag | "Wie moet me nog betalen?" |
| `generate_report` | Genereer markdown rapport | Exporteerbare analyses |
| `compare_periods` | Vergelijk week/maand/kwartaal | "Gaat het beter of slechter?" |

### 3. Multi-Step Tool Chaining

Nu stopt de AI na 1 tool call. Upgrade: laat het model meerdere tools achter elkaar aanroepen. Voorbeeld:

```text
Gebruiker: "Geef me een compleet overzicht van vandaag"

Stap 1: get_kpis(period: "today") → orders, omzet, marges
Stap 2: search_orders(status: "in_transit") → actieve ritten
Stap 3: list_drivers(status: "available") → beschikbare chauffeurs
Stap 4: invoice_status() → openstaande facturen

→ Combineert alles tot 1 compleet dashboard-achtig antwoord
```

**Wijziging**: Na de eerste tool call, check of het model nóg een tool wil aanroepen. Loop maximaal 4 keer.

### 4. Prompt Engineering — TMS Expert

Het huidige prompt is generiek. Upgrade naar een domein-expert die:
- Proactief waarschuwt ("Je marge op klant X is 8%, dat is onder je benchmark van 15%")
- Vergelijkingen trekt ("Vorige maand had je 23% meer orders")
- Acties voorstelt ("Zal ik een herinnering sturen voor factuur X?")

## Bestanden Die Wijzigen

| Bestand | Wijziging |
|---|---|
| `supabase/functions/chatgpt/index.ts` | 1) Reasoning parameter toevoegen op basis van vraag-complexiteit. 2) Nieuwe tools: `margin_analysis`, `cashflow_forecast`, `customer_analysis`, `driver_performance`, `invoice_status`, `compare_periods`. 3) Multi-step tool loop (max 4 iteraties). 4) Verbeterd system prompt met domein-expertise. |
| `supabase/functions/copilot/index.ts` | Reasoning parameter toevoegen voor complexere sidebar-vragen. |

## Wat Dit Oplevert

- **Reasoning**: AI denkt na bij complexe vragen → betere antwoorden, geen extra kosten
- **15+ tools**: AI kan véél meer dan alleen orders zoeken → echte business intelligence
- **Multi-step**: 1 vraag → compleet overzicht → dit heeft geen enkele concurrent
- **Expert prompt**: AI gedraagt zich als een ervaren planner/controller, niet als een chatbot

## Geen Wijzigingen Aan
- Frontend (tools worden automatisch ontdekt door het model)
- Credit systeem (tool calls = 2 credits, ongeacht hoeveel tools)
- Database schema (queries gebruiken bestaande tabellen)


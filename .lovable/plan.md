

# Plan: AI Assistent → Elite Class Logistics Command Center

## Huidige Staat
De AI heeft **13 tools** waarvan 12 read-only (zoeken, analyseren, vergelijken) en slechts **1 mutatie** (smart_order_entry). Geen echte actie-kracht — je kunt het TMS niet besturen via de AI.

## Doel
Transformeer de AI van een "vraag & antwoord bot" naar een **operationele command center** die daadwerkelijk taken uitvoert in het TMS — vergelijkbaar met hoe Claude Code een project bestuurt.

## Nieuwe Tools (10 stuks)

### Mutatie-Tools (acties uitvoeren)
| Tool | Wat het doet | Bevestiging? |
|---|---|---|
| `assign_driver_to_order` | Wijs chauffeur toe aan een order | ✅ Ja |
| `update_order_status` | Wijzig orderstatus (draft→confirmed→in_transit→delivered) | ✅ Ja |
| `create_invoice_for_order` | Genereer factuur voor afgeleverde order | ✅ Ja |
| `send_customer_email` | Stuur professionele e-mail naar klant (statusupdate, offerte, etc.) | ✅ Ja |
| `bulk_update_orders` | Bulk-statuswijziging voor meerdere orders tegelijk | ✅ Ja |
| `create_claim_case` | Maak een schadeclaim aan voor een order | ✅ Ja |

### Intelligente Analyse-Tools
| Tool | Wat het doet |
|---|---|
| `fleet_overview` | Real-time vlootoverzicht: voertuigen, locaties, beschikbaarheid, onderhoud |
| `route_suggest` | Stel optimale chauffeur voor op basis van locatie, beschikbaarheid en rating |
| `daily_briefing` | Automatische dagelijkse briefing: wat staat er vandaag gepland, risico's, openstaand |
| `generate_report` | Genereer markdown-rapport (week/maand) met KPIs, trends en aanbevelingen |

## System Prompt Upgrade

Nieuwe prompt die de AI instrueert als **Senior Transport Controller** met:
- **Proactief gedrag**: Waarschuw bij risico's zonder dat de gebruiker vraagt
- **Multi-step planning**: Combineer tools automatisch (bijv. "plan morgen" → daily_briefing + route_suggest + assign_driver)
- **Actionable output**: Eindig altijd met concrete volgende stappen
- **Confirmation UX**: Bij mutaties, toon een rich preview card met alle details vóór uitvoering

## Tool Loop Upgrade

- **Max iterations**: 4 → 6 (voor complexe multi-step workflows)
- **Chain awareness**: System prompt instrueert het model om tools te combineren (bijv. search_orders → margin_analysis → generate_report)

## Quick Actions Update

Nieuwe quick actions die de kracht van de AI tonen:
- "Briefing van vandaag" (daily_briefing)
- "Wijs chauffeurs toe aan open orders" (route_suggest + assign)
- "Genereer weekrapport" (generate_report)
- "Factureer alle afgeleverde orders" (bulk)
- "Vlootoverzicht nu" (fleet_overview)
- "Stuur statusupdate naar klant X" (send_email)

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `supabase/functions/chatgpt/index.ts` | +10 tools, upgraded system prompt, tool loop 6 iteraties, confirmation flow voor alle mutaties |
| `src/components/chatgpt/ChatGPTPanel.tsx` | Nieuwe quick actions, verbeterde empty state met "capabilities" showcase |
| `src/components/chatgpt/ChatGPTActionCard.tsx` | Rich confirmation cards voor alle mutatie-types (driver assign, status change, invoice, email) |
| `src/hooks/useChatGPT.ts` | Uitgebreide confirmAction voor alle nieuwe tool types |

## Veiligheid

- **Alle mutaties vereisen bevestiging** — de AI kan nooit zelfstandig data wijzigen
- **Tenant-isolatie** op elke query (company_id check)
- **Audit trail** — elke AI-mutatie wordt gelogd in order_events
- **Credit kosten**: Read-tools = 1 credit, Mutatie-tools = 2 credits, Rapporten = 3 credits


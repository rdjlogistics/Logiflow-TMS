

# Meer Complexity Patterns toevoegen aan Copilot Routing

## Huidige staat

`detectComplexity()` in `supabase/functions/chatgpt/index.ts` (line 492-501) bevat al 3 niveaus met regex patterns. Sommige relevante termen ontbreken.

## Toe te voegen patterns

### HIGH (→ gemini-2.5-pro)
Toevoegen: `prognose`, `seizoen`, `benchmark`, `scenario`, `impact.*analyse`, `wat.*als`, `kosten.*baten`, `rendement`, `winstgevend`, `capaciteit.*plan`, `demand.*plan`, `bottleneck`, `knelpunt`

### MEDIUM (→ gemini-3-flash-preview)  
Toevoegen: `verdeling`, `spreiding`, `bezetting`, `efficiëntie`, `productiviteit`, `omzet.*per`, `gemiddeld`, `mediaan`, `histogram`, `vergelijk`, `benchmark.*chauffeur`, `levertijd.*analyse`, `klacht.*analyse`

### LOW (→ gemini-2.5-flash)
Toevoegen: `wanneer`, `waar.*is`, `laatste`, `volgende`, `planning.*vandaag`, `wie.*rijdt`

## Bestand

| Actie | Bestand |
|-------|---------|
| **Edit** | `supabase/functions/chatgpt/index.ts` line 494-498 — regex patterns uitbreiden |


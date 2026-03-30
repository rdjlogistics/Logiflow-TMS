

# AI Gebruik per Gebruiker — Tab toevoegen aan bestaande AIUsage pagina

## Aanpak

De bestaande `/admin/ai-usage` pagina heeft al credit-overzichten en charts. We voegen een **"Per Gebruiker" sectie** toe onderaan (of als tab) die een tabel toont met per gebruiker: naam, model-verdeling, totale credits, aantal requests.

## Data

De `ai_credit_transactions` tabel bevat alles wat we nodig hebben:
- `user_id` — koppelen aan `profiles` voor naam
- `model_used` — welk AI model
- `credits_used` — kosten
- `action_type` — type actie
- `intent_complexity` — complexiteitsniveau

## Plan

### 1. Nieuw component: `AIUsagePerUser.tsx`

- Query `ai_credit_transactions` gejoined met `profiles(full_name, email)` voor laatste 30 dagen
- Groepeer client-side per user: totaal credits, totaal requests, meest gebruikte model
- Toon als tabel met kolommen: **Gebruiker | Model (meest gebruikt) | Credits | Requests | Laatste activiteit**
- Klikbaar voor detail-breakdown per model per gebruiker
- Sorteerbaar op credits/requests

### 2. Edit: `AIUsage.tsx`

- Importeer en render `AIUsagePerUser` als nieuwe sectie onder de bestaande "Top Acties" card

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Create** | `src/components/admin/AIUsagePerUser.tsx` |
| **Edit** | `src/pages/admin/AIUsage.tsx` — sectie toevoegen |


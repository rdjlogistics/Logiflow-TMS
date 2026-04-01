

# Audit Resultaat — 2 Ontbrekende Edge Functions

## Methode

Alle 65+ edge functions vergeleken met alle `supabase.functions.invoke()` aanroepen in de frontend. Alle "binnenkort" labels gecontroleerd. Alle disabled knoppen gecontroleerd.

---

## Status Eerder Gefixte Items ✅

Alles uit vorige audits is correct geïmplementeerd en draait:
- ✅ `voice-assistant`, `proactive-alerts`, `send-order-rejection`, `send-customer-notification` — aangemaakt
- ✅ `send-delivery-confirmation` — param mismatch gefixed
- ✅ `webauthn-auth` — volledig geïmplementeerd
- ✅ RouteOptimization opslaan + chauffeur toewijzen — werkend
- ✅ B2C 2FA via MFA — werkend
- ✅ Geo-polygon editor — werkend
- ✅ Ecommerce berichten opgeschoond
- ✅ DataQuality + MomentsEngine — dynamische data
- ✅ Alle "binnenkort" labels zijn nu alleen nog bij legitieme contexten (documentvervaldatums, sessie-warnings)

---

## 2 Resterende Ontbrekende Edge Functions

### Bug 1: `freight-matching` bestaat niet
**Aangeroepen door**: `src/hooks/useFreightMarketplace.ts` regel 368
**Impact**: "AI Matching" knop op de Freight Marketplace crasht silently
**Fix**: Maak `supabase/functions/freight-matching/index.ts` — gebruikt Gemini AI om listings te matchen op basis van route, gewicht, voertuigtype en beschikbaarheid

### Bug 2: `send-push-notification-to-planners` bestaat niet
**Aangeroepen door**: `src/components/driver/StopDocumentUpload.tsx` regel 111
**Impact**: Wanneer een chauffeur een document uploadt bij een stop, krijgen planners geen notificatie (fire-and-forget, dus geen crash, maar functionaliteit ontbreekt)
**Fix**: Maak `supabase/functions/send-push-notification-to-planners/index.ts` — verstuurt web push notificaties naar alle gebruikers met rol `planner` of `admin` van dezelfde tenant

---

## Plan van Aanpak

| # | Fix | Bestand | Ernst |
|---|-----|---------|-------|
| 1 | Maak `freight-matching` edge function | **Nieuw**: `supabase/functions/freight-matching/index.ts` | Kritiek |
| 2 | Maak `send-push-notification-to-planners` edge function | **Nieuw**: `supabase/functions/send-push-notification-to-planners/index.ts` | Middel |

### Details

**`freight-matching`**: Haalt de listing op, zoekt naar carriers/drivers met matching voertuigtype en beschikbaarheid, slaat matches op in `freight_matches` tabel en retourneert `{ matchesFound: number }`.

**`send-push-notification-to-planners`**: Zoekt alle users met rol `planner` of `admin` in dezelfde tenant, haalt hun `push_subscriptions` op, en verstuurt web push notificaties via de VAPID keys.


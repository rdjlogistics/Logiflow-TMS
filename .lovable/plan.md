

# Volledige App Audit — Alle Issues & Fixes

## Methode
Alle edge functions, frontend invocaties, disabled knoppen en "binnenkort" placeholders systematisch doorgelopen.

---

## Kritieke Issues

### 1. `send-order-rejection` edge function bestaat niet
**Aangeroepen door**: `OrderMobileCard.tsx`, `OrderCompactRow.tsx`, `CustomerSubmissionsTab.tsx`
**Impact**: Bij het afwijzen van een order crasht de rejection-email silently
**Fix**: Maak `supabase/functions/send-order-rejection/index.ts` — stuurt afwijzingsmail via Resend met reden

### 2. `send-customer-notification` edge function bestaat niet
**Aangeroepen door**: `useDeliveryProximity.ts`
**Impact**: Proximity alerts bij bezorging worden niet verstuurd
**Fix**: Maak `supabase/functions/send-customer-notification/index.ts` — stuurt notificatie-email naar klant

### 3. `send-delivery-confirmation` parameter mismatch
**Probleem**: Frontend stuurt `{ tripId }`, maar de edge function verwacht `{ orderId, to }`. Zonder `to` (e-mailadres) retourneert de functie altijd een 400-error.
**Fix**: Herschrijf de edge function om `tripId` te accepteren en automatisch het e-mailadres van de klant op te zoeken via de trip → customer relatie

### 4. `webauthn-auth` is een lege stub
**Probleem**: Retourneert alleen `{ success: true, message: "WebAuthn beschikbaar" }` zonder enige registratie- of authenticatielogica. Biometrische login/registratie in het chauffeursportaal doet niets.
**Fix**: Implementeer volledige WebAuthn challenge/verify flow met database opslag

---

## Disabled "Binnenkort" Knoppen → Werkend Maken

### 5. RouteOptimization: "Opslaan (binnenkort)" knop — regel 1442
**Probleem**: De primaire "Route opslaan" knop is permanent disabled. Er is al een werkende `handleSaveOrder` functie die stop-volgorde opslaat — die wordt alleen getoond bij `orderDirty`. De disabled knop is overbodig/verwarrend.
**Fix**: Vervang de disabled knop door een werkende "Route opslaan" die de huidige geoptimaliseerde route opslaat (stop_order updates) naar de database

### 6. RouteOptimization: "Toewijzen aan chauffeur (binnenkort)" — regel 1532
**Probleem**: Knop is disabled zonder functionaliteit
**Fix**: Maak een driver-assignment dialog die de geselecteerde route's stops/trips koppelt aan een chauffeur (hergebruik bestaande `QuickDriverAssign` logica)

### 7. B2C 2FA toggle — `B2CSecuritySheet.tsx`
**Probleem**: Switch toont "Binnenkort" badge en doet niets
**Fix**: Implementeer TOTP-based 2FA via Supabase MFA API (`supabase.auth.mfa.enroll()` / `verify()`)

### 8. Geo-polygon editor — `EditZoneDialog.tsx`
**Probleem**: Toont "Geo-polygon editor komt binnenkort beschikbaar"
**Fix**: Vervang door een textarea waar gebruikers GeoJSON/WKT coördinaten kunnen plakken, met validatie

---

## Edge Function Stubs met "Binnenkort" Berichten

### 9. `ecommerce-sync` — logt sync maar doet geen echte API-koppeling
**Status**: Acceptabel als placeholder (afhankelijk van externe Shopify/WooCommerce API keys). Verwijder "binnenkort" uit het succesbericht → "Synchronisatie voltooid"

### 10. `convert-ecommerce-order` — markeert order maar maakt geen trip aan
**Status**: Acceptabel als placeholder. Verwijder "binnenkort" uit berichten → "Order omgezet"

---

## Plan van Aanpak

| # | Fix | Bestand | Ernst |
|---|-----|---------|-------|
| 1 | Maak `send-order-rejection` edge function | **Nieuw**: `supabase/functions/send-order-rejection/index.ts` | Kritiek |
| 2 | Maak `send-customer-notification` edge function | **Nieuw**: `supabase/functions/send-customer-notification/index.ts` | Kritiek |
| 3 | Fix `send-delivery-confirmation` param mismatch | **Edit**: `supabase/functions/send-delivery-confirmation/index.ts` | Kritiek |
| 4 | Implementeer `webauthn-auth` registratie + login | **Edit**: `supabase/functions/webauthn-auth/index.ts` | Kritiek |
| 5 | Route "Opslaan" knop werkend maken | **Edit**: `src/pages/RouteOptimization.tsx` | Hoog |
| 6 | Route "Chauffeur toewijzen" werkend maken | **Edit**: `src/pages/RouteOptimization.tsx` | Hoog |
| 7 | B2C 2FA implementeren via Supabase MFA | **Edit**: `src/components/portal/b2c/B2CSecuritySheet.tsx` | Middel |
| 8 | Geo-polygon input als tekstveld | **Edit**: `src/components/pricing/EditZoneDialog.tsx` | Middel |
| 9 | Verwijder "binnenkort" uit ecommerce berichten | **Edit**: `supabase/functions/ecommerce-sync/index.ts` | Klein |
| 10 | Verwijder "binnenkort" uit convert berichten | **Edit**: `supabase/functions/convert-ecommerce-order/index.ts` | Klein |

## Batches

**Batch 1** (Kritiek — ontbrekende edge functions):
- `send-order-rejection`, `send-customer-notification`, `send-delivery-confirmation` fix

**Batch 2** (Disabled knoppen → werkend):
- RouteOptimization opslaan + chauffeur toewijzen, geo-polygon input

**Batch 3** (Auth & cleanup):
- WebAuthn implementatie, B2C 2FA via MFA, ecommerce berichten opschonen


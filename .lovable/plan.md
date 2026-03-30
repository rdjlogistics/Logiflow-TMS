

# Fix: Plan Inconsistentie, Upgrade "undefined", en Feature Iconen

## Diagnose

### Probleem 1 — FEATURE_LABELS mismatch (de ECHTE oorzaak van het X-icoon probleem)
`SubscriptionTab.tsx` (line 27-38) gebruikt **oude feature keys**: `invoicing`, `route_optimization`, `api_access`, `priority_support`, `custom_branding`, `multi_depot`, `advanced_analytics`, `ai_copilot`, `carrier_portal`, `customer_portal`.

De database `features_json` gebruikt **andere keys**: `basic_invoicing`, `route_optimalisatie`, `order_management`, `digital_pod`, `cmr_generation`, `live_tracking`, `basic_crm`, `basic_kpi`, `chauffeurs_app`, `multi_stop`, `ai_dispatch`, `klanten_portaal`, `marge_analyse`, etc.

Resultaat: `Boolean(featuresJson['invoicing'])` = `false` voor ALLE features → alles krijgt een X-icoon.

### Probleem 2 — "TMS Pro" hardcoded
`AppSidebar.tsx` line 440: `<p>TMS Pro</p>` is hardcoded i.p.v. het werkelijke plan.

### Probleem 3 — CreditBadge toont "Starter Plan"
`CreditBadge.tsx` line 15-18: fallback is `'starter'` en `500` als er geen AI subscription data is. Dit is het **AI credits** plan (apart van het TMS plan), maar het label is verwarrend.

### Probleem 4 — "undefined" op upgrade pagina
De `UpgradePricingTab.tsx` code op lines 92-94 ziet er correct uit — het haalt `plan.max_users` etc. uit de database query. De "undefined" verschijnt waarschijnlijk alleen als de data nog aan het laden is. Maar de `PricingPage.tsx` (line 300-311) doet het WEL correct. Ik moet verifiëren of `UpgradePricingTab` ook correct rendert.

## Fixes

### 1. Fix FEATURE_LABELS in SubscriptionTab.tsx
Vervang de 10 oude feature keys door de echte keys uit de database. Gebruik dezelfde labels als in `PricingPage.tsx` FEATURE_CATEGORIES:

```typescript
const FEATURE_LABELS: Record<string, string> = {
  order_management: 'Orderbeheer',
  digital_pod: 'Digitale POD',
  cmr_generation: 'CMR / Vrachtbrief',
  live_tracking: 'Live Tracking',
  basic_invoicing: 'Facturatie',
  basic_crm: 'CRM',
  basic_kpi: 'KPI Dashboard',
  chauffeurs_app: 'Chauffeurs App',
  multi_stop: 'Multi-stop Orders',
  ai_dispatch: 'AI Dispatch',
  route_optimalisatie: 'Route Optimalisatie',
  dienstplanning: 'Dienstplanning',
  proactive_alerts: 'Proactieve Alerts',
  sla_monitoring: 'SLA Monitoring',
  debiteurenbeheer: 'Debiteurenbeheer',
  inkoopfacturatie: 'Inkoopfacturatie',
  creditnotas: "Creditnota's",
  marge_analyse: 'Marge Analyse',
  cashflow_dashboard: 'Cashflow Dashboard',
  bank_reconciliatie: 'Bank Reconciliatie',
  boekhouding_koppeling: 'Boekhouding Koppeling',
  klanten_portaal: 'Klanten Portaal',
  rate_contracts: 'Tariefcontracten',
  tendering: 'Tendering / Charter',
  smart_ocr: 'Smart OCR',
  wms: 'WMS / Magazijn',
  ecommerce: 'E-commerce',
  exception_management: 'Exception Management',
  multi_vestiging: 'Multi-vestiging',
  vervoerders_netwerk: 'Vervoerdersnetwerk',
  whatsapp_chat: 'WhatsApp Chat',
  push_notifications: 'Push Notificaties',
  ubl_export: 'UBL Export',
  fleet_advanced: 'Fleet Management',
  api_access: 'API Toegang',
  white_label: 'White Label',
};
```

Dit fixt zowel de X-iconen (nu matchen de keys) als de `UpgradePricingTab.tsx` feature labels (die dezelfde oude keys gebruiken op line 97-108).

### 2. Fix "TMS Pro" → toon plan naam
**File:** `AppSidebar.tsx` line 440

Vervang `TMS Pro` door de werkelijke plan naam uit `useSubscriptionPlan`:
```typescript
const { plan: currentPlan, isTrialing, trialDaysLeft } = useSubscriptionPlan();
// ...
<p className="text-[10px] text-sidebar-foreground/40">
  {currentPlan?.name || 'TMS'}{isTrialing && trialDaysLeft > 0 ? ` · Trial ${trialDaysLeft}d` : ''}
</p>
```

### 3. Fix CreditBadge — gebruik "AI Credits" label i.p.v. plan naam
**File:** `CreditBadge.tsx` line 18

Het label "Starter Plan" is misleidend. Verander naar:
```typescript
const planLabel = 'AI Credits';
```
Of als er een AI plan is: toon de AI plan naam, niet het TMS plan.

### 4. Fix UpgradePricingTab feature labels
**File:** `UpgradePricingTab.tsx` lines 97-108

Zelfde fix als SubscriptionTab: vervang oude feature keys door de echte database keys.

## Bestanden

| Actie | Bestand |
|-------|--------|
| **Edit** | `src/components/settings/SubscriptionTab.tsx` — FEATURE_LABELS vervangen door correcte keys |
| **Edit** | `src/components/settings/UpgradePricingTab.tsx` — featureLabels in getFeatureList vervangen |
| **Edit** | `src/components/layout/AppSidebar.tsx` — "TMS Pro" → plan naam |
| **Edit** | `src/components/chatgpt/CreditBadge.tsx` — Label "AI Credits" i.p.v. misleidend plan label |


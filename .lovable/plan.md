

# Hardcoded & Demo Data Verwijderen — Volledige Analyse

## Probleem

Nieuwe accounts zien nep-data op diverse pagina's. Het vorige plan was goedgekeurd maar nooit uitgevoerd. Hieronder de volledige, bijgewerkte lijst.

---

## 12 bestanden met hardcoded data

| # | Bestand | Wat | Ernst |
|---|---------|-----|-------|
| 1 | `src/pages/enterprise/AIPlanView.tsx` | `demoPlanRevisions` — 3 fake plan-revisies (ORD-2024-008 etc.) | Hoog |
| 2 | `src/pages/enterprise/DataQuality.tsx` | `demoDuplicates` — 3 fake duplicaten als fallback | Hoog |
| 3 | `src/pages/enterprise/AIRecommendations.tsx` | `demoRecommendations` — 3 fake AI-aanbevelingen als fallback | Hoog |
| 4 | `src/pages/integrations/EDIIntegration.tsx` | `mockMessages` — 5 fake EDI-berichten (HEMA, Bol.com etc.) | Hoog |
| 5 | `src/pages/integrations/CustomsNCTS.tsx` | `mockDeclarations` — 4 fake douaneaangiftes | Hoog |
| 6 | `src/components/portal/b2c/B2CPaymentSheet.tsx` | `demoPaymentMethods` — fake iDEAL + Visa | Middel |
| 7 | `src/pages/RouteOptimization.tsx` | `demoStops` — 8 fake adressen als fallback | Hoog |
| 8 | `src/components/wms/WMSWarehouseMap.tsx` | `generateDemoZones()` — 8 fake warehouse zones | Middel |
| 9 | `src/components/wms/WMSActivityFeed.tsx` | `generateDemoActivities()` — 6 fake activiteiten | Middel |
| 10 | `src/hooks/useFuelStations.ts` | `generateMockStations()` — random fake tankstations | Middel |
| 11 | `src/pages/ai/WhatIfSimulation.tsx` | `mockScenarios` — 3 fake simulatie-scenario's | Middel |
| 12 | `src/components/enterprise/LogDetailDialog.tsx` | `mockRequestDetails` — fake request/response body | Laag |

---

## Aanpak per bestand

**Stap 1 — Enterprise pagina's** (3 bestanden):
- `AIPlanView.tsx`: Verwijder `demoPlanRevisions`, start met `[]`. Toon lege-staat: "Nog geen planwijzigingen vandaag"
- `DataQuality.tsx`: Verwijder `demoDuplicates` fallback. Toon lege-staat als er geen DB-duplicaten zijn
- `AIRecommendations.tsx`: Verwijder `demoRecommendations` fallback. Toon lege-staat: "Nog geen aanbevelingen"

**Stap 2 — Integratie pagina's** (2 bestanden):
- `EDIIntegration.tsx`: Vervang `mockMessages` door `[]`. Toon "Nog geen EDI-berichten ontvangen"
- `CustomsNCTS.tsx`: Vervang `mockDeclarations` door `[]`. Toon "Nog geen douaneaangiftes"

**Stap 3 — Route & Portaal** (2 bestanden):
- `RouteOptimization.tsx`: Vervang `demoStops` fallback door `[]`. Toon instructie "Voeg stops toe"
- `B2CPaymentSheet.tsx`: Vervang `demoPaymentMethods` door `[]`. Toont al lege-staat

**Stap 4 — WMS & Fuel** (3 bestanden):
- `WMSWarehouseMap.tsx`: `generateDemoZones()` retourneert `[]`
- `WMSActivityFeed.tsx`: `generateDemoActivities()` retourneert `[]`
- `useFuelStations.ts`: Verwijder `generateMockStations()` en `generateLocalMockStations()`. Return lege array bij API-fout

**Stap 5 — AI & Logs** (2 bestanden):
- `WhatIfSimulation.tsx`: Vervang `mockScenarios` door `[]`. Toon "Maak je eerste simulatie"
- `LogDetailDialog.tsx`: Vervang hardcoded request body door daadwerkelijke log data (of "Geen details beschikbaar")

---

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/pages/enterprise/AIPlanView.tsx` |
| **Edit** | `src/pages/enterprise/DataQuality.tsx` |
| **Edit** | `src/pages/enterprise/AIRecommendations.tsx` |
| **Edit** | `src/pages/integrations/EDIIntegration.tsx` |
| **Edit** | `src/pages/integrations/CustomsNCTS.tsx` |
| **Edit** | `src/components/portal/b2c/B2CPaymentSheet.tsx` |
| **Edit** | `src/pages/RouteOptimization.tsx` |
| **Edit** | `src/components/wms/WMSWarehouseMap.tsx` |
| **Edit** | `src/components/wms/WMSActivityFeed.tsx` |
| **Edit** | `src/hooks/useFuelStations.ts` |
| **Edit** | `src/pages/ai/WhatIfSimulation.tsx` |
| **Edit** | `src/components/enterprise/LogDetailDialog.tsx` |

## Resultaat

Elke nieuwe account start volledig schoon — geen nep-orders, nep-klanten, nep-berichten of nep-scenario's. Alle pagina's tonen een passende lege-staat met instructies.


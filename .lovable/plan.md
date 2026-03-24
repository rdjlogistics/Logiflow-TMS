

# Plan: Productie-Afwerking — Resterende Issues Fixen

## Status van de Audit

De meeste kritieke issues uit de audit zijn **al opgelost**:
- ✅ Alle demo data/navigaties verwijderd (DEMO_CUSTOMER_ID, DEMO_ACCOUNTS, `/demo` routes, demoJobs/demoIncidents)
- ✅ Nep-knoppen: RouteOptimization knoppen zijn `disabled` met tooltip, Rosters/Constraints navigeren naar echte pagina's
- ✅ Auth.tsx console.logs opgeruimd
- ✅ AIAutoDispatchPanel catch heeft `console.error` (niet leeg)

## Wat nog openstaat

### 1. Console.log opruimen (100+ statements)
Vervang alle `console.log` in productie-code door `logger` uit `src/lib/logger.ts` (die alleen in DEV logt). Belangrijkste bestanden:
- `useGeocodeBackfill.ts` (5x)
- `usePushNotifications.ts` (6x)
- `useFuelStations.ts` (3x)
- `useDriverDocumentUpload.ts` (1x)
- `useDeliveryProximity.ts` (1x)
- `useSubmissionNotifications.ts` (1x)
- `RouteOptimization.tsx` (1x)
- `PushNotificationPrompt.tsx` (1x)
- `StepAccount.tsx` (1x)
- `FuelStationsMapbox.tsx` (1x — al in DEV check, maar inconsistent)

### 2. Empty catch-blokken voorzien van logging
Acceptabele lege catches (JSON parse, localStorage, audio play) laten we staan — die zijn bedoeld als stille fallbacks. Maar deze krijgen `logger.warn`:
- `NotificationCenter.tsx:48` — localStorage parse fail
- `NotificationCenter.tsx:75` — audio play fail

### 3. InvoiceDetail window.print() verbeteren
Regel 370: `onClick={() => window.print()}` print de hele pagina inclusief sidebar. Fix: gebruik de bestaande `PrintButton` component met `targetSelector` zodat alleen het factuurgedeelte geprint wordt.

### 4. useDriverPortalData stub-functies
`markAlertRead` en `dismissAlert` zijn no-ops. Implementeer client-side state management zodat alerts daadwerkelijk als gelezen gemarkeerd/verborgen worden (in-memory, geen DB nodig).

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/hooks/useGeocodeBackfill.ts` | `console.log` → `logger.log` |
| `src/hooks/usePushNotifications.ts` | `console.log` → `logger.log` |
| `src/hooks/useFuelStations.ts` | `console.log` → `logger.log` |
| `src/hooks/useDriverDocumentUpload.ts` | `console.log` → `logger.log` |
| `src/hooks/useDeliveryProximity.ts` | `console.log` → `logger.log` |
| `src/hooks/useSubmissionNotifications.ts` | `console.log` → `logger.log` |
| `src/hooks/useRouteOptimizationStops.ts` | `console.log` → `logger.log` |
| `src/hooks/useDriverPortalData.ts` | Implementeer markAlertRead/dismissAlert |
| `src/pages/RouteOptimization.tsx` | `console.log` → `logger.log` |
| `src/pages/InvoiceDetail.tsx` | `window.print()` → `PrintButton` met selector |
| `src/components/notifications/NotificationCenter.tsx` | Lege catches → `logger.warn` |
| `src/components/driver-portal/PushNotificationPrompt.tsx` | `console.log` → `logger.log` |
| `src/components/driver-onboarding/steps/StepAccount.tsx` | `console.log` → `logger.log` |
| `src/components/fuel-stations/FuelStationsMapbox.tsx` | Consistent DEV check |


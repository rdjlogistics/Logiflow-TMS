

# Verwijder de Trips pagina

## Waarom

De `/trips` pagina is een apart rittenoverz dat overlapt met het orderoverzicht (`/orders`). De gebruiker wil dit samenvoegen door de trips-pagina te verwijderen.

## Wijzigingen

| # | Bestand | Actie |
|---|---------|-------|
| 1 | `src/App.tsx` | Route `/trips` wijzigen naar `<Navigate to="/orders" replace />` (redirect zodat eventuele bookmarks blijven werken) + verwijder de `Trips` lazy import |
| 2 | `src/pages/Trips.tsx` | Bestand verwijderen |
| 3 | `src/components/layout/MobileBottomNav.tsx` | "Ritten" tab verwijderen uit `tabs` array + verwijder `Route` import + update `getActiveTab` (verwijder trips check). Grid wordt `grid-cols-4` |
| 4 | `src/components/dashboard/widgets/QuickLinksWidget.tsx` | Link "Ritten" → `/trips` wijzigen naar `/orders` |
| 5 | `src/components/dashboard/RecentActivityFeed.tsx` | `link: "/trips"` → `link: "/orders"` |
| 6 | `src/components/dashboard/ActionQueue.tsx` | `Link to="/trips"` → `Link to="/orders"`, label "Bekijk ritten" → "Bekijk orders" |
| 7 | `src/pages/finance/CashflowCockpit.tsx` | SelectItem `/trips` verwijderen of wijzigen naar `/orders` |

### Gerelateerde bestanden die NIET geraakt worden
- `src/components/trips/` — Deze componenten worden gebruikt door het carrier portal en andere flows, niet alleen door de trips pagina
- `src/hooks/useCarrierTrips.ts` — Carrier-specifiek, blijft bestaan

## Resultaat
- `/trips` redirect naar `/orders`
- Bottom nav heeft 4 items in plaats van 5
- Alle links in de app verwijzen naar `/orders` in plaats van `/trips`


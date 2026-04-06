

# Dode Routes & Orphan Files Opschonen

## Bevindingen

Na een grondige audit van alle 121 routes, 130+ sidebar-links en alle pagina-bestanden is de app **al behoorlijk schoon**. Er zijn slechts **3 orphan-bestanden** en **1 sidebar-duplicaat** gevonden.

### Te verwijderen bestanden

| # | Bestand | Reden |
|---|---------|-------|
| 1 | `src/pages/Loading.tsx` | Nergens geïmporteerd — vervangen door `PageLoadingSkeleton` en `AuthLoader` in App.tsx |
| 2 | `src/pages/operations/AIDispatch.tsx` | Duplicaat van `src/pages/ai/AutoDispatch.tsx` — geen enkele import |
| 3 | `src/pages/wms/index.ts` | Barrel export die nergens gebruikt wordt — App.tsx importeert elke WMS-pagina direct |

### Sidebar fix

| # | Probleem | Fix |
|---|----------|-----|
| 4 | "SLA Monitoring" en "System Health" in sidebar linken beide naar `/enterprise/health` | Verwijder "System Health" duplicaat uit `analyticsItems` in `AppSidebar.tsx` |

## Wat NIET wordt aangepast (geen dubbel werk)

- **7 legacy redirects** (`/trips`, `/planning`, `/drivers`, `/sla`, etc.) — deze zijn bewust aanwezig voor backwards-compatibiliteit met bookmarks en e-mail-links
- **Carrier tab-bestanden** (`CarrierTripsTab.tsx`, etc.) — worden gebruikt door `CarrierPortal.tsx`
- **Collections.tsx / CreditDashboard.tsx** — worden geïmporteerd als tab-content in `Receivables.tsx`
- **Alle 121 actieve routes** — elk gekoppeld aan een bestaand pagina-bestand

## Stappen

1. Verwijder `src/pages/Loading.tsx`
2. Verwijder `src/pages/operations/AIDispatch.tsx` (houd `operations/DigitalPOD.tsx`)
3. Verwijder `src/pages/wms/index.ts`
4. Verwijder "System Health" duplicaat-entry uit `analyticsItems` in `AppSidebar.tsx`
5. Update memory file met opschoning

## Impact

- **3 bestanden minder** in de bundle
- **Geen functionele wijzigingen** — alle routes en navigatie blijven werken
- Schonere codebase voor launch


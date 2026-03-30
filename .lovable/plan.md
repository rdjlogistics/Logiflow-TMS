

# Verificatie Resultaten & Fix

## Wat CORRECT werkt

| Check | Status |
|-------|--------|
| Order opslaan — form + onSubmit + Supabase RPC | CORRECT — `save_order_with_stops` RPC at line 745 |
| Opslaan knop — loading state + toast + redirect | CORRECT — `setIsSubmitting`, feedback toast at line 820, navigation at 896 |
| `beforeunload` na save | CORRECT — `setIsDirty(false)` at line 851 disables `useUnsavedChangesWarning` |
| Datumveld DD-MM-YYYY | CORRECT — Popover+Calendar met `format(..., 'dd-MM-yyyy')` in OrderDetailsPanel en DestinationCard |
| Mapbox imports | CORRECT — dynamic `import("mapbox-gl")` met `.default`, geen `mapbox_gl_exports` errors |
| Mapbox token | CORRECT — via edge function `get-mapbox-token` |
| `mapbox_gl_exports` string | CLEAN — 0 resultaten |
| Hardcoded "37.0%" | CLEAN — 0 resultaten |
| Placeholder UUID in code | CLEAN — 0 resultaten (het UUID in edge function logs komt uit een bestaand DB record, niet uit code) |
| OrderOverview marge | CORRECT — weighted calculation from totals |
| QuickStatsHeader kleuren | CORRECT — dynamic based on positive/negative |
| `capitalizeCity` bij save | CORRECT — applied on pickup_city, delivery_city, and route_stops |

## Gevonden probleem

| Locatie | Probleem |
|---------|----------|
| `src/components/reporting/ReportingDashboard.tsx` line 235-236 | Nog steeds **simple average van opgeslagen `profit_margin_pct`** i.p.v. weighted berekening vanuit totals |

## Fix

### `src/components/reporting/ReportingDashboard.tsx` — 1 regel
Vervang:
```typescript
const avgMargin = totalOrders > 0
  ? ordersData.reduce((sum, o) => sum + (o.profit_margin_pct || 0), 0) / totalOrders
  : 0;
```
Door:
```typescript
const avgMargin = totalRevenue > 0
  ? (totalProfit / totalRevenue) * 100
  : 0;
```

Dit is de enige fix. Alle andere checks zijn correct.


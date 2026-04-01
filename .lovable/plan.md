

# Performance & Schaalbaarheidsplan — RDJ Logistics TMS

## Eerlijke Diagnose

De app heeft 100+ lazy-loaded pagina's, goede caching (staleTime 5min), een geconsolideerd dashboard (5 queries i.p.v. 12), en compound database indexes. Dat is een solide basis. Maar er zijn concrete bottlenecks die bij 50-500+ gelijktijdige gebruikers problemen gaan veroorzaken:

---

## Kritieke Issues

### 1. Dashboard laadt ALLE trips + invoices zonder tenant-filter
**Ernst**: Kritiek bij multi-tenant gebruik

`useDashboardData.ts` regel 112-116 doet:
- `invoices` → select ALL, limit 1000 (geen company_id filter)
- `trips` → select ALL van 6 maanden (geen company_id filter)
- `allTrips` → select ALL van 6 weken

Bij 10 bedrijven met elk 500 trips/maand = 30.000 rijen per dashboard load. Dit is de hoofdoorzaak van traagheid.

**Fix**: Voeg `company_id` filter toe aan alle 4 queries in `fetchDashboardData`. Gebruik de huidige user's company_id uit de auth context.

### 2. Trips service default limit = 5000
**Ernst**: Hoog

`src/services/trips.ts` regel 46: `query.limit(5000)` — dit stuurt potentieel megabytes aan data over het netwerk per page load.

**Fix**: Verlaag default naar 100, implementeer server-side pagination met cursor-based paging.

### 3. Geen server-side search — client-side filter op 5000 rijen
**Ernst**: Hoog

`src/services/trips.ts` regel 52-61: zoekfilter draait client-side na het ophalen van alle data. Bij 5000 trips is dit traag en verspilt bandbreedte.

**Fix**: Verplaats search naar Supabase met `.or()` en `ilike` filters.

### 4. Realtime subscriptions zonder cleanup throttle
**Ernst**: Middel

`useRealtimeSubscription.ts` doet `queryClient.setQueryData` bij elke DB change. Bij 50 gelijktijdige users die trips updaten = cascade van re-renders.

**Fix**: Debounce realtime updates met 500ms window — batch meerdere changes in één state update.

### 5. Dashboard auto-refresh elke 60s zonder visibility check
**Ernst**: Middel

`useDashboardData.ts` regel 251: `refetchInterval: 60 * 1000` — dit vuurt ook als de browser tab niet actief is, wat onnodige server load genereert.

**Fix**: Voeg `refetchIntervalInBackground: false` toe (React Query built-in optie).

---

## Concrete Wijzigingen

| # | Fix | Bestand | Impact |
|---|-----|---------|--------|
| 1 | Company_id filter op dashboard queries | `src/hooks/useDashboardData.ts` | Kritiek |
| 2 | Default trip limit 5000 → 100 + pagination | `src/services/trips.ts` | Hoog |
| 3 | Server-side search met ilike | `src/services/trips.ts` | Hoog |
| 4 | Debounce realtime updates (500ms) | `src/hooks/useRealtimeSubscription.ts` | Middel |
| 5 | Stop background refetching inactive tabs | `src/hooks/useDashboardData.ts` | Middel |
| 6 | Trips select: specifieke kolommen i.p.v. `*` | `src/services/trips.ts` | Middel |

### Detail per fix:

**Fix 1** — `useDashboardData.ts`:
- Accept `companyId` parameter
- Add `.eq('company_id', companyId)` to all 4 Supabase queries
- Add `refetchIntervalInBackground: false`

**Fix 2+3** — `src/services/trips.ts`:
- Change default limit from 5000 to 100
- Move search filter to server: replace client-side filter with `.or(`order_number.ilike.%${q}%,pickup_city.ilike.%${q}%,delivery_city.ilike.%${q}%`)`
- Return `{ data, count }` for pagination support

**Fix 4** — `useRealtimeSubscription.ts`:
- Add a 500ms debounce timer before calling `queryClient.setQueryData`
- Batch multiple rapid changes into one update

**Fix 5** — Already in fix 1 (`refetchIntervalInBackground: false`)

**Fix 6** — `src/services/trips.ts`:
- Replace `*` in TRIP_SELECT with explicit columns needed


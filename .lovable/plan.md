

# Performance & Schaalbaarheid — Volgende Stap

## Wat al gedaan is (goed)
- Dashboard queries: tenant-scoped met `company_id` filter ✅
- Trips service: limit 100, server-side search, expliciete kolommen ✅
- Realtime: 500ms debounce ✅
- Dashboard: `refetchIntervalInBackground: false` ✅
- Lazy loading: 100+ pagina's via `lazyWithRetry` ✅
- Vite: `manualChunks` voor vendor splitting ✅
- Database: 16 compound indexes ✅
- Dashboard: geconsolideerde RPC `get_dashboard_counts` ✅

## Wat nog open staat

### 1. HOOG: 6 andere polling hooks missen `refetchIntervalInBackground: false`
Elke hook met `refetchInterval` die GEEN `refetchIntervalInBackground: false` heeft, veroorzaakt onnodige server-calls als de tab niet actief is. Bij 200 gebruikers met elk 3-4 tabbladen open is dit een serieuze load multiplier.

**Bestanden:**
- `src/hooks/useClientErrorLogs.ts` — 2x (30s interval)
- `src/pages/EmailDashboard.tsx` — (10s interval!)
- `src/pages/CustomerTrackTrace.tsx` — (30s interval)
- `src/components/dispatch/DispatchDashboard.tsx` — (30s interval)
- `src/components/dispatch/DispatchChannelStatus.tsx` — (60s interval)
- `src/pages/enterprise/LiveBoard.tsx` — (30s interval)
- `src/pages/integrations/TelematicsIntegration.tsx` — (30s interval)

**Fix**: Voeg `refetchIntervalInBackground: false` toe aan alle 8 useQuery calls.

### 2. HOOG: 125 bestanden gebruiken `select('*')` — top-10 ergste cases
De meeste `select('*')` calls zijn op kleine tabellen (settings, plans) en niet erg. Maar er zijn high-traffic tabellen die te veel data sturen:

**Kritieke cases om te fixen:**
- `src/pages/Carriers.tsx` — 5x `select('*')` op carriers + carrier_contacts (kan 50+ kolommen zijn)
- `src/pages/Procurement.tsx` — `select('*')` op rfq_requests + rfq_offertes
- `src/hooks/useLearningSystemDB.ts` — `limit(200)` met `select('*')` op events

**Fix**: Vervang `select('*')` door expliciete kolommen op deze 3 high-traffic bestanden.

### 3. MIDDEL: Predictive dispatch laadt 500 historische trips
`src/hooks/usePredictiveDispatch.ts` doet `.limit(500)` op past trips voor driver matching. Dit is veel data die bij elke dispatch-opening wordt geladen.

**Fix**: Verlaag naar `.limit(50)` — de meest recente 50 trips per driver is genoeg voor patroonherkenning.

### 4. MIDDEL: Cloud instance sizing bewustzijn
Bij 50+ gelijktijdige gebruikers kan de database-instance de bottleneck worden, ongeacht code-optimalisaties. De huidige instance size moet geëvalueerd worden.

**Actie**: Adviseer de gebruiker over instance upgrade via Backend > Advanced Settings als de load toeneemt.

### 5. LAAG: Service Worker API cache te agressief
`vite.config.ts` cached Supabase API responses voor 5 minuten (`maxAgeSeconds: 300`). Dit kan stale data tonen na schrijf-operaties.

**Fix**: Verlaag `maxAgeSeconds` naar 30 en gebruik `StaleWhileRevalidate` i.p.v. `NetworkFirst` voor een betere balans.

---

## Concrete wijzigingen

| # | Fix | Bestanden | Impact |
|---|-----|-----------|--------|
| 1 | `refetchIntervalInBackground: false` op 8 polling hooks | 7 bestanden | Hoog |
| 2 | `select('*')` → expliciete kolommen op Carriers, Procurement, LearningSystem | 3 bestanden | Hoog |
| 3 | Predictive dispatch limit 500 → 50 | `usePredictiveDispatch.ts` | Middel |
| 4 | SW cache 300s → 30s + StaleWhileRevalidate | `vite.config.ts` | Laag |

Totaal: ~11 bestanden, geen database migraties nodig, geen breaking changes.


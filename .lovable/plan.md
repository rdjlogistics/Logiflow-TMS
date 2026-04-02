

# Performance & Schaalbaarheidsplan — Productie-klaar voor 1000+ gebruikers

## Diagnose

Na grondige audit van de codebase zijn er **7 kritieke performance bottlenecks** die de app langzaam maken onder belasting:

```text
┌─────────────────────────────────────────────────────────┐
│  CLIENT (browser)                                       │
│  ├─ Dashboard: 6 parallelle DB queries per pageload     │
│  ├─ 2 trips-queries ZONDER LIMIT → onbegrensd rows     │
│  ├─ useAllDriverLocations: polling + realtime + N+1     │
│  └─ 8+ componenten met eigen pollingInterval (15-60s)   │
│                                                         │
│  DATABASE (Supabase)                                    │
│  ├─ GEEN compound indexes op trips, invoices, etc.      │
│  ├─ RLS subqueries op elke rij (get_user_company)       │
│  └─ Unbounded selects zonder paginering                 │
└─────────────────────────────────────────────────────────┘
```

## Fixes (7 stappen, in volgorde van impact)

### 1. Database Indexes — Grootste impact, nul frontend-wijzigingen

**Migratie**: Compound indexes op de 5 zwaarst bevraagde tabellen.

```sql
-- trips: dashboard, orders, planning queries
CREATE INDEX IF NOT EXISTS idx_trips_company_status ON trips(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_company_date ON trips(company_id, trip_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_company_created ON trips(company_id, created_at DESC) WHERE deleted_at IS NULL;

-- invoices: finance, receivables, dashboard
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_company_due ON invoices(company_id, due_date) WHERE status != 'betaald';

-- route_stops: planning, delivery tracking
CREATE INDEX IF NOT EXISTS idx_route_stops_trip ON route_stops(trip_id, stop_order);

-- driver_locations: GPS tracking, fleet map
CREATE INDEX IF NOT EXISTS idx_driver_locations_recent ON driver_locations(driver_id, recorded_at DESC);

-- customers: klantenpagina
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

-- orders/submissions
CREATE INDEX IF NOT EXISTS idx_submissions_status ON customer_submissions(status, created_at DESC);
```

### 2. Dashboard Server-Side RPC — Elimineer 2 onbegrensde queries

**Nieuwe RPC functie**: `get_dashboard_ops` die alle trips-aggregatie server-side doet.

Momenteel haalt de dashboard **alle trips van 6 maanden** + **alle trips van 6 weken** op zonder limit. Bij 500 ritten/maand = 3000+ rijen per pageload.

**Bestand**: Nieuwe migratie
- Maak `get_dashboard_ops(p_company_id, p_month_start, p_six_months_ago)` RPC
- Retourneert: revenue per maand, trip status counts, weekly trips, ops stats — alles in 1 query
- Dashboard hook roept 3 RPCs aan i.p.v. 6 losse queries

**Bestand**: `src/hooks/useDashboardData.ts`
- Vervang de 2 unbounded `trips` selects door de nieuwe RPC
- Verwijder client-side aggregatie (maandelijkse revenue, status counts, weekly trips)

### 3. Trips Queries Limiteren — Alle pagina's

**Bestand**: `src/hooks/useDashboardData.ts`
- Voeg `.limit(500)` toe aan beide trips queries als tussenoplossing (vóór RPC migratie)
- `tripsData` (revenue chart): `.limit(500)` 
- `allTrips` (ops/status): `.limit(300)`

### 4. Driver Locations N+1 Fix

**Bestand**: `src/hooks/useAllDriverLocations.ts`
- Probleem: fetcht locaties → dan apart `profiles` → dan apart `drivers` = 3 queries
- Fix: Maak 1 RPC `get_driver_locations_with_names(p_max_age_minutes)` die een JOIN doet
- Verwijder de apart profiles/drivers lookups
- Verwijder dubbele polling (nu polling + realtime tegelijk — kies 1)

### 5. Polling Consolidatie — Verminder DB druk

Momenteel draaien er **8+ onafhankelijke polling-intervals** die elk elke 15-60 seconden de DB raken. Bij 100 gebruikers = 800+ queries/minuut alleen van polling.

**Wijzigingen**:
- `useDashboardData`: verhoog `refetchInterval` van 60s → 120s
- `useAllDriverLocations`: verwijder polling, gebruik alleen realtime channel
- `DispatchDashboard`, `DispatchChannelStatus`: verhoog van 30s/60s → 120s
- `useClientErrorLogs`: verhoog van 30s → 300s (admin-only, niet kritiek)
- `TelematicsIntegration`: verhoog van 30s → 120s

### 6. RLS Performance — Cached company lookup

**Migratie**: Verifieer/optimaliseer `get_user_company_cached` functie.
- Zorg dat deze `STABLE` + `SECURITY DEFINER` is met `SET search_path`
- Voeg `RETURNS uuid` type hint toe voor planner-optimalisatie
- Overweeg een `pg_stat_statements` check bij grotere datasets

### 7. Bundle & Runtime Optimalisatie

**Bestand**: `src/App.tsx`
- Service worker cacht Supabase API responses 30 seconden → verhoog naar 10s of verwijder (stale data risico)

**Bestand**: `vite.config.ts`
- Supabase API `runtimeCaching` regel: verlaag `maxAgeSeconds` van 30 → 5 (of verwijder)
- Dit voorkomt dat gebruikers stale data zien na mutations

## Niet geraakt
- Lazy loading structuur — al goed opgezet met `lazyWithRetry`
- QueryClient config — `staleTime: 5min`, `gcTime: 10min` zijn goed voor high-traffic
- `refetchOnWindowFocus: false` — correct voor multi-user scenario
- ManualChunks — al geoptimaliseerd
- ErrorBoundary, OfflineBanner — geen performance impact

## Verwacht Resultaat
- Dashboard laadtijd: **3-6s → <1s** (3 RPCs i.p.v. 6 unbounded queries)
- DB load: **-60%** door indexes + polling consolidatie
- GPS Tracking: **-66%** queries door realtime-only
- Schaalbaar tot **1000+ concurrent users** zonder instance upgrade

## Volgorde
1. Database indexes (migratie) — instant impact, nul risico
2. Dashboard trips `.limit()` — quick fix
3. Dashboard RPC consolidatie — grootste impact
4. Driver locations RPC + polling fix
5. Polling intervals verhogen
6. RLS check
7. Service worker cache tuning




# Performance Hardening — Ronde 4

## Wat al gedaan is (Rondes 1-3)
- Polling: alle 8 hooks met `refetchIntervalInBackground: false` ✅
- Trips: limit 100, server-side search, expliciete kolommen ✅
- Customers: limit 100, server-side search ✅
- Drivers: default limit 200 ✅
- Realtime: 500ms debounce ✅
- Dashboard: tenant-scoped, RPC consolidatie ✅
- SW cache: 30s StaleWhileRevalidate ✅
- Database: 16 compound indexes ✅
- Carriers, Procurement, LearningSystem: expliciete kolommen ✅
- Predictive dispatch: limit 50 ✅

## Wat nog overblijft

### 1. HOOG: CO2 Data haalt 2000 trips op
`src/hooks/useCO2Data.ts` regel 103: `.limit(2000)` — dit is de grootste remaining limit in de hele app. De query haalt al expliciete kolommen op (goed), maar 2000 rijen is veel.

**Fix**: Verlaag naar `.limit(500)` — voor CO2 rapportage zijn 500 trips per periode ruim voldoende.

### 2. HOOG: Predictive Analytics haalt trips + vehicles met `select('*')`
`src/hooks/usePredictiveAnalytics.ts` regel 79+94: twee `select('*')` queries — trips (30 dagen) en alle vehicles. Geen limit op vehicles.

**Fix**: Expliciete kolommen + `.limit(200)` op vehicles.

### 3. HOOG: Portal data haalt alles met `select('*')` — 6x in één hook
`src/components/portal/shared/usePortalData.ts` heeft 6 `select('*')` calls op submissions, trips, invoices en claims. Klantportaal is high-traffic (externe klanten).

**Fix**: Expliciete kolommen op de 4 unieke tabellen.

### 4. MIDDEL: Drivers search is nog client-side
`src/services/drivers.ts` regel 53-59: zoekfilter na ophalen van alle 200 drivers. Bij veel drivers inefficiënt.

**Fix**: Verplaats search naar server met `.or()` en `.ilike()`, net als bij trips en customers.

### 5. MIDDEL: WorldClassData — 8x `select('*')` zonder limits
`src/hooks/useWorldClassData.ts` heeft 8 queries met `select('*')` op holds, duplicates, authority_rules, job_runs, integration_failures, safety_profiles, feature_flags, domain_events. Sommige hebben `.limit(100)`, andere niet.

**Fix**: Voeg default limits toe waar ze ontbreken.

### 6. MIDDEL: EnterpriseData — 5x `select('*')`
`src/hooks/useEnterpriseData.ts` op automation_definitions, automation_runs, reconciliation_issues, finance_policies, authority_delegations.

**Fix**: Voeg limits toe op lijstqueries.

### 7. LAAG: Instance sizing
Bij 50+ gelijktijdige gebruikers: ga naar Backend > Geavanceerde instellingen > Instance upgraden.

---

## Concrete wijzigingen

| # | Fix | Bestand | Impact |
|---|-----|---------|--------|
| 1 | CO2 limit 2000→500 | `src/hooks/useCO2Data.ts` | Hoog |
| 2 | PredictiveAnalytics: expliciete kolommen + vehicle limit | `src/hooks/usePredictiveAnalytics.ts` | Hoog |
| 3 | PortalData: expliciete kolommen op 6 queries | `src/components/portal/shared/usePortalData.ts` | Hoog |
| 4 | Drivers: server-side search | `src/services/drivers.ts` | Middel |
| 5 | WorldClassData: default limits toevoegen | `src/hooks/useWorldClassData.ts` | Middel |
| 6 | EnterpriseData: default limits toevoegen | `src/hooks/useEnterpriseData.ts` | Middel |

Totaal: 6 bestanden, geen database migraties, geen breaking changes.




# Performance Hardening — Ronde 3

## Wat al gedaan is
- Polling hooks: alle 8 hebben `refetchIntervalInBackground: false` ✅
- Trips service: limit 100, server-side search, expliciete kolommen ✅
- Realtime: 500ms debounce ✅
- Dashboard: tenant-scoped, background polling gestopt ✅
- Predictive dispatch: limit 500 → 50 ✅
- SW cache: 30s StaleWhileRevalidate ✅
- Database: 16 compound indexes ✅
- Global staleTime: 5 minuten ✅

## Wat nog overblijft

### 1. HOOG: Customers service — limit 5000 + client-side search
`src/services/customers.ts` regel 30: `query.limit(5000)` — identiek probleem als trips had. Zoekfilter draait client-side op alle data.

**Fix**: Verlaag naar 100, verplaats search naar server met `.ilike()`.

### 2. HOOG: 74 bestanden met `select('*')` — bulk-scan nog niet gedaan
De vorige ronde fixte Carriers, Procurement en LearningSystem. Er zijn nog ~70 bestanden met `select('*')`. De meeste zijn klein (settings, 1 rij), maar er zijn nog high-traffic cases:
- `usePortalShipments.ts` — trips + driver_locations
- `usePODClaims.ts` — `limit(200)` met `select('*')`
- `useClientErrorLogs.ts` — `limit(500)` met `select('*')`

**Fix**: Vervang `select('*')` op deze 3 high-traffic hooks.

### 3. MIDDEL: Customers service heeft `CUSTOMER_SELECT` gedefinieerd maar niet gebruikt
Regel 13-16 definieert `CUSTOMER_SELECT` met `*` en join, maar `fetchCustomers` op regel 21 gebruikt gewoon `select('*')` zonder de join. Dit is een bug — de join kolommen worden nooit opgehaald.

**Fix**: Gebruik `CUSTOMER_SELECT` met expliciete kolommen.

### 4. MIDDEL: Drivers service mist default limit
`src/services/drivers.ts` regel 47-49 heeft geen default limit als `filters.limit` niet gezet is — dit kan alle drivers ophalen.

**Fix**: Voeg `if (!filters.limit) query = query.limit(200);` toe.

### 5. LAAG: Instance sizing advies
Bij groei naar 50+ gelijktijdige gebruikers kan de database-instance de bottleneck worden. Dit is niet op te lossen met code.

**Advies**: Ga naar Backend > Geavanceerde instellingen > Instance upgraden voor meer capaciteit.

---

## Concrete wijzigingen

| # | Fix | Bestand | Impact |
|---|-----|---------|--------|
| 1 | Customers limit 5000→100 + server-side search | `src/services/customers.ts` | Hoog |
| 2 | `select('*')` → kolommen op 3 high-traffic hooks | `usePortalShipments.ts`, `usePODClaims.ts`, `useClientErrorLogs.ts` | Hoog |
| 3 | Gebruik CUSTOMER_SELECT met expliciete kolommen | `src/services/customers.ts` | Middel |
| 4 | Drivers default limit toevoegen | `src/services/drivers.ts` | Middel |

Totaal: 5 bestanden, geen database migraties, geen breaking changes.


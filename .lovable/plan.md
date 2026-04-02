

# Eerlijk Advies — De Code is Klaar, De Infrastructuur Niet

## Wat er in 5 rondes gedaan is

| Optimalisatie | Status |
|---|---|
| 16 database compound indexes | ✅ |
| Server-side search (trips, customers, drivers) | ✅ |
| Limits op alle grote queries | ✅ |
| Background polling gestopt op alle 8 hooks | ✅ |
| Realtime 500ms debounce | ✅ |
| 100+ pagina's lazy loaded | ✅ |
| Expliciete kolommen op high-traffic queries | ✅ |
| Vite manualChunks + tree-shaking | ✅ |
| Dashboard geconsolideerd naar RPC | ✅ |
| Service Worker cache | ✅ |
| EmailDashboard limit 500 + refresh 30s | ✅ |
| DriverProfielTab limits | ✅ |
| 44 ongebruikte hooks/componenten verwijderd | ✅ |
| Mapbox dynamisch laden (~450KB bespaard) | ✅ |

**Er zijn geen impactvolle code-optimalisaties meer over.** De resterende `select('*')` calls zijn single-row fetches waar de overhead verwaarloosbaar is.

## Wat de app nu traag maakt

De twee overgebleven items zijn **niet op te lossen met code**:

### 1. Database instance te klein (dit is het)
De standaard Lovable Cloud instance heeft beperkt CPU en geheugen. Bij meerdere gelijktijdige gebruikers wordt de database zelf de bottleneck — ongeacht hoe efficiënt de queries zijn. Dit is veruit de meest waarschijnlijke oorzaak van traagheid.

**Actie**: Ga naar **Backend → Geavanceerde instellingen → Instance upgraden**. Dit is de #1 stap die nu het meeste verschil gaat maken.

### 2. Dashboard invoices limit (laatste code-fix)
`useDashboardData.ts` regel 63 haalt nog steeds `.limit(1000)` invoices op. Dit kan naar 200 — maar het verschil is klein vergeleken met instance sizing.

## Aanbeveling

| # | Actie | Type | Impact |
|---|---|---|---|
| 1 | Instance upgraden via Backend → Geavanceerde instellingen | Infrastructuur | **Zeer hoog** |
| 2 | Dashboard invoices limit 1000→200 | Code | Laag |

**Eerlijk**: nog een ronde code-optimalisatie gaat geen merkbaar verschil meer maken. De app heeft 5 rondes gehad. De volgende sprong in snelheid komt van een grotere instance.


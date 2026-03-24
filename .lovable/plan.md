

# Plan: Bulletproof PWA Caching met Autonome Auto-Update

## Probleem
De Service Worker staat op `selfDestroying: true` — er is geen caching. Lighthouse rapporteert 887 KiB verspild bij elk bezoek. De app moet 100% autonoom draaien op web, iOS en macOS.

## Risico van Service Worker
Een actieve SW kan oude code serveren. De bestaande `clearServiceWorkerAndCaches()` in auth flows en error recovery vernietigt dan de cache. Dit conflicteert.

## Oplossing: 3 Wijzigingen

### 1. `vite.config.ts` — Service Worker Activeren
- `selfDestroying: false`
- `registerType: "autoUpdate"` — SW update automatisch op de achtergrond, geen gebruikersactie nodig
- `navigateFallbackDenylist: [/^\/~oauth/]` — OAuth routes nooit cachen (vereist per Lovable docs)
- `skipWaiting: true`, `clientsClaim: true` — nieuwe SW neemt direct over
- `cleanupOutdatedCaches: true` — oude caches automatisch opruimen
- Runtime caching toevoegen:
  - Google Fonts: `CacheFirst`, 1 jaar TTL
  - Supabase API: `NetworkFirst`, 5 min TTL (API data altijd vers, maar offline fallback)
  - Mapbox: behouden zoals nu

### 2. `src/lib/authStorage.ts` — `clearServiceWorkerAndCaches()` Aanpassen
Het huidige gedrag (SW volledig deregistreren) is destructief bij een actieve SW. Aanpassen naar:
- **Niet** de SW deregistreren — die moet blijven draaien voor caching
- **Wel** auth-gerelateerde caches clearen (cookies, localStorage keys)
- Cache Storage alleen clearen als het een echte error recovery is (niet bij normale logout)
- Nieuwe functie `clearAuthCachesOnly()` voor logout flows
- `clearServiceWorkerAndCaches()` behouden maar alleen aanroepen bij fatale chunk-errors (error recovery)

### 3. Callers Updaten
- `Auth.tsx`, `DriverLogin.tsx`, `ProtectedRoute.tsx`: vervang `clearServiceWorkerAndCaches()` door `clearAuthCachesOnly()` bij logout
- `errorRecoverySystem.ts`: behoudt `clearServiceWorkerAndCaches()` — bij chunk-load errors is volledige reset correct

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `vite.config.ts` | PWA config: selfDestroying=false, autoUpdate, runtime caching |
| `src/lib/authStorage.ts` | Nieuwe `clearAuthCachesOnly()`, bestaande functie behouden voor errors |
| `src/pages/Auth.tsx` | Gebruik `clearAuthCachesOnly()` |
| `src/pages/DriverLogin.tsx` | Gebruik `clearAuthCachesOnly()` |
| `src/components/auth/ProtectedRoute.tsx` | Gebruik `clearAuthCachesOnly()` |

## Impact
- **887 KiB besparing** bij herhaalde bezoeken (assets uit lokale cache)
- **Autonome updates**: SW update automatisch zonder refresh nodig
- **iOS/macOS ready**: PWA manifest + SW werken native in Safari
- **Geen functionaliteitsverlies**: alle bestaande features blijven identiek
- **Veilig**: auth logout ruimt alleen auth-data op, niet de hele SW


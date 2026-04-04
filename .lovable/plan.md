

# Uitvoeringsplan — 3 Batches, Stap voor Stap

## Batch 1: useUserRole → React Query (auth crash fix)

**1 bestand, 16 importeurs, zero breaking changes**

**`src/hooks/useUserRole.ts`** — volledige herschrijving:
- Vervang alle `useState`/`useEffect`/`useRef`/`roleCache` logica door `useQuery` met `queryKey: ['user-role', userId]`
- React Query dedupliceert automatisch: 16 componenten = 1 DB query i.p.v. 16
- Config: `staleTime: 5min`, `gcTime: 10min`, `retry: 3`, `retryDelay: 1500ms`
- `clearAllRoleCache()` → roept `queryClient.removeQueries({ queryKey: ['user-role'] })` aan
- `refetch` → `queryClient.invalidateQueries({ queryKey: ['user-role', userId] })`
- Alle exports blijven 100% identiek: `role`, `loading`, `error`, `isAdmin`, `isMedewerker`, `isChauffeur`, `isKlant`, `canAccessChatGPT`, `canAccessPlanning`, `canAccessFinance`, `refetch`, `clearCache`

**Test**: Login → dashboard laadt → geen "Lock was released" console errors → role-based menu items tonen correct

---

## Batch 2: Mapbox token + loader resilient maken

**2 bestanden**

**`src/hooks/useMapboxToken.ts`**:
- Bij succesvolle fetch: `localStorage.setItem('mapbox_token_cache', token)`
- Bij fout na alle retries: probeer `localStorage.getItem('mapbox_token_cache')` als fallback
- Als fallback bestaat: gebruik dat token, toon geen error → kaarten werken altijd

**`src/utils/mapbox-loader.ts`**:
- Bij fout in `import('mapbox-gl')`: reset `_loading = null` zodat volgende aanroep opnieuw kan proberen
- Voeg `catch` toe aan de promise chain die `_loading` reset

**Test**: Kaarten laden op dashboard (FleetMapWidget) en op GPS Tracking pagina

---

## Batch 3: 6 componenten consolideren naar `loadMapboxGL()`

**6 bestanden** — per bestand alleen de import-regel wijzigen:

| Component | Aantal `import("mapbox-gl")` calls | Actie |
|-----------|-------------------------------------|-------|
| `FleetMapWidget.tsx` | 2 | → `loadMapboxGL()` |
| `TrackingMap.tsx` | 5 | → `loadMapboxGL()` |
| `DriverTrackDialog.tsx` | 3 | → `loadMapboxGL()` |
| `OrderRoutePreview.tsx` | 1 | → `loadMapboxGL()` |
| `OrderRouteDialog.tsx` | 2 | → `loadMapboxGL()` |
| `BaseMap.tsx` | 1 | → `loadMapboxGL()` |

Per component:
- Voeg `import { loadMapboxGL } from '@/utils/mapbox-loader'` toe
- Vervang elke `(await import("mapbox-gl")).default` door `await loadMapboxGL()`
- Verwijder de losse CSS imports (`import("mapbox-gl/dist/mapbox-gl.css")`, `import("@/styles/map-styles.css")`) — zitten al in `loadMapboxGL()`

**Test**: Navigeer naar elke pagina met een kaart (Dashboard, GPS Tracking, Order detail, Driver tracking) — kaarten laden correct

---

## Samenvatting

| Batch | Bestanden | Risico | Impact |
|-------|-----------|--------|--------|
| 1 | 1 | Laag (API identiek) | Auth crashes opgelost |
| 2 | 2 | Laag (fallback toevoegen) | Kaarten werken altijd |
| 3 | 6 | Laag (alleen import-regels) | Consistente error recovery |

**Totaal: 9 bestanden, 0 nieuwe dependencies, 0 database wijzigingen**


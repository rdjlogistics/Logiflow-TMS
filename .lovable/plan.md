

# Fix: Dashboard laadt glitcherig met dubbele render

## Root Cause

**`placeholderData: EMPTY_DATA`** in `useDashboardData.ts` zorgt ervoor dat `isLoading` direct `false` is. Het dashboard rendert dus meteen met allemaal nullen (0 ritten, 0 klanten, 0 omzet), en springt dan naar echte data wanneer de query klaar is. Dit veroorzaakt het "glitchy" effect — alles verschijnt twee keer.

Daarnaast: het weer, de role, en de dashboard-data laden allemaal onafhankelijk, wat tot 3-4 re-renders leidt voordat het scherm stabiel is.

## Oplossing (2 bestanden)

### 1. `src/hooks/useDashboardData.ts` — echte loading state

- Vervang `placeholderData: EMPTY_DATA` door `placeholderData: undefined`
- Voeg `isPlaceholderData` of `isFetching` check toe zodat `loading` alleen `false` is wanneer echte data is opgehaald
- Nieuwe logica: `loading: isLoading || (isFetching && !dataUpdatedAt)` — true tot eerste succesvolle fetch, daarna nooit meer (background refetches tonen geen loader)

### 2. `src/pages/Dashboard.tsx` — top-level loading gate

- Voeg direct na de hooks een check toe: als `loading === true`, render een volledig **DashboardSkeleton** in plaats van het hele dashboard
- Dit skeleton bevat: header-blok, 4 stat-kaarten, en 3 widget-placeholders
- Zodra data er is, rendert het dashboard **eenmalig** met alle echte waarden — geen dubbele render, geen 0→echte waarden sprong
- Weer-sectie: toon alleen wanneer `!weatherLoading && weather` (al zo, maar nu pas zichtbaar na eerste volledige render)

## Technisch Detail

```text
Huidige flow:
  t=0ms   → placeholderData → render met 0en → "glitch"
  t=800ms → echte data      → re-render → content springt

Nieuwe flow:
  t=0ms   → loading=true → skeleton
  t=800ms → echte data   → render eenmalig met echte waarden → klaar
```

## Resultaat
- Dashboard laadt 1x schoon met skeleton, dan direct de echte data
- Geen springende nullen, geen dubbele render
- Background refetches (elke 2 min) tonen geen loader — data update stil op de achtergrond
- 0 nieuwe dependencies, 2 bestanden gewijzigd




# Fix: Mapbox Kaart Leeg + App Boot Error

## Diagnose

1. **App laadt niet (503 error)**: De Vite dev server geeft 503 op `ThemeProvider.tsx` waardoor de hele app niet opstart. Dit is een server-overload probleem.

2. **Mapbox kaart leeg**: Op je screenshot is de interactive kaart-mode actief (legend met "Verkeer" is zichtbaar), maar de Mapbox tiles renderen niet. De token werkt correct (geverifieerd).

## Oorzaak

Het probleem zit in de `RouteOptimizationMap` initialisatie: als de Mapbox GL Map een `load` event afvuurt maar de tiles niet renderen (bijv. door een iOS WebGL timing-issue), wordt dit niet gedetecteerd. De post-render pixel check op regel 151-163 controleert slechts 1x na 2 seconden — als de map op dat moment nog tiles aan het laden is, detecteert het niets.

## Fixes

### 1. Robuustere map-initialisatie met retry
**Bestand**: `src/components/route/RouteOptimizationMap.tsx`

- Voeg een `idle` event listener toe naast `load` — `idle` vuurt pas als alle tiles geladen zijn
- Verhoog de post-render pixel check naar 2 pogingen (2s en 5s)
- Als de pixel check faalt na `idle`, escaleer direct naar static fallback
- Voeg een `map.triggerRepaint()` call toe na het load event voor iOS compatibility
- Forceer een `resize()` call in de `idle` handler om 0-size canvas issues op te vangen

### 2. Token-loading guard versterken
**Bestand**: `src/components/route/RouteOptimizationMap.tsx`

- Voorkom dat `map.current` check het herinnitialiseren blokkeert als de vorige poging stilzwijgend faalde
- Voeg een `mapInitFailed` ref toe die controleert of de map daadwerkelijk tiles rendert

### 3. Fallback bij canvas blank
- Als de pixel check op 5s nog steeds faalt, automatisch escaleren naar static map in plaats van een lege kaart te tonen

| # | Fix | Bestand |
|---|-----|---------|
| 1 | Robuustere init met idle event + dubbele pixel check | `src/components/route/RouteOptimizationMap.tsx` |
| 2 | Token guard + mapInitFailed ref | `src/components/route/RouteOptimizationMap.tsx` |


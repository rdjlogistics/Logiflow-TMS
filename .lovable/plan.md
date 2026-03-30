

# Fix: Route Optimalisatie Werkt Niet

## Root Cause

**De `useAIRouteOptimizer` hook crasht** omdat de edge function (`ai-route-optimizer`) een compleet ander response-formaat teruggeeft dan wat de hook verwacht.

**Edge function retourneert:**
```json
{ "optimizedOrder": ["id1","id2"], "totalDistanceKm": 45.2, "originalDistanceKm": 52.1, "savingsPercent": 13 }
```

**Hook verwacht (`OptimizedRoute` interface):**
```json
{ "stops": [...], "totalDistance": 45, "totalDuration": 90, "geometry": {...}, "savings": { "timeSaved": 10, "distanceSaved": 7, "fuelSaved": 0.5 } }
```

Op line 103 crasht de hook met `result.savings.timeSaved` → `Cannot read properties of undefined`. De hele optimalisatie stopt.

Ondertussen bestaat er al een **werkende** `useAdvancedRouteOptimization` hook die:
- Nearest neighbor + 2-opt doet (identiek aan de edge function)
- Mapbox Directions API gebruikt voor echte routing + geometry
- Het correcte `OptimizationResult` formaat retourneert met stops, geometry, distances, etc.

## Fix

**Vervang `useAIRouteOptimizer` door `useAdvancedRouteOptimization`** in de RouteOptimization pagina. Dit elimineert de onnodige edge function call en gebruikt de bewezen lokale optimalisatie die al correct werkt met Mapbox.

### Wijzigingen in `src/pages/RouteOptimization.tsx`:

1. **Import wijzigen** — Vervang `useAIRouteOptimizer` import door `useAdvancedRouteOptimization`
2. **Hook call wijzigen** — Line 190: gebruik `useAdvancedRouteOptimization()` i.p.v. `useAIRouteOptimizer()`
3. **`handleOptimize` herschrijven** — Roep `optimizeRoute(optimizableStops, options)` aan met het correcte `OptimizableStop[]` formaat en `OptimizationOptions`. Het resultaat is een `OptimizationResult` met `stops`, `geometry`, `totalDistance`, `totalDuration`, `savings`.
4. **Response mapping aanpassen** — De `setOptimizationResult()` en `setStops()` calls updaten voor het `OptimizationResult` formaat (stops hebben `etaMinutes`, `distanceFromPrevious`, `arrivalTime` etc.)

### Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/pages/RouteOptimization.tsx` — Hook swap + handleOptimize rewrite |


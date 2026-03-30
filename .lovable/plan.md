

# Route Optimalisatie: Animatie verwijderen, solide lijn

## Wat verandert

In `src/components/route/RouteOptimizationMap.tsx`:

1. **Verwijder de dash-array animatie** (line 347-376) — het hele `useEffect` blok dat `requestAnimationFrame` gebruikt om de `line-dasharray` te animeren wordt verwijderd.

2. **Verwijder de glow layer** (line 304-314) — de `addGlowAndDash` functie en de `route-glow` layer worden verwijderd. Te druk voor een professionele transport-kaart.

3. **Solide lijn ipv dashed** — Beide `addLayer` calls (line 318-323 en line 334-338) krijgen een eenvoudige solide lijn:
   - `"line-dasharray"` verwijderen
   - `"line-width": 4`
   - `"line-opacity": 0.85`
   - `"line-color": "#2563eb"` (iets donkerder blauw, professioneler)

4. **Cleanup vereenvoudigen** — de `route-glow` layer hoeft niet meer verwijderd te worden in de cleanup (line 300).

## Resultaat

Een strakke, solide blauwe lijn tussen stops — zoals verwacht in professionele transport/logistics software.

## Bestand

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/components/route/RouteOptimizationMap.tsx` — animatie + glow verwijderen, solide lijn |


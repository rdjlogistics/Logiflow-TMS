

# Fix: Route Optimalisatie "Demo Modus" Label

## Probleem

De Route Optimalisatie pagina toont een **"Demo Data" badge** (regel 976) wanneer er geen geplande ritten zijn voor vandaag/morgen. Dit is misleidend — er is geen demo data, de lijst is gewoon leeg. Een nieuw account zonder ritten ziet dus "Demo Data" terwijl er niets te zien is.

## Oorzaak

`hasRealData` = `stops.length > 0` in de hook. Wanneer er geen trips zijn voor vandaag/morgen → `hasRealData = false` → badge toont "Demo Data" in plaats van een nuttige empty state.

## Fixes

### 1. Verwijder "Demo Data" badge, toon empty state
**Bestand**: `src/pages/RouteOptimization.tsx`

- Verwijder de "Demo Data" badge (regel 975-977)
- Wanneer `stops.length === 0` en niet loading: toon een lege-staat kaart met:
  - Icon (Route) + "Geen stops voor vandaag"
  - Uitleg: "Maak orders aan met een datum van vandaag of voeg handmatig stops toe"
  - Knoppen: "Stop toevoegen" en "Importeer"
- Update de `CardDescription` tekst wanneer leeg

### 2. Verwijder fallback naar demoStops bij reset
**Bestand**: `src/pages/RouteOptimization.tsx`

- `handleReset`: als er geen dbStops zijn, reset naar `[]` (al het geval, maar verwijder de referentie naar `demoStops`)
- Verwijder de `demoStops` constante volledig — niet meer nodig

| # | Wijziging | Bestand |
|---|-----------|---------|
| 1 | Verwijder "Demo Data" badge + voeg empty state toe | `src/pages/RouteOptimization.tsx` |
| 2 | Verwijder `demoStops` constante | `src/pages/RouteOptimization.tsx` |


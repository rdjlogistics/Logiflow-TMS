

# Fix: Alle Mapbox Kaarten Werken Niet

## Probleem
De `useMapboxToken` hook roept `supabase.functions.invoke("get-mapbox-token")` aan, maar deze edge function **bestaat niet**. Het secret `MAPBOX_PUBLIC_TOKEN` is wel geconfigureerd maar wordt nooit naar de frontend gestuurd. Hierdoor falen alle 12+ kaartcomponenten.

Daarnaast gebruikt `OrderRoutePreview.tsx` een hardcoded `VITE_MAPBOX_TOKEN` env var die ook niet bestaat.

## Oplossing

### 1. Maak edge function `get-mapbox-token` aan
**Nieuw bestand**: `supabase/functions/get-mapbox-token/index.ts`

- Leest `MAPBOX_PUBLIC_TOKEN` uit Deno environment
- Retourneert `{ token: "..." }` als JSON
- Geen JWT verificatie nodig (het is een publieke token)
- CORS headers toevoegen

### 2. Fix `OrderRoutePreview.tsx`
- Verwijder de hardcoded `VITE_MAPBOX_TOKEN` constante
- Gebruik `useMapboxToken` hook zoals alle andere kaartcomponenten
- Pas de map-initialisatie aan om op het token te wachten

### Bestanden
1. **Nieuw**: `supabase/functions/get-mapbox-token/index.ts`
2. **Edit**: `src/components/orders/OrderRoutePreview.tsx` — switch naar `useMapboxToken`

### Resultaat
Alle kaarten (Dashboard fleet map, GPS tracking, route optimalisatie, chauffeur ritten, tankstations, B2B tracking, order preview) laden correct met het Mapbox token.


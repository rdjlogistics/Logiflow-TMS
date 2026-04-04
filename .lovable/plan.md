

# Fix: Echte weerdata via Open-Meteo API (gratis, geen API key)

## Probleem

`useWeatherData.ts` is 100% nep — `Math.random()` genereert willekeurige temperaturen op basis van seizoen. Geen API call, geen locatie, geen echte data.

## Oplossing

**Open-Meteo API** — gratis, geen API key nodig, geen rate limits voor normaal gebruik, werkt wereldwijd.

### 1 bestand: `src/hooks/useWeatherData.ts` — volledig herschrijven

**Stap 1: Browser geolocation ophalen**
- `navigator.geolocation.getCurrentPosition()` met `maximumAge: 300000` (5 min cache), `timeout: 5000`
- Fallback bij weigering: Amsterdam (52.37, 4.90)

**Stap 2: Open-Meteo API aanroepen**
- URL: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10,weather_code&timezone=auto`
- Geen key, geen account, directe client-side fetch
- WMO weather codes mappen naar bestaande icon types (`sunny`, `cloudy`, `rainy`, `snowy`, `foggy`, `stormy`, `partly-cloudy`)
- Nederlandse condition labels behouden (`Zonnig`, `Bewolkt`, `Regen`, etc.)

**Stap 3: Traffic schatting behouden**
- Traffic logica (spits + weer-conditie) blijft lokaal berekend — dit is geen weer-API functie
- Gebruikt de echte weer-conditie i.p.v. random

**Stap 4: Caching & error handling**
- `staleTime: 15 min` — weerdata verandert niet per seconde
- Bij API-fout: fallback naar laatste bekende waarde (useState behoudt vorige data)
- Bij geolocation-weigering: gebruik Amsterdam als default, toon echte data voor die locatie

**Stap 5: Reverse geocoding voor locatienaam**
- Open-Meteo geeft geen plaatsnaam → gebruik `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json` (ook gratis)
- Toon echte stad/regio i.p.v. hardcoded "Nederland"

### Interface blijft 100% identiek

```text
WeatherData {
  temperature: number      ← echte API waarde
  condition: string        ← WMO code → Nederlandse tekst
  icon: string             ← WMO code → icon type
  humidity: number         ← echte API waarde
  windSpeed: number        ← echte API waarde
  trafficExpected: string  ← berekend op basis van echte weer + tijd
  trafficDescription: string
  location: string         ← reverse geocoded plaatsnaam
}
```

Dashboard.tsx heeft **zero wijzigingen** nodig.

### WMO Weather Code mapping

| Code | Conditie | Icon |
|------|----------|------|
| 0 | Onbewolkt | sunny |
| 1-2 | Halfbewolkt | partly-cloudy |
| 3 | Bewolkt | cloudy |
| 45, 48 | Mist | foggy |
| 51-67 | Regen/Motregen | rainy |
| 71-77 | Sneeuw | snowy |
| 80-82 | Buien | rainy |
| 85-86 | Sneeuwbuien | snowy |
| 95-99 | Onweer | stormy |

### Resultaat
- Echte temperatuur op basis van GPS-locatie van de gebruiker
- Werkt in heel Europa (en wereldwijd)
- Geen API key nodig, geen kosten, geen edge function
- Fallback naar Amsterdam bij geolocation-weigering
- 1 bestand gewijzigd, 0 breaking changes


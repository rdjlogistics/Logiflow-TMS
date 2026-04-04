

# Fix: Weer en verkeersindicator verschijnen niet in Command Center

## Root Cause

De Open-Meteo API URL bevat `wind_speed_10` maar de correcte parameternaam is `wind_speed_10m` (met 'm' voor meters). Dit veroorzaakt een **400 error** bij elke API call:

```
"Cannot initialize from invalid String value wind_speed_10"
```

De catch-block doet niets (`// Keep previous weather data`), dus `weather` blijft `null` en de hele weer/verkeer-sectie wordt nooit gerenderd.

## Fix (1 bestand, 2 regels)

**`src/hooks/useWeatherData.ts`**:

1. **Regel 109**: URL parameter `wind_speed_10` → `wind_speed_10m`
2. **Regel 128**: Response access `current.wind_speed_10` → `current.wind_speed_10m`

Dat is alles. De rest van de code (WMO mapping, traffic berekening, locatie fallback) werkt al correct.

## Verificatie

Getest met `curl`:
- **Fout** (`wind_speed_10`): `{"error":true,"reason":"Cannot initialize..."}`  
- **Correct** (`wind_speed_10m`): `{"temperature_2m":13.8,"wind_speed_10m":22.0,"weather_code":2}` ✅


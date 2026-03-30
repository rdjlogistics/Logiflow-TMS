

# Fix: Chauffeur Stops Kunnen Niet Worden Afgemeld

## Root Cause

1. **`isActive` is alleen `true` als `trip.status === 'onderweg'`** (DriverRittenTab.tsx line 381). Maar `handleStartTrip` blokkeert als GPS niet beschikbaar is (`gpsEnabled === false` → line 252-254). Dus als GPS geweigerd is, kan de rit nooit gestart worden → `isActive` blijft `false` → alle stop-acties vergrendeld.

2. **Voltooide ritten** (status `afgeleverd`/`afgerond`/`gecontroleerd`) hebben ook `isActive = false`, waardoor completed data niet zichtbaar is in de stop cards.

3. **Toast toont geen ordernummer** — "Rit gestart" zonder referentie naar het ordernummer.

## Fixes

### 1. GPS niet langer hard requirement voor "Start rit"
**Bestanden:** `DriverRittenTab.tsx` (line 251-255), `DriverHomeTab.tsx` (line 79-84)

Verwijder de `if (!gpsEnabled) { return; }` guard. In plaats daarvan:
- Start de rit altijd
- Toon een waarschuwing als GPS niet beschikbaar: "GPS niet beschikbaar. Locatie wordt niet geregistreerd."
- De `disabled={!gpsEnabled}` op de Start knop (line 454) wordt ook verwijderd

### 2. `isActive` verbreden voor actieve ritten
**Bestand:** `DriverRittenTab.tsx` (line 381)

Verander:
```typescript
const isActive = selectedTrip.status === 'onderweg';
```
Naar:
```typescript
const isActive = ['onderweg', 'geladen'].includes(selectedTrip.status);
```
Zelfde fix op line 303 (RouteListItem).

### 3. Voltooide ritten: data zichtbaar maken
**Bestand:** `DriverStopCard.tsx` (line 637)

Verander `{!isCompleted && (` naar toon altijd de actie-knoppen, maar in read-only mode als `isCompleted`:
- Navigeer: altijd beschikbaar
- Teken/Foto/Afmelden: disabled + visueel verborgen bij completed
- Upload: altijd beschikbaar (achteraf documenten toevoegen)
- Toon bestaande handtekeningen/foto's als read-only

### 4. Toast met ordernummer
**Bestand:** `useDriverTrips.ts` (line 360-363)

Het ordernummer wordt al opgehaald (line 353-357 voor notificatie). Gebruik dit in de toast:
```typescript
toast({
  title: 'Rit gestart',
  description: `Rit #${tripForNotif?.order_number || ''} is onderweg`,
});
```

### 5. Bevestigingsdialoog voor "Start rit"
**Bestand:** `DriverRittenTab.tsx`

Voeg een `AlertDialog` toe rond de "Start rit" knop met:
- Titel: "Wil je deze rit starten?"
- Beschrijving: ordernummer + pickup → delivery
- Knoppen: Annuleren / Starten

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/components/driver/tabs/DriverRittenTab.tsx` — GPS guard verwijderen, `isActive` verbreden, bevestigingsdialoog, disabled verwijderen |
| **Edit** | `src/components/driver/tabs/DriverHomeTab.tsx` — GPS guard verwijderen |
| **Edit** | `src/components/driver/DriverStopCard.tsx` — Completed stops read-only met data, action bar altijd tonen |
| **Edit** | `src/hooks/useDriverTrips.ts` — Toast met ordernummer |


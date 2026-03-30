

# Excel/CSV Export Toevoegen aan Trips, Chauffeurs & Vlootbeheer

## Huidige staat

Alle drie de pagina's hebben al een simpele CSV export, maar:
- **Trips**: inline CSV-generatie met beperkte kolommen (8), enkele "CSV" knop
- **Chauffeurs** (in Carriers.tsx): alleen bulk-selectie CSV export (6 kolommen)
- **Vlootbeheer** (VehicleOverview.tsx): inline CSV met 11 kolommen, enkele knop

Geen van de pagina's biedt Excel (.xlsx) export aan, terwijl `writeExcelFile` en `writeCsvFile` al beschikbaar zijn in `src/lib/excelUtils.ts`.

## Plan

### Stap 1: Herbruikbaar ExportDropdown component

Maak `src/components/common/ExportDropdown.tsx` — een dropdown knop met "Excel (.xlsx)" en "CSV" opties. Accepteert:
- `headers: string[]` — kolomnamen
- `rows: unknown[][]` — data rijen
- `filename: string` — basisnaam zonder extensie
- `sheetName?: string` — Excel sheet naam

Gebruikt intern `writeExcelFile` en `writeCsvFile` uit `excelUtils.ts`.

### Stap 2: Trips pagina upgraden

Vervang de huidige `handleExportCSV` functie en "CSV" knop door het ExportDropdown component. Breid de kolommen uit:
- Ordernummer, Datum, Klant, Klantreferentie, Ophaaladres, Ophaalstad, Afleveradres, Afleverstad, Status, Voertuig, Gewicht (kg), Afstand (km), Prijs (€), Vrachtbrief, CMR, Notities

### Stap 3: Chauffeurs pagina upgraden

Voeg een standalone export knop toe naast de "Toevoegen" knop (niet alleen bij bulk selectie). Kolommen:
- Naam, E-mail, Telefoon, Categorie, ZZP, Status, Rijbewijsnummer, Portaal actief

Exporteert gefilterde lijst of geselecteerde chauffeurs.

### Stap 4: Vlootbeheer upgraden

Vervang de huidige CSV-only export door het ExportDropdown. Behoudt dezelfde 11 kolommen.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Nieuw** | `src/components/common/ExportDropdown.tsx` |
| **Edit** | `src/pages/Trips.tsx` — vervang CSV knop door ExportDropdown |
| **Edit** | `src/pages/Carriers.tsx` — voeg export knop toe in header |
| **Edit** | `src/components/fleet/VehicleOverview.tsx` — vervang CSV knop door ExportDropdown |

## Resultaat

- Alle drie pagina's bieden Excel (.xlsx) en CSV export aan via een consistente dropdown
- Meer kolommen in de exports voor completer overzicht
- Herbruikbaar component voor toekomstige pagina's


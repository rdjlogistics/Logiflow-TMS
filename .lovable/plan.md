

# Waarde & Afschrijving tab toevoegen aan Vlootbeheer

## Overzicht

Een nieuwe "Waarde & Afschrijving" tab in Vlootbeheer die per voertuig de actuele inruilwaarde berekent met een afschrijvingsalgoritme, plus de Total Cost of Ownership (TCO) toont op basis van echte data uit de database.

## Database migratie

**Kolom toevoegen aan `vehicles` tabel:**
- `purchase_price` (numeric, nullable) — aanschafwaarde van het voertuig

Dit is de enige ontbrekende kolom. Alle andere data (bouwjaar, km-stand, lease, verzekering, brandstofverbruik, onderhoudskosten) bestaat al.

## Afschrijvingsalgoritme

Client-side berekening per voertuig:

```text
Lineaire afschrijving over 8 jaar (standaard voor bedrijfsvoertuigen NL):
  leeftijd = huidig_jaar - bouwjaar
  restwaarde_pct = max(10%, 100% - (leeftijd / 8) * 90%)
  
Kilometerscorrectie:
  verwacht_km = leeftijd * 30.000 (gemiddeld NL bedrijfsvoertuig)
  km_ratio = werkelijke_km / verwacht_km
  correctie = 1 - (km_ratio - 1) * 0.15  (max ±15% impact)
  
Inruilwaarde = aanschafprijs * restwaarde_pct * km_correctie

TCO per maand:
  afschrijving/maand + lease + verzekering + gemiddeld_onderhoud + brandstof_schatting
```

## Nieuwe bestanden

### 1. `src/components/fleet/VehicleValuation.tsx`
Nieuwe tab-component met:
- **Vloot-samenvatting**: Totale vlootwaarde, gemiddelde TCO/maand, gemiddelde leeftijd
- **Per-voertuig kaarten** (glassmorphism, iOS 27 style):
  - Voertuig info (kenteken, merk/model, bouwjaar, km-stand)
  - Aanschafprijs invulveld (inline editable als nog niet gezet)
  - Visuele afschrijvingsbalk (gradient van groen → rood)
  - Huidige geschatte inruilwaarde
  - TCO breakdown: afschrijving, lease, verzekering, onderhoud, brandstof
  - TCO per km berekening
- **Sorteer/filter**: Op waarde, leeftijd, TCO

### 2. `src/lib/vehicleValuation.ts`
Pure functies voor het afschrijvingsalgoritme:
- `calculateDepreciation(purchasePrice, yearOfManufacture, mileageKm)` → inruilwaarde + restwaarde%
- `calculateTCO(vehicle, maintenanceCosts)` → maandelijkse TCO breakdown
- Exporteerbare constanten (afschrijvingsduur, km/jaar benchmark)

## Bestaande bestanden aanpassen

### 3. `src/pages/FleetManagement.tsx`
- Importeer `VehicleValuation` component
- Voeg 4e tab toe: "Waarde" met `TrendingDown` icoon
- TabsContent met `forceMount` patroon (consistent met bestaande tabs)

### 4. `src/hooks/useFleetManagement.ts`
- `Vehicle` interface uitbreiden met `purchase_price: number | null`
- Maintenance costs query toevoegen (som van kosten per voertuig uit `vehicle_maintenance`)

### 5. `src/components/fleet/VehicleOverview.tsx`
- `VehicleFormData` uitbreiden met `purchase_price` veld
- Invoerveld toevoegen in het voertuig-bewerkingsdialoog (Financieel tab)

## Resultaat
- Echte berekeningen op basis van database-data (bouwjaar, km, onderhoud, lease, verzekering)
- Aanschafprijs is het enige nieuwe invoerveld
- TCO combineert alle bestaande kosten in één overzicht
- Glassmorphism UI consistent met rest van de app


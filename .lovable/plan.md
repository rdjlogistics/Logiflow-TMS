

# Fix: Verwijder Hardcoded Placeholder/Demo Data

## Gevonden items

| Locatie | Probleem |
|---------|----------|
| `src/components/dashboard/AlertsWidget.tsx` | `mockAlerts` array met "SLA Breach Order #2847", "Chauffeur Jan vertraging", etc. wordt als **default** meegegeven via `alerts = mockAlerts` |
| `src/components/fleet/FuelManagement.tsx` | Hardcoded voertuigen `BX-123-AB`, `VK-456-CD`, `ZD-012-GH` in select dropdown |
| `src/pages/NotFound.tsx` | Placeholder telefoon `+31 20 123 4567` |
| `src/pages/wms/WMSDashboard.tsx` | Hardcoded `warehouseUtilization = 73` en `pickingEfficiency = 94` met `// Demo value` |
| `src/pages/AdminSettings.tsx` | Placeholder "Uw bedrijfsnaam" en "+31 20 123 4567" in input fields — **dit zijn placeholders in input velden, acceptabel als hint-tekst** |
| `src/components/onboarding/CompanyVerificationStep.tsx` | Placeholder tekst in inputs (KvK "12345678", BTW "NL123456789B01") — **acceptabel als format-hint** |
| `src/components/carriers/CarrierImportDialog.tsx` | CSV voorbeeld-data — **acceptabel als import template voorbeeld** |

## Wat WEL moet veranderen (4 bestanden)

### 1. `src/components/dashboard/AlertsWidget.tsx`
- Verwijder de volledige `mockAlerts` array (regel 40-81)
- Wijzig default prop van `alerts = mockAlerts` naar `alerts = []`
- De component heeft al een mooie empty state (regel 174-213) met "Geen actieve alerts" — die wordt nu standaard getoond

### 2. `src/components/fleet/FuelManagement.tsx`
- Vervang hardcoded `<SelectItem>` waarden door een dynamische query op de `vehicles` tabel
- Bij geen voertuigen: toon een disabled select met "Geen voertuigen gevonden"

### 3. `src/pages/NotFound.tsx`
- Verwijder het telefoonnummer `+31 20 123 4567` volledig
- Houd alleen het email-adres `support@rdjlogistics.nl` als contactoptie

### 4. `src/pages/wms/WMSDashboard.tsx`
- Vervang hardcoded `73` en `94` door `0` met een label "(nog geen data)"

## Wat NIET verandert
- **AdminSettings.tsx** placeholders ("Uw bedrijfsnaam", KvK "12345678") — dit zijn input field placeholders/hints, niet pre-filled waarden. `value={settings.company_name || ''}` zorgt dat het veld leeg is als er geen data is.
- **CompanyVerificationStep.tsx** — zelfde: format hints in placeholder attr
- **CarrierImportDialog.tsx** — CSV import template voorbeeld data




# Verificatie Resultaten & Resterende Fixes

## Wat is CORRECT (geen actie nodig)

| Check | Status |
|-------|--------|
| Placeholder UUID `a1b2c3d4-...` | **CLEAN** — 0 resultaten |
| `localStorage.getItem('company')` | **CLEAN** — 0 resultaten |
| Hardcoded kentekens (BX-123, HG-456, etc.) | **CLEAN** — verwijderd |
| `mockAlerts` in AlertsWidget | **CLEAN** — verwijderd |
| "SLA Breach" in dashboard alerts | **CLEAN** — alleen nog in SLAMonitor.tsx als UI label "SLA Breaches" (dat is een kolom-header, geen fake data) |

## Wat nog GEFIXED moet worden (3 items)

### 1. `src/pages/notifications/NotificationChannels.tsx` — Mock data
Drie mock arrays (`mockChannels`, `mockLogs`, `mockTemplates`) worden als default state gebruikt. Nieuwe accounts zien nep-notificatie logs en kanalen.

**Fix:** Vervang defaults door lege arrays `[]`. Voeg empty states toe:
- Kanalen: "Configureer je eerste notificatiekanaal"
- Logs: "Nog geen notificaties verzonden"
- Templates: bestaande templates zijn configuratie-voorbeelden, die kunnen blijven als startpunt (ze bevatten `{{placeholders}}`, geen fake data)

### 2. `src/pages/AdminSettings.tsx` — Placeholder telefoon
Regel 721: `placeholder="+31 20 123 4567"` — dit is een input placeholder (hint), niet pre-filled data. `value={settings.company_phone || ''}` zorgt dat het veld leeg begint. **Acceptabel als format-hint.** Geen actie nodig.

### 3. Overige matches (geen actie nodig)
- `NL123456789B01` in `nl-validators.ts` — validatie-voorbeeld in error messages
- `12345678` in `CompanySetupWizard.tsx`, `AdminSettings.tsx` — input placeholders (format hints)
- `CarrierImportDialog.tsx` — CSV import template voorbeelden
- `BookingWizard.tsx` — telefoon placeholder format hint
- `CustomerSelfService.tsx` — "uw bedrijfsnaam" is beschrijvende tekst, geen pre-filled waarde

## Plan

### Bestand 1: `src/pages/notifications/NotificationChannels.tsx`
- Verwijder `mockChannels`, `mockLogs`, `mockTemplates` arrays
- Zet defaults op `[]` voor channels en logs
- Houd templates als startconfiguratie (ze bevatten template variabelen, geen fake data) OF zet ook op `[]`
- Voeg empty state UI toe voor kanalen-tab en logs-tab wanneer de arrays leeg zijn

**Dat is het enige bestand dat aangepast moet worden.** Alle andere zoekresultaten zijn format-hints in placeholders of validatie-voorbeelden — geen pre-filled fake data.


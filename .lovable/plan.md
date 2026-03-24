

# Plan: Verwijder Alle Demo Data uit Dashboard Widgets

## Probleem
Drie dashboard-widgets tonen hardcoded demo-data als er geen echte data wordt meegegeven. Voor een nieuw account zie je dus nep-cijfers (94.5% OTIF, €298k omzet, 342 ritten Noord-Holland) alsof het bedrijf al draait. Dit is een commerciële dealbreaker.

## Wat verandert

### Dashboard Widgets — Demo Defaults → Lege State

**3 widgets met hardcoded defaultData:**

| Widget | Nep-data | Fix |
|---|---|---|
| `PerformanceMetricsWidget.tsx` | OTIF 94.5%, bezetting 78%, 1.247 leveringen | Geen data → toon "Nog geen data" kaart |
| `TrendsWidget.tsx` | €42K-€62K omzet over 6 maanden | Geen data → toon "Nog geen data" kaart |
| `GeographicHeatmapWidget.tsx` | 342 ritten NH, 289 ZH, etc. | Geen data → toon "Nog geen data" kaart |

**1 widget met demo select-items:**

| Widget | Nep-data | Fix |
|---|---|---|
| `AutomationSimulator.tsx` | 3 hardcoded "demo-1/2/3" SelectItems | Verwijder de demo items |

### Aanpak per Widget

Elke widget krijgt dezelfde logica:
- Verwijder de `defaultData` constante
- Maak `data` prop **required** of default naar `null`
- Als `data` leeg/null is: toon een elegante lege state ("Nog geen ritten" / "Nog geen omzetdata") met een subtiel icoon
- Als `data` aanwezig: bestaande visualisatie blijft identiek

### DraggableWidgetGrid — Geen data doorgeven = widget toont lege state
De grid geeft momenteel geen `data` prop mee aan deze 3 widgets (regel 132-137). Dat is prima — de widgets moeten zelf lege state tonen als er geen data is.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/dashboard/PerformanceMetricsWidget.tsx` | Verwijder defaultData, toon lege state bij geen data |
| `src/components/dashboard/TrendsWidget.tsx` | Verwijder defaultData, toon lege state bij geen data |
| `src/components/dashboard/GeographicHeatmapWidget.tsx` | Verwijder defaultRegions, toon lege state bij geen data |
| `src/pages/enterprise/AutomationSimulator.tsx` | Verwijder 3 hardcoded demo SelectItems |




# B2B Portaal Dashboard Widgets Verbeteren

## Huidige staat

De drie widgets (Openstaande Facturen, Aankomende Leveringen, Recente Statusupdates) zijn al aanwezig maar kunnen worden verbeterd:

1. **Facturen widget** — toont `amount` maar mist `amount_paid` info, geen nl-NL formattering, geen onderscheid openstaand vs totaal
2. **Invoice type** — mist `amountPaid` veld, waardoor deelbetalingen niet zichtbaar zijn
3. **Leveringen widget** — geen prijsindicatie per levering
4. **Statusupdates** — geen klikbare items

## Verbeteringen

### Stap 1: Invoice type uitbreiden

In `src/components/portal/shared/types.ts`:
- Voeg `amountPaid?: number` toe aan `Invoice` interface

In `src/components/portal/shared/usePortalData.ts`:
- Map `amount_paid` uit de database naar `amountPaid`
- Detecteer overdue beter: facturen met status `verzonden` of `definitief` waarvan `due_date < today`

### Stap 2: Facturen widget verbeteren

In `src/components/portal/b2b/B2BDashboard.tsx`:
- Toon **openstaand bedrag** (amount - amountPaid) i.p.v. alleen totaalbedrag
- Gebruik `nl-NL` locale formattering: `€ 1.234,56`
- Voeg een **betaald vs openstaand** progress bar toe
- Toon verlopen dagen als rode tekst bij overdue facturen (bijv. "3 dagen verlopen")
- Maak individuele facturen klikbaar naar `/portal/b2b/invoices`

### Stap 3: Leveringen widget verbeteren

- Toon geschat gewicht en aantal colli per levering
- Voeg een mini progress indicator toe (4 stappen: Bevestigd → Opgehaald → Onderweg → Bezorgd)
- Maak items klikbaar (al geïmplementeerd, behouden)

### Stap 4: Statusupdates widget verbeteren

- Maak elke update klikbaar naar de shipment detail pagina
- Voeg een subtiel animatie-effect toe bij nieuwe updates
- Toon het aantal colli bij elke update

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/components/portal/shared/types.ts` — voeg `amountPaid` toe |
| **Edit** | `src/components/portal/shared/usePortalData.ts` — map `amount_paid`, betere overdue detectie |
| **Edit** | `src/components/portal/b2b/B2BDashboard.tsx` — verbeterde widgets met bedragen, progress bars, klikbare items |

## Resultaat

- Facturen widget toont helder openstaand bedrag met visuele progress bar
- Bedragen in nl-NL formaat (€ 1.234,56)
- Verlopen facturen tonen exact aantal dagen te laat
- Leveringen tonen meer operationele details
- Alle widget-items zijn klikbaar voor snelle navigatie


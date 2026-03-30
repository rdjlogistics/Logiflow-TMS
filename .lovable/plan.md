

# B2B Portaal Dashboard Verbeteren — Widgets

## Overzicht

Vervang de huidige simpele sidebar (Maandoverzicht + Open Cases) door drie rijke widgets: **Openstaande Facturen**, **Aankomende Leveringen** en **Recente Statusupdates**. Behoud de bestaande greeting, KPI's en recente zendingen sectie.

## Huidige staat

De sidebar bevat twee simpele kaarten: een "Maandoverzicht" met 4 regels tekst en een "Open Cases" kaart. Er is geen dedicated widget voor openstaande facturen, aankomende leveringen of statusupdates.

## Nieuwe layout

```text
┌──────────────────────────────────────────────────┐
│  Greeting + Quick Actions + KPI Cards (ongewijzigd) │
├──────────────────────┬───────────────────────────┤
│  Recente Zendingen   │  Openstaande Facturen     │
│  (ongewijzigd,       │  (NIEUW widget)           │
│   lg:col-span-2)     │                           │
│                      ├───────────────────────────┤
│                      │  Aankomende Leveringen    │
│                      │  (NIEUW widget)           │
│                      ├───────────────────────────┤
│                      │  Recente Statusupdates    │
│                      │  (NIEUW widget)           │
└──────────────────────┴───────────────────────────┘
```

## Stappen

### Stap 1: Openstaande Facturen Widget

Vervang de "Maandoverzicht" kaart. Toont:
- Totaalbedrag openstaand met grote € weergave
- Aantal openstaande facturen + aantal verlopen (rode badge)
- Lijst van max 3 recente openstaande facturen met factuurnummer, bedrag, vervaldatum
- Verlopen facturen krijgen een `InvoiceAgingBadge`-achtige indicator
- "Bekijk alle facturen" link naar `/portal/b2b/invoices`

Data komt uit de bestaande `invoices` prop (al aanwezig in B2BDashboard).

### Stap 2: Aankomende Leveringen Widget

Vervang de "Open Cases" kaart. Toont:
- Aantal zendingen met status `pickup_scheduled`, `picked_up`, `in_transit`, `out_for_delivery`
- Lijst van max 3 eerstvolgende leveringen gesorteerd op `estimatedDelivery`
- Per levering: referentienummer, route (van → naar), verwachte datum, status badge
- "Bekijk alle leveringen" link naar `/portal/b2b/shipments`

Data komt uit bestaande `recentShipments` prop — filter op actieve statussen.

### Stap 3: Recente Statusupdates Widget

Nieuw widget onder de andere twee. Toont:
- De 5 meest recente zendingen gesorteerd op `createdAt` die een niet-pending status hebben
- Per update: referentienummer, oude → nieuwe status met gekleurde badges, tijdstempel relatief ("2u geleden")
- Animatie bij hover
- Als er geen updates zijn: lege staat met CheckCircle2 icoon

Data: filtert `recentShipments` op niet-pending statussen, toont de recentste.

### Stap 4: Cases indicator behouden

Voeg een compacte cases-indicator toe aan de Aankomende Leveringen widget als er open cases zijn (kleine badge met count), zodat die info niet verloren gaat.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Edit** | `src/components/portal/b2b/B2BDashboard.tsx` — vervang sidebar met 3 nieuwe widgets |

## Resultaat

- Dashboard biedt direct inzicht in financiële status (openstaande facturen)
- Aankomende leveringen zijn in één oogopslag zichtbaar
- Statusupdates geven een activiteitsfeed-gevoel
- Consistente glassmorphism styling met bestaande Elite Class esthetiek
- Geen nieuwe database queries nodig — alle data is al beschikbaar via props


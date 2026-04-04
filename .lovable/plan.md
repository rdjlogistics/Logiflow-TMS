

# Concurrent-Audit Acties + Top 3 Features Bouwen

## Huidige Status

Na grondige audit van Erniesoft e-Lips versus ons systeem:

**Wij winnen al op 20+ gebieden** — AI Dispatch, Smart OCR, iOS thema, B2B/Driver portals, Cashflow analytics, Route Optimalisatie, Exception Management, etc.

**Erniesoft wint op 3 gebieden die we moeten toevoegen:**

---

## Batch 1: Diesel Staffel Module (Prioriteit 1 — NL markt essentieel)

We hebben al een `FuelIndexUpdateDialog` en brandstoftoeslag in RateManagement, maar missen de **staffel-structuur** die Erniesoft wel heeft (automatische berekening op basis van prijsstaffels).

**Wat te bouwen:**
- **Nieuwe pagina** `/finance/diesel-module` — Diesel Staffel Beheer
- **DB migratie**: `diesel_staffels` tabel (referentieprijs, staffelstappen met percentages, geldigheidsperiode)
- **Staffel Calculator**: Automatische berekening brandstoftoeslag per klant op basis van actuele dieselprijs vs referentieprijs met staffelstappen (bv. elke €0.05 stijging = +0.5%)
- **Maandelijkse auto-update**: Edge function die CBS/marktprijzen checkt en staffels herberekent
- **Koppeling aan facturatie**: Brandstoftoeslag automatisch toepassen op factuurregels
- **Overzichtsdashboard**: Huidige dieselprijs, historische grafiek, impact op omzet

**Bestanden:**
- 1 migratie (diesel_staffels tabel)
- 1 pagina (`src/pages/finance/DieselModule.tsx`)
- 1 edge function (`diesel-price-update`)
- Update `BatchInvoiceWizard` voor automatische staffel-toepassing
- Route toevoegen in `App.tsx`

---

## Batch 2: Proforma + Offerte Flow (Prioriteit 2)

We hebben al `offerte` status in trips en `is_proforma` in facturatie, maar missen een **dedicated Offerte pagina** met volledige pipeline.

**Wat te bouwen:**
- **Nieuwe pagina** `/sales/quotes` — Offertes & Proforma Dashboard
- Pipeline-view: Offerte → Akkoord → Order → Factuur
- Offerte PDF genereren (edge function uitbreiding van `generate-document-pdf`)
- Conversie-tracking: hoeveel offertes worden orders
- Vervaldatum + automatische herinneringen
- KPI cards: Open offertes, conversiepercentage, gemiddelde waarde

**Bestanden:**
- 1 pagina (`src/pages/sales/QuotesDashboard.tsx`)
- Update `generate-document-pdf` edge function voor offerte template
- Route toevoegen in `App.tsx`
- Sidebar menu-item onder Sales/CRM

---

## Batch 3: CO2 Rapportage Upgraden naar GLEC Framework (Prioriteit 3)

We hebben al een werkende CO2 pagina (`/co2`) met STREAM emissiefactoren. Upgrade naar **GLEC Framework** (EU regelgeving 2026):

**Wat te verbeteren:**
- **GLEC compliance badges** op het dashboard
- **Well-to-Wheel (WTW)** emissiefactoren toevoegen naast Tank-to-Wheel
- **Scope 1/2/3 uitsplitsing** volgens GHG Protocol
- **PDF rapport export** naast CSV (professioneel ESG rapport)
- **Doelstellingen panel**: CO2 reductiedoelen instellen en voortgang tracken
- **Vergelijking met vorig jaar**: Trendlijn en delta

**Bestanden:**
- Update `src/hooks/useCO2Data.ts` (WTW factoren, scope-uitsplitsing)
- Update `src/pages/CO2Reporting.tsx` (GLEC badges, doelen, PDF export)
- Optioneel: edge function voor PDF rapport generatie

---

## Technische Details

```text
Batch 1 (Diesel):     1 migratie + 1 pagina + 1 edge function + 1 update
Batch 2 (Offerte):    1 pagina + 1 edge function update + 2 updates
Batch 3 (CO2 GLEC):   2 bestandsupdates + optioneel edge function

Totaal: ~8-10 bestanden wijzigen/maken
Volgorde: Batch 1 → 2 → 3 (prioriteit NL markt)
```

Alle 3 batches vullen exact de gaten die Erniesoft wel heeft en wij nog niet. Na implementatie: **0 concurrentievoordeel voor Erniesoft, 20+ voordelen voor ons**.


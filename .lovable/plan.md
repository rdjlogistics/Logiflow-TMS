

# Launch Audit — LogiFlow TMS

## Status Batches Vandaag
- **Email queue**: 0 items — schoon
- **Workflow runs**: 0 incomplete — schoon
- **Overdue facturen**: Reeds gepatcht (vorige sessie) — 17 vervallen, 7 betaald, 2 gedeeltelijk betaald, 1 concept — correct
- **Factureerbare ritten (verkoop)**: 14 wachten op handmatige batch — geen actie (by design)
- **Factureerbare ritten (inkoop)**: 2 wachten op handmatige batch — geen actie (by design)
- **Cron jobs**: Niet geregistreerd (pg_cron schema ontoegankelijk) — eerdere sessie meldde database-timeouts

**Conclusie batches**: Alles schoon, geen dubbel werk nodig.

---

## Kritieke Issues voor Launch

### 1. Dode route in sidebar: `/sla` (SLA Monitoring)
De sidebar linkt naar `/sla` maar er is **geen route in App.tsx** en **geen pagina-bestand**. Gebruikers zien een 404.

**Fix**: Route toevoegen die verwijst naar bestaande SystemHealth of een nieuw SLA-component, OF sidebar-link verwijderen.

### 2. Orphan page files zonder routes (17 bestanden)
Pagina's die als bestanden bestaan maar NIET bereikbaar zijn via routing:

| Categorie | Bestanden |
|-----------|-----------|
| CRM | AccountPolicies, DossierVault, LaneMap, SalesPipeline |
| Enterprise | LiveBoard |
| Finance | Collections, CreditDashboard |
| Tendering | TenderDashboard, TenderHistory, TenderTemplates |
| Carrier tabs | CarrierDocumentsTab, CarrierIncomingTab, CarrierInvoicesTab, CarrierProfileTab, CarrierTripsTab |
| Admin | WorkflowAutomation |
| Operations | AIDispatch (duplicate, maar referenced elders) |

**Fix**: Verwijder de 14 volledig dode bestanden. Voeg routes toe voor WorkflowAutomation (sidebar-relevant) en AIDispatch (widget-relevant), of verwijs ze door.

### 3. Volledig statische pagina's (geen DB-connectie)
38 pagina's gebruiken geen database-calls. Veel zijn terecht statisch (legal, NotFound, onboarding wizards), maar sommige zouden live data moeten tonen:

**Prioriteit hoog** (sidebar-zichtbaar, verwacht live data):
- `CO2Reporting` — toont geen echte emissiedata
- `FleetManagement` — geen voertuigdata uit DB (terwijl vehicles tabel bestaat)
- `FuelStations` — statische kaart/lijst
- `Network` — geen live netwerk data
- `Reporting` — geen live rapportage
- `PredictiveMaintenance` — geen echte onderhoudslogs
- `SecurityCenter` — geen live security data
- `SystemHealth` — geen live health checks

**Prioriteit middel** (module-pagina's):
- `WMS*` (8 pagina's) — volledig statisch, WMS tabellen bestaan mogelijk niet
- `CarrierPools`, `CarrierScorecards` — statisch
- `RateContracts`, `DynamicPricing` — statisch
- `BankReconciliation` — geen live bank data

**Prioriteit laag** (acceptabel statisch voor launch):
- `DocumentTemplates`, `AIRecommendations`
- `B2CBook`, `B2CHelp`, `B2CTrack`

### 4. Ongebruikte Edge Functions
5 edge functions worden nergens vanuit de frontend aangeroepen:
- `exact-oauth-start` — Exact Online OAuth (integratie)
- `execute-workflow` — aangestuurd via DB trigger, niet frontend (OK)
- `kill-cron-jobs` — noodknop (OK, handmatig)
- `rfq-parser` — niet gekoppeld aan UI
- `smart-document-ocr` — niet gekoppeld aan UI

**Fix**: `execute-workflow` en `kill-cron-jobs` zijn legitiem (trigger/admin). Verwijder of koppel de andere 3.

### 5. Notifications directory is leeg
`src/pages/notifications/` bestaat maar bevat geen bestanden.

**Fix**: Verwijder lege directory.

---

## Aanbevolen Launch Plan (gefaseerd)

### Fase 1 — Blokkerende fixes (MOET voor launch)
1. **Fix `/sla` sidebar link** → verwijder uit sidebar of maak redirect naar `/enterprise/health`
2. **Verwijder 14 dode page files** (CRM 4, Enterprise 1, Finance 2, Tendering 3, Carrier tabs 5) — vermindert bundle
3. **Voeg `/admin/workflows` route toe** — WorkflowAutomation pagina bestaat, is sidebar-relevant
4. **Verwijder lege directories** (`notifications/`)

### Fase 2 — Data-integriteit (MOET voor productie)
5. **FleetManagement → live data** — koppel aan `vehicles` tabel
6. **CO2Reporting → live data** — bereken uit trips distance_km
7. **Reporting → live data** — koppel aan trips/invoices aggregates
8. **SecurityCenter/SystemHealth → live data** — koppel aan audit logs, edge function health

### Fase 3 — Module-completering (KAN na launch)
9. WMS module live-data koppeling
10. Bank reconciliation live koppeling
11. Rate contracts/dynamic pricing live koppeling
12. RFQ parser en Smart OCR koppelen aan UI

---

## Technische Details

### Stap 1-4 (Fase 1): Bestanden
- **`src/components/layout/AppSidebar.tsx`**: Verwijder `/sla` item of redirect
- **`src/App.tsx`**: Voeg route `/admin/workflows` toe
- **Delete**: 14 orphan page files + lege `src/pages/notifications/`
- **Delete**: 3 ongebruikte edge functions (optioneel)

### Geschatte impact
- ~14 bestanden verwijderd
- ~1 route toegevoegd
- ~1 sidebar-link gefixt
- 0 nieuwe dependencies
- Build blijft foutloos (reeds gevalideerd: 0 TS errors)


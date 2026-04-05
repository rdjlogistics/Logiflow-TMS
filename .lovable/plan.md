

# Volledige Feature Audit — Scale Pakket (36 functies)

## Audit Resultaat per Functie

### WERKEND (End-to-End met live DB) — 24 functies

| # | Functie | Status | Toelichting |
|---|---------|--------|-------------|
| 1 | Orderbeheer | OK | Trips CRUD, bulk acties, status flow, alle DB-koppelingen |
| 2 | Digitale POD | OK | stop_proofs tabel, foto/handtekening upload, auto-vrachtbrief |
| 3 | CMR / Vrachtbrief | OK | CMR-nummers in orderformulier, auto-send vrachtbrief edge function, DocumentsSheet |
| 4 | Live Tracking | OK | driver_locations tabel, GPS hooks, Mapbox kaart, realtime |
| 5 | Facturatie | OK | Batch wizard, PDF, email verzending, 11-stadia flow |
| 6 | CRM | OK | Klantenbeheer, contacts, settings, portaal uitnodigingen |
| 7 | KPI Dashboard | OK | get_dashboard_ops RPC, kpi_snapshots, live stats |
| 8 | Chauffeurs App | OK | Volledig portaal met ritten, checkout, GPS, chat, offline sync |
| 9 | Multi-stop Orders | OK | route_stops tabel, drag-and-drop, stop-level checkout |
| 10 | AI Dispatch | OK | AutoDispatch pagina + ai-dispatch-engine edge function |
| 11 | Route Optimalisatie | OK | RouteOptimization pagina met Mapbox Directions |
| 12 | Dienstplanning | OK | Rosters pagina, program_shifts tabel, drivers koppeling |
| 13 | Proactieve Alerts | OK | AlertsEscalations pagina + anomaly_events DB |
| 14 | SLA Monitoring | OK | SystemHealth pagina via /enterprise/health, sidebar gefixt |
| 15 | Debiteurenbeheer | OK | Receivables module, herinneringen, incasso tabs |
| 16 | Inkoopfacturatie | OK | Batch purchase invoices, SEPA export, carrier portal |
| 17 | Marge Analyse | OK | gross_profit en profit_margin_pct op trips, reporting |
| 18 | Cashflow Dashboard | OK | CashflowCockpit met payments, goals, alerts uit DB |
| 19 | Bank Reconciliatie | OK | BankReconciliation pagina + bank_transactions + AI matching |
| 20 | Klanten Portaal | OK | B2B portaal met real-time tracking, facturen, submissions |
| 21 | Tariefcontracten | OK | RateContracts met zones, lanes, accessorials — volledig DB |
| 22 | Tendering / Charter | OK | Procurement + CarrierPools + CarrierScorecards — alle DB |
| 23 | WhatsApp Chat | OK | WhatsApp links in driver assign + order form + B2C track |
| 24 | Push Notificaties | OK | VAPID, service worker, send-push-notification edge function |

### WERKEND MAAR GEEN EIGEN PAGINA (Ingebouwd in andere flows) — 4 functies

| # | Functie | Status | Toelichting |
|---|---------|--------|-------------|
| 25 | UBL Export | INGEBOUWD | Zit in send-invoice-email als optionele bijlage — werkt |
| 26 | Fleet Management | OK | FleetManagement pagina met vehicles + maintenance + APK uit DB |
| 27 | Exception Management | OK | ExceptionsInbox pagina + anomaly_events DB |
| 28 | Vervoerdersnetwerk | OK | Network pagina met company_connections, dispatch orders |

### ONTBREEKT OF NIET FUNCTIONEEL — 8 functies

| # | Functie | Status | Probleem |
|---|---------|--------|----------|
| 29 | **Creditnota's** | ONTBREEKT | `credit_notes` tabel bestaat maar er is GEEN pagina, GEEN route, GEEN UI. Gebruikers kunnen geen creditnota's aanmaken of beheren. |
| 30 | **Boekhouding Koppeling** | PLACEHOLDER | Geen functionele integratie. Exact Online OAuth edge function bestaat maar is niet gekoppeld aan UI. Vereist EXACT_CLIENT_ID/SECRET secrets. |
| 31 | **Smart OCR** | ONTBREEKT | Edge function `smart-document-ocr` bestaat maar is nergens aangeroepen. Geen UI pagina, geen route. |
| 32 | **WMS / Magazijn** | GEDEELTELIJK | 6 pagina's met volledige DB hooks, MAAR tabellen zijn leeg en er is geen onboarding/wizard om eerste warehouse aan te maken. Technisch werkend. |
| 33 | **E-commerce** | ONTBREEKT | `ecommerce_connections` tabel bestaat maar er is GEEN pagina, GEEN route. |
| 34 | **Multi-vestiging** | ONTBREEKT | Geen pagina, geen route, geen tabel. Feature is niet geïmplementeerd. |
| 35 | **API Toegang** | ONTBREEKT | Geen API keys management pagina, geen route. |
| 36 | **White Label** | INGEBOUWD | Branding via useCompany hook (logo, naam). Geen dedicated beheerpagina maar functionaliteit werkt in emails/portals. |

---

## Fase 1 — Kritieke Fixes (MOET voor launch)

### 1. Creditnota's pagina bouwen
- Nieuwe pagina `src/pages/finance/CreditNotes.tsx`
- Route `/finance/credit-notes` in App.tsx
- Sidebar link toevoegen
- CRUD op `credit_notes` tabel (bestaat al met `generate_credit_note_number()` functie)
- Koppeling aan bestaande facturen
- Glassmorphism design consistent met Receivables module

### 2. Boekhouding Koppeling pagina bouwen
- Nieuwe pagina `src/pages/integrations/AccountingIntegration.tsx`
- Route `/integrations/accounting` in App.tsx
- Sidebar link toevoegen
- UI om accounting_integrations te beheren (tabel bestaat)
- Toon verbindingsstatus, provider selectie, credential management via vault RPCs
- Exact Online flow triggeren (edge function bestaat)

### 3. Smart OCR pagina bouwen
- Nieuwe pagina `src/pages/ai/SmartOCR.tsx`
- Route `/ai/ocr` in App.tsx
- Document upload UI die `smart-document-ocr` edge function aanroept
- Resultaat parsing en weergave
- Koppeling aan order_documents

### 4. E-commerce pagina bouwen
- Nieuwe pagina `src/pages/integrations/EcommerceHub.tsx`
- Route `/integrations/ecommerce` in App.tsx
- CRUD op `ecommerce_connections` tabel
- Status dashboard met verbindingen beheer

### 5. Multi-vestiging pagina bouwen
- Migratie: `multi_locations` tabel aanmaken
- Nieuwe pagina met vestigingen overzicht
- Route `/admin/locations` in App.tsx
- Koppeling aan companies tabel

### 6. API Toegang pagina bouwen
- Nieuwe pagina `src/pages/admin/APIAccess.tsx`
- Route `/admin/api-access` in App.tsx
- API key generatie, beheer, documentatie
- Koppeling aan bestaande api_keys mechanisme

## Fase 2 — Optimalisaties

### 7. WMS Onboarding verbeteren
- Eerste-gebruik wizard als geen warehouses bestaan
- Quick-start flow voor eerste warehouse + zone + locatie

### 8. White Label beheerpagina
- Dedicated pagina voor logo upload, kleuren, domein
- Preview van branding op portals

---

## Technische Details

### Bestanden te maken (Fase 1)
- `src/pages/finance/CreditNotes.tsx` — Creditnota CRUD
- `src/pages/integrations/AccountingIntegration.tsx` — Boekhouding
- `src/pages/ai/SmartOCR.tsx` — OCR upload + resultaten
- `src/pages/integrations/EcommerceHub.tsx` — Webshop koppelingen
- `src/pages/admin/MultiLocation.tsx` — Vestigingen
- `src/pages/admin/APIAccess.tsx` — API sleutels

### App.tsx wijzigingen
- 6 nieuwe lazy imports
- 6 nieuwe routes

### Sidebar wijzigingen
- 6 nieuwe menu-items onder relevante secties

### Database migratie
- `multi_locations` tabel (voor multi-vestiging)
- Eventueel `api_keys` tabel als die niet bestaat

### Geschatte omvang
- ~6 nieuwe pagina's, elk 200-400 regels
- ~1 migratie
- ~20 regels sidebar wijzigingen
- ~12 regels App.tsx wijzigingen
- 0 bestaande functionaliteit geraakt


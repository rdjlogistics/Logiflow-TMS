

# Volledige Feature Audit — Scale Pakket (36 functies)

## Audit Resultaten

### ✅ Volledig Werkend (26 functies)

| # | Feature | Status | Bewijs |
|---|---------|--------|--------|
| 1 | Orderbeheer | ✅ | OrderOverview + OrderForm, CRUD, realtime |
| 2 | Digitale POD | ✅ | DigitalPOD pagina, storage, PDF download |
| 3 | CMR / Vrachtbrief | ✅ | generate-document-pdf edge function, download flow |
| 4 | Live Tracking | ✅ | GPSTracking pagina, Mapbox, driver_locations tabel |
| 5 | Facturatie | ✅ | Invoices, batch-create, PDF, email verzending |
| 6 | CRM | ✅ | Customers pagina, volledig CRUD |
| 7 | KPI Dashboard | ✅ | KPIDashboard, get_dashboard_ops RPC |
| 8 | Chauffeurs App | ✅ | DriverPortal, offline sync, GPS push |
| 9 | Multi-stop Orders | ✅ | OrderForm multi-stop support |
| 10 | AI Dispatch | ✅ | ai-dispatch-engine + intelligent-dispatch edge functions |
| 11 | Route Optimalisatie | ✅ | RouteOptimization pagina, Mapbox layers |
| 12 | Dienstplanning | ✅ | PlanningProgram, shifts CRUD, publish flow |
| 13 | Proactieve Alerts | ✅ | proactive-alerts edge function, anomaly_events tabel |
| 14 | SLA Monitoring | ✅ | SLAMonitoring pagina, useSLADefinitions hook (DB-connected) |
| 15 | Debiteurenbeheer | ✅ | Receivables pagina, aging badges, reminders |
| 16 | Inkoopfacturatie | ✅ | PurchaseInvoices, batch wizard, SEPA export |
| 17 | Creditnota's | ✅ | Credit flow in invoice system |
| 18 | Marge Analyse | ✅ | MarginIntelligence pagina |
| 19 | Cashflow Dashboard | ✅ | CashflowCockpit pagina |
| 20 | Klanten Portaal | ✅ | B2B Portal, login, tracking, cases |
| 21 | Tariefcontracten | ✅ | RateManagement pagina, rate_contracts tabel |
| 22 | Tendering / Charter | ✅ | TenderDashboard, rfq-parser edge function |
| 23 | Smart OCR | ✅ | SmartDocumentOCR pagina, smart-document-ocr edge function |
| 24 | WMS / Magazijn | ✅ | 8 WMS pagina's, allemaal DB-connected |
| 25 | E-commerce | ✅ | EcommerceIntegrations, ecommerce-sync edge function |
| 26 | Exception Management | ✅ | ExceptionsInbox + Playbooks, anomaly_events DB |
| 27 | WhatsApp Chat | ✅ | Messenger, notification channels, WhatsApp API config |
| 28 | Push Notificaties | ✅ | send-push-notification edge function, PushNotificationPrompt |
| 29 | Fleet Management | ✅ | FleetManagement pagina, vehicles CRUD |
| 30 | Bank Reconciliatie | ✅ | BankReconciliation pagina, bank-reconcile edge function |
| 31 | Boekhouding Koppeling | ✅ | exact-oauth-start + exact-sync-invoices edge functions |

### ⚠️ Problemen Gevonden (5 functies)

| # | Feature | Probleem | Fix |
|---|---------|----------|-----|
| 32 | **UBL Export** | Frontend heeft UBL toggle in InvoiceEmailComposer, maar `send-invoice-email` edge function **negeert `include_ubl` parameter volledig** — er wordt geen UBL XML gegenereerd of bijgevoegd | Nieuwe edge function logica nodig om UBL 2.1 XML te genereren en als attachment mee te sturen |
| 33 | **Multi-vestiging** | **Geen dedicated pagina of UI**. Feature key bestaat in subscription system maar er is geen multi-location management scherm | Nieuwe pagina nodig voor vestigingenbeheer (locaties, teams per vestiging) |
| 34 | **Vervoerdersnetwerk** | Alle 4 community pagina's (JointOrders, Workspaces, Settlements, Ledger) zijn **lege placeholders** met alleen tekst "wordt beschikbaar zodra..." | Database-connected UI nodig |
| 35 | **API Toegang** | PublicAPI pagina bestaat en is functioneel (key management, docs) ✅ | OK |
| 36 | **White Label** | BrandingSettings pagina bestaat en is functioneel (logo, kleuren) ✅ | OK |

---

## Samenvatting: 3 Kritieke Fixes Nodig

### Fix 1: UBL Export — Edge function uitbreiden
- `send-invoice-email` moet `include_ubl` parameter lezen
- UBL 2.1 XML genereren op basis van factuurdata (standaard Nederlands belastingformaat)
- XML als bijlage meesturen via Resend attachments API
- **Geschatte omvang**: 1 edge function wijziging

### Fix 2: Multi-vestiging — Pagina bouwen
- Nieuwe pagina `/admin/locations` of `/enterprise/locations`
- CRUD voor vestigingen (naam, adres, contactpersoon)
- Koppeling aan bestaande `companies` tabel of nieuwe `company_branches` tabel
- FeatureGate op `multi_vestiging`
- **Geschatte omvang**: 1 migratie + 1 pagina + 1 route

### Fix 3: Vervoerdersnetwerk — Community pagina's vullen
- JointOrders: Toon gedeelde ritten tussen connected partners
- CommunityWorkspaces: Workspace beheer (al deels in Network pagina)
- Settlements & Ledger: Financiële afrekeningen tussen partners
- Alle 4 pagina's moeten DB-connected worden met echte data
- **Geschatte omvang**: 4 pagina's herschrijven

### Bonus Fix: Console Warning
- `ConfirmDialog` → AlertDialogContent geeft ref warning (uit console logs)
- Fix: `forwardRef` wrapper toevoegen

---

## Aanbeveling

**Fix 1 (UBL)** is kritiek voor Nederlandse markt — klanten verwachten UBL bij facturen.
**Fix 2 (Multi-vestiging)** en **Fix 3 (Vervoerdersnetwerk)** zijn Scale-only features die actief verkocht worden.

Alle 3 moeten gefixt worden voor launch. Ik kan ze in 3 batches uitvoeren.


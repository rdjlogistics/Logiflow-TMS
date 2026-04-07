

# Launch Audit — 37 Scale Functies End-to-End

## Audit Resultaat per Functie

Na grondige inspectie van alle routes, hooks, edge functions en database queries:

### WERKEND (geen actie nodig) — 28 functies

| # | Functie | Status | Bewijs |
|---|---------|--------|--------|
| 1 | Orderbeheer | OK | `OrderOverview.tsx` (1340L), `OrderForm.tsx` (1113L), realtime sync |
| 2 | Digitale POD | OK | `DigitalPOD.tsx` (701L), `useStopProofs`, PDF download via edge fn |
| 3 | CMR / Vrachtbrief | OK | `generate-document-pdf` edge fn, `DocumentTemplates.tsx` admin |
| 4 | Live Tracking | OK | `GPSTracking.tsx` (978L), Mapbox, `useAllDriverLocations`, realtime |
| 5 | Facturatie | OK | `Invoices.tsx` (951L), batch wizard, PDF, email send |
| 6 | CRM | OK | `Customers.tsx` (1113L), CRUD, NL-validators, swipeable cards |
| 7 | KPI Dashboard | OK | `KPIDashboard.tsx` (500L), Recharts, period filters |
| 8 | Chauffeurs App | OK | `DriverPortal.tsx`, GPS, offline sync, push notifications |
| 9 | Multi-stop Orders | OK | `RouteOptimization.tsx` (1677L), drag-n-drop, GPX export |
| 10 | AI Dispatch | OK | `AutoDispatch.tsx`, `ai-dispatch-engine` edge fn |
| 11 | Route Optimalisatie | OK | Same as #9, Mapbox routing, toll detection |
| 12 | Proactieve Alerts | OK | `proactive-alerts` edge fn (fixed in previous batch) |
| 13 | SLA Monitoring | OK | `SystemHealth.tsx` (618L), jobs, incidents, integrations |
| 14 | Debiteurenbeheer | OK | `Receivables.tsx`, 3-tab hub, reminder dialogs |
| 15 | Inkoopfacturatie | OK | `PurchaseInvoices.tsx`, batch wizard, SEPA export |
| 16 | Creditnota's | OK | `CreditNotes.tsx`, CRUD on `credit_notes` table |
| 17 | Marge Analyse | OK | `MarginAnalysis.tsx`, Recharts, per-klant/route/chauffeur |
| 18 | Cashflow Dashboard | OK | `CashflowCockpit.tsx` (1336L), goals, alerts, transactions |
| 19 | Bank Reconciliatie | OK | `BankReconciliation.tsx`, `bank-reconcile` edge fn |
| 20 | Boekhouding Koppeling | OK | `AccountingIntegration.tsx`, Exact Online OAuth |
| 21 | Klanten Portaal | OK | `B2BPortal.tsx`, booking, tracking, cases |
| 22 | Smart OCR | OK | `SmartOCR.tsx`, `smart-document-ocr` edge fn |
| 23 | WMS / Magazijn | OK | 8 WMS pages, `useWMS` hooks, dashboard stats |
| 24 | E-commerce | OK | `EcommerceHub.tsx`, `ecommerce-sync` edge fn |
| 25 | Exception Management | OK | `ExceptionsInbox.tsx`, `anomaly_events` table, resolve flow |
| 26 | Vervoerdersnetwerk | OK | `Network.tsx` (516L), connection requests, order sending |
| 27 | Push Notificaties | OK | `usePushNotifications`, VAPID, service worker |
| 28 | API Toegang | OK | `APIAccess.tsx`, `api-gateway` edge fn, SHA-256 keys |

### TE OPTIMALISEREN — 9 functies met concrete issues

| # | Functie | Probleem | Impact |
|---|---------|----------|--------|
| 29 | **Dienstplanning** | `Rosters.tsx` (144L) is minimaal — toont alleen weekrooster grid maar heeft geen "shift toevoegen" of "bewerken" functionaliteit. `program_shifts` wordt via `(supabase as any)` bevraagd — geen shift_date kolom in query. | Gebruiker kan geen diensten aanmaken |
| 30 | **Tariefcontracten** | Pagina werkt, maar `EditContractDialog` mist validatie op einddatum < startdatum. Contractstatus-wijziging (activeren/deactiveren) heeft geen bevestigingsdialog. | Slechte UX bij foutieve invoer |
| 31 | **Tendering / Charter** | `CarrierPools.tsx` en `CarrierScorecards.tsx` werken, maar er is geen "RFQ aanmaken" of "Tender uitschrijven" functie — alleen pool/scorecard beheer. De `rfq-parser` edge fn bestaat maar is niet gekoppeld aan een UI. | Kern van tendering ontbreekt |
| 32 | **WhatsApp Chat** | Templates bestaan in `SendReminderDialog` maar daadwerkelijke WhatsApp API-integratie (MessageBird/Twilio) is niet geconfigureerd — berichten worden alleen lokaal gelogd, niet verzonden. | WhatsApp berichten worden niet verstuurd |
| 33 | **UBL Export** | Toggle bestaat in `InvoiceEmailComposer` (`include_ubl: true/false`) maar de `send-invoice-email` edge fn genereert geen UBL XML — de flag wordt doorgestuurd maar niet verwerkt. | UBL bijlage is leeg/ontbreekt |
| 34 | **Multi-vestiging** | `MultiLocation.tsx` werkt voor CRUD op `company_locations`, maar locatie-selectie wordt nergens gebruikt in order-creatie of filtering. | Feature bestaat maar is niet geïntegreerd |
| 35 | **White Label** | Sidebar linkt naar `/admin/settings` (algemene instellingen) — geen dedicated branding-pagina. Logo/naam upload werkt via `useCompany` maar er is geen kleurconfiguratie of thema-aanpassing. | Basis branding, geen volledige white-label |
| 36 | **Fleet Management** | Zojuist geoptimaliseerd. `MaintenanceManagement` en `FuelManagement` gebruiken `(supabase as any)` — `maintenance_orders` tabel mist in TypeScript types. | Runtime werkt maar geen type safety |
| 37 | **Messenger** | Werkt maar trip-gebonden chat is niet ideaal voor algemene communicatie. Geen directe chauffeur-lijst — je moet eerst een trip selecteren. | UX-beperking bij snelle communicatie |

## Prioriteiten voor Launch-Fix

### Batch 1 — Kritiek (functies die NIET werken)

1. **Dienstplanning (Rosters)**: Voeg shift CRUD toe — "Dienst toevoegen" dialog met chauffeur, datum, start/eind tijd. Fix `program_shifts` query.

2. **UBL Export**: Implementeer UBL 2.1 XML generatie in `send-invoice-email` edge fn of als aparte helper. Koppel aan de `include_ubl` flag.

3. **Tendering / RFQ**: Voeg een "Tender aanmaken" formulier toe dat een RFQ naar carrier pools stuurt via de bestaande `rfq-parser` edge fn.

### Batch 2 — Medium (functies die GEDEELTELIJK werken)

4. **Multi-vestiging integratie**: Voeg locatie-selector toe aan het orderformulier zodat orders aan een vestiging gekoppeld worden.

5. **WhatsApp sending**: De UI en templates zijn klaar. De daadwerkelijke verzending vereist een MessageBird/Twilio API key — documenteer dit als "configureerbaar" en zorg dat de edge fn klaar staat.

6. **White Label branding page**: Maak een dedicated sectie in admin/settings met kleur-picker en logo upload preview.

### Batch 3 — Polish

7. **Fleet type safety**: Voeg `maintenance_orders` en `fuel_transactions` aan de database types toe (of houd `as any` cast als bewuste keuze).

8. **Messenger UX**: Voeg een "Alle chauffeurs" lijst toe naast trip-chat voor directe communicatie.

9. **Tariefcontracten validatie**: Einddatum-check en bevestigingsdialog voor statuswijziging.

## Technische Details

### UBL 2.1 XML Generator
```typescript
// In send-invoice-email edge fn
function generateUBL(invoice: Invoice): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${invoice.invoice_number}</ID>
  <IssueDate>${invoice.invoice_date}</IssueDate>
  <DueDate>${invoice.due_date}</DueDate>
  <InvoiceTypeCode>380</InvoiceTypeCode>
  <DocumentCurrencyCode>EUR</DocumentCurrencyCode>
  ...
</Invoice>`;
}
```

### Rosters Shift CRUD
```typescript
// Nieuwe dialog in Rosters.tsx
const handleAddShift = async (shift: {
  assigned_driver_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}) => {
  const { error } = await supabase
    .from('program_shifts')
    .insert({ ...shift, company_id: companyId, status: 'planned' });
};
```

### Multi-vestiging Order Koppeling
```typescript
// In OrderForm.tsx — voeg location_id selector toe
<Select value={orderDetails.location_id} onValueChange={...}>
  {locations.map(loc => (
    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
  ))}
</Select>
```

## Wat NIET wordt aangepast (geen dubbel werk)
- Alle 28 werkende functies
- Edge functions die al gefixed zijn in vorige batches
- Database migraties die al uitgevoerd zijn
- Vlootpagina UI (zojuist geoptimaliseerd)

## Geschatte Omvang
- **Batch 1**: 3 componenten + 1 edge fn update
- **Batch 2**: 3 kleine wijzigingen
- **Batch 3**: 3 polish items
- Totaal: ~9 gerichte fixes, geen grote refactors


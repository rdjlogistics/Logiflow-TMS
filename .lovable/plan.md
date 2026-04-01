

# Kritieke Waterdichting — TMS Software Audit

## Gevonden Issues (op volgorde van ernst)

---

### 1. KRITIEK: `send-sms` edge function bestaat NIET
**Impact**: SMS-knop bij chauffeurs (`DriverSmsButton`) faalt altijd silently.
**Fix**: Maak `supabase/functions/send-sms/index.ts` met MessageBird API integratie. Graceful fallback als `MESSAGEBIRD_API_KEY` niet geconfigureerd is.

---

### 2. KRITIEK: Stats-functies negeren tenant-isolatie
Vier functies halen data op ZONDER `company_id`/`tenant_id` filter — ze tellen data van ALLE bedrijven:

| Functie | Bestand | Probleem |
|---------|---------|----------|
| `fetchInvoiceStats()` | `src/services/invoices.ts` | Geen `company_id` filter |
| `fetchOverdueInvoices()` | `src/services/invoices.ts` | Geen `company_id` filter |
| `fetchCustomerStats()` | `src/services/customers.ts` | Geen `tenant_id` filter |
| `fetchDriverStats()` | `src/services/drivers.ts` | Geen `tenant_id` filter |
| `fetchCarrierStats()` | `src/services/carriers.ts` | Geen `tenant_id` filter |

**Impact**: Dashboard-statistieken tonen data van andere bedrijven. Hoewel RLS dit op database-niveau blokkeert, is het best practice om altijd te filteren op tenant.
**Fix**: Voeg `companyId` parameter toe aan alle stats-functies en pas de aanroepende hooks aan.

---

### 3. HOOG: Invoices delete zonder tenant-check cascade
**Bestand**: `src/pages/Invoices.tsx` regel 274-278
```
await supabase.from("invoice_lines").delete().in("invoice_id", ids);
await supabase.from("invoices").delete().in("id", ids);
```
De batch-delete filtert alleen op ID's zonder status-check (alleen `concept` mag verwijderd worden). De enkele delete heeft wél die guard (regel 234), maar de batch niet.
**Fix**: Voeg `.eq("status", "concept")` toe aan de batch-delete.

---

### 4. HOOG: Trips hard-delete i.p.v. soft-delete
**Bestand**: `src/pages/Trips.tsx` regel 205
```
await supabase.from("trips").delete().eq("id", tripToDelete);
```
Terwijl `src/services/trips.ts` een `softDeleteTrip()` functie heeft, gebruikt de Trips-pagina een harde delete. Dit is onherstelbaar.
**Fix**: Vervang door `softDeleteTrip(tripToDelete)`.

---

### 5. MIDDEL: Supabase 1000-row default limiet niet afgehandeld
De `fetchTrips()` en `fetchCustomers()` functies hebben geen expliciete limiet als `filters.limit` niet meegegeven wordt. Bij >1000 records worden resultaten stilletjes afgekapt.
**Fix**: Voeg `.limit(5000)` toe als default of documenteer de beperking.

---

## Plan van Aanpak

| # | Fix | Bestand | Ernst |
|---|-----|---------|-------|
| 1 | Maak `send-sms` edge function | **Nieuw**: `supabase/functions/send-sms/index.ts` | Kritiek |
| 2 | Tenant-filter toevoegen aan 5 stats-functies | **Edit**: `invoices.ts`, `customers.ts`, `drivers.ts`, `carriers.ts` + hun hooks | Kritiek |
| 3 | Batch-delete invoice status guard | **Edit**: `src/pages/Invoices.tsx` | Hoog |
| 4 | Trips hard-delete → soft-delete | **Edit**: `src/pages/Trips.tsx` | Hoog |
| 5 | Default query limiet verhogen | **Edit**: `src/services/trips.ts`, `customers.ts` | Middel |


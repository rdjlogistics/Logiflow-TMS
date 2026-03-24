

# Plan: Ontbrekende `create-batch-invoices` Edge Function

## Probleem
De BatchInvoiceWizard frontend is compleet, maar roept `create-batch-invoices` aan — een edge function die niet bestaat. Alleen de inkoop-variant (`create-batch-purchase-invoices`) is gebouwd.

## Oplossing

### 1. Nieuw: `supabase/functions/create-batch-invoices/index.ts`
Gebaseerd op het bestaande `create-batch-purchase-invoices` patroon:

- Auth verificatie + tenant lookup via `user_companies`
- Trips ophalen per geselecteerde klant (`status IN ('afgerond', 'gecontroleerd')`, `invoice_id IS NULL`, periode filter)
- Per klant:
  - BTW bepalen op basis van klant land/BTW-nummer (NL logica uit `btw-calculator`)
  - Factuurnummer via `get_next_invoice_number(company_id)`
  - Betaaltermijn ophalen uit `customers.payment_terms_days` (fallback 30)
  - `invoices` record aanmaken (status `concept`)
  - `invoice_lines` records per trip
  - Trips updaten: `invoice_id` koppelen
- Rollback bij fout per klant
- Response: `{ invoices_created, total_amount, invoices: [...] }`

### 2. Fix: `src/components/invoices/BatchInvoiceWizard.tsx`
- `company_id` filter toevoegen aan de trips query (multi-tenant veiligheid)

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/create-batch-invoices/index.ts` | **Nieuw** |
| `src/components/invoices/BatchInvoiceWizard.tsx` | Kleine fix: `company_id` filter |

Geen nieuwe tabellen of migraties nodig — alles gebruikt bestaande `invoices`, `invoice_lines` en `trips` tabellen.


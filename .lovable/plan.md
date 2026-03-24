

# Plan: Onafgemaakte Batches — Fixes & Perfectie

## Gevonden Problemen

### Kritiek
1. **Sales batch edge function niet gedeployed** — `create-batch-invoices` is aangemaakt maar nooit gedeployed (0 logs). De wizard faalt altijd.
2. **Purchase batch: geen factuurregels** — `create-batch-purchase-invoices` maakt wél de factuur en koppelt trips, maar **maakt GEEN `purchase_invoice_lines` records aan**. Hierdoor is de factuur leeg (geen regels, geen PDF inhoud).

### Multi-tenant hardening
3. **Purchase wizard trips query** mist `company_id` filter (RLS beschermt, maar expliciet is beter)
4. **Purchase wizard carriers query** mist `tenant_id` filter
5. **Sales wizard customers query** mist `tenant_id` filter

## Oplossing

### 1. Deploy `create-batch-invoices` edge function
De code is compleet en correct — alleen deployen.

### 2. Fix `create-batch-purchase-invoices`: factuurregels toevoegen
Na het aanmaken van de purchase invoice, per trip een `purchase_invoice_lines` record inserteren:

```
{
  purchase_invoice_id: invoice.id,
  trip_id: trip.id,
  description: `Order ${trip.order_number || trip.id}`,
  quantity: 1,
  unit_price: trip.purchase_total,
  total_price: trip.purchase_total,
  vat_percentage: 21,
  vat_amount: Math.round(purchase_total * 0.21 * 100) / 100,
  line_type: 'transport'
}
```
Met rollback bij fout (delete invoice als lines falen).

### 3. Multi-tenant filters toevoegen
- `BatchPurchaseInvoiceWizard.tsx`: `useCompany` hook importeren, `company_id` filter op trips query, `tenant_id` filter op carriers query
- `BatchInvoiceWizard.tsx`: `tenant_id` filter op customers query

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/create-batch-purchase-invoices/index.ts` | Invoice lines toevoegen na invoice insert + rollback |
| `src/components/purchase-invoices/BatchPurchaseInvoiceWizard.tsx` | `company_id` op trips, `tenant_id` op carriers |
| `src/components/invoices/BatchInvoiceWizard.tsx` | `tenant_id` op customers query |
| Deploy | `create-batch-invoices` deployen |


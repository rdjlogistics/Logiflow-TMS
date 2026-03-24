

# Plan: Onafgemaakte Batches — Fixes & Perfectie

## Probleem

De Batch Purchase Invoice Wizard (Step 2 → Step 3) kan niet werken omdat:

1. **Ontbrekende edge function `create-batch-purchase-invoices`** — de wizard roept deze aan in Step 2, maar de functie bestaat niet. Resultaat: facturen worden nooit aangemaakt.
2. **Ontbrekende edge function `generate-purchase-invoice-pdf`** — Step 3 "Download PDFs" roept deze aan, ook niet bestaand.

Het hele flow van "preview → facturen aanmaken → PDFs downloaden" is dus **dood**.

## Oplossing

### 1. Edge function `create-batch-purchase-invoices` aanmaken

Nieuwe edge function die:
- Ontvangt: `carrier_id`, `period_from`, `period_to`, `invoice_date`, `is_self_billing`, `footnote`
- Zoekt alle trips met status `afgerond`/`gecontroleerd`, zonder `purchase_invoice_id`, binnen de periode
- Genereert een factuurnummer via `get_next_purchase_invoice_number` RPC
- Maakt een `purchase_invoices` record aan met subtotaal, BTW (21%), totaal, periode, footnote
- Koppelt alle gevonden trips aan de factuur (`purchase_invoice_id` update)
- Retourneert `{ invoices: [{ id, invoice_number, carrier_name, total_amount }] }`

### 2. Edge function `generate-purchase-invoice-pdf` aanmaken

Nieuwe edge function die:
- Ontvangt: `invoiceId`
- Haalt factuur + gekoppelde trips + carrier gegevens op
- Genereert een professionele PDF (via HTML → base64) met:
  - Factuurnummer, datum, periode
  - Carrier gegevens
  - Rittenlijst met tariefberekening
  - Subtotaal, BTW, totaal
  - Optionele footnote
- Retourneert `{ pdf: "base64..." }`

### 3. Minor wizard fix

In `BatchPurchaseInvoiceWizard.tsx`:
- Na succesvolle factuurcreatie het `response.data` formaat correct afhandelen (de edge function retourneert direct een array, niet altijd nested `invoices`)

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/create-batch-purchase-invoices/index.ts` | **Nieuw** — batch factuur creatie logica |
| `supabase/functions/generate-purchase-invoice-pdf/index.ts` | **Nieuw** — PDF generatie |
| `src/components/purchase-invoices/BatchPurchaseInvoiceWizard.tsx` | Minor: robuustere response handling |


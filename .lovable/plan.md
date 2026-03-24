

# Onafgemaakte Batches — Fixes & Perfectie

## Gevonden Problemen

### 1. PDF generatie crasht bij grote facturen (KRITIEK)
In `generate-purchase-invoice-pdf/index.ts` regel 244:
```js
const base64Html = btoa(String.fromCharCode(...htmlBytes));
```
De spread operator (`...`) op een grote Uint8Array overschrijdt de maximum call stack size. Bij facturen met 20+ ritten zal dit crashen.

### 2. Edge functions mogelijk niet deployed
Geen logs gevonden voor beide functies. Moeten (her)deployed worden.

### 3. Preview totalen inconsistent met factuur
Step 2 toont `group.subtotal * 1.21` als "Totaal incl. BTW", maar de echte BTW-berekening in de edge function rondt per factuur af. Kleine afrondingsverschillen mogelijk.

### 4. Geen error handling bij lege resultaten na creatie
Als `createInvoicesMutation` slaagt maar `results` leeg is (alle carriers faalden met `continue`), gaat de wizard toch naar Step 3 met een lege lijst.

## Wijzigingen

### 1. `supabase/functions/generate-purchase-invoice-pdf/index.ts`
Fix base64 encoding met chunked approach:
```js
// Replace spread operator with chunked conversion
let binary = '';
for (let i = 0; i < htmlBytes.length; i++) {
  binary += String.fromCharCode(htmlBytes[i]);
}
const base64Html = btoa(binary);
```

### 2. `src/components/purchase-invoices/BatchPurchaseInvoiceWizard.tsx`
- Guard tegen lege resultaten: als `results.length === 0` na de loop, throw error
- Wizard gaat alleen naar Step 3 als er daadwerkelijk facturen zijn aangemaakt

### 3. Deploy edge functions
Beide functies deployen: `create-batch-purchase-invoices` en `generate-purchase-invoice-pdf`

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/generate-purchase-invoice-pdf/index.ts` | Fix btoa crash voor grote facturen |
| `src/components/purchase-invoices/BatchPurchaseInvoiceWizard.tsx` | Guard tegen lege resultaten |


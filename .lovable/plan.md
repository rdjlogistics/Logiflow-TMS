

# Non-Functional Buttons Audit — Ronde 7

## Resultaat

Na een grondige scan van alle edge function invocaties, parameter-patronen, fake delays, en toast-only handlers is er **1 kritiek probleem** gevonden:

### `send-purchase-invoice-email` — Parameter mismatch (KRITIEK)

**Edge function** (`supabase/functions/send-purchase-invoice-email/index.ts` regel 16) destructureert:
```
{ invoiceId, to, subject, body }
```

**Callers** sturen compleet andere veldnamen:

`PurchaseInvoiceEmailComposer.tsx`:
```
{ purchase_invoice_id, recipient_emails, email_subject, email_body, include_pdf, document_ids }
```

`PurchaseInvoiceBulkActions.tsx`:
```
{ purchase_invoice_id, recipient_emails, email_subject, email_body, include_pdf }
```

**Resultaat**: `invoiceId` = `undefined` → 400 error "invoiceId en to verplicht". Geen enkele inkoopfactuur-email wordt ooit verstuurd.

**Fix**: Edge function aanpassen om beide sets parameter-namen te accepteren (backwards compatible), inclusief het versturen naar meerdere ontvangers (`recipient_emails` is een array).

---

## Overige bevindingen (geen fix nodig)

Alle andere edge functions zijn in eerdere rondes al gefixt of waren correct:
- `send-order-confirmation` — gefixt ronde 6
- `send-document-email` — gefixt ronde 6
- `send-push-notification` — gefixt ronde 6
- `auto-send-vrachtbrief` — gefixt ronde 5
- `generate-document-pdf` — gefixt ronde 6
- `send-customer-notification` — gefixt ronde 5
- `send-invoice-email` — accepteert al beide varianten
- `send-invoice-reminder` — parameters matchen
- `send-order-rejection` — parameters matchen
- `send-delivery-confirmation` — parameters matchen
- `generate-invoice-pdf` — parameters matchen
- Alle `await new Promise(setTimeout)` zijn legitieme retries of progress bars

## Wijzigingen

| # | Bestand | Probleem | Fix |
|---|---------|----------|-----|
| 1 | `supabase/functions/send-purchase-invoice-email/index.ts` | Verwacht `invoiceId`+`to`, ontvangt `purchase_invoice_id`+`recipient_emails`+`email_subject`+`email_body` | Accepteer beide + loop over meerdere ontvangers |

Totaal: 1 edge function. Geen frontend wijzigingen nodig. Na deployment werken inkoopfactuur-emails end-to-end.


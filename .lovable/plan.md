

# Fix: send-invoice-email Parameter Mismatch

## Probleem
De client stuurt `invoice_id`, `recipient_emails`, `email_subject`, `email_body` maar de Edge Function verwacht `invoiceId`, `to`, `subject`, `body`. Hierdoor faalt de validatie met "invoiceId, to en subject zijn verplicht".

## Fix
**Bestand**: `supabase/functions/send-invoice-email/index.ts` — regel 52

Wijzig de destructuring om BEIDE naamgevingen te accepteren (backward compatible):

```typescript
const body = await req.json();
const invoiceId = body.invoiceId || body.invoice_id;
const to = body.to || body.recipient_emails;
const subject = body.subject || body.email_subject;
const bodyHtml = body.body || body.email_body;
const cc = body.cc;
const bcc = body.bcc;
const attachPdf = body.attachPdf ?? body.include_pdf;
```

Dit lost het probleem op voor zowel de `InvoiceEmailComposer`, de `sendInvoiceEmail` helper in `email.ts`, als de test-call in `EmailDomainTab.tsx`.

| # | Wijziging | Bestand |
|---|-----------|---------|
| 1 | Accepteer beide parameternamen | `supabase/functions/send-invoice-email/index.ts` |


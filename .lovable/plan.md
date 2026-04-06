

# Launch Audit & Fix Plan — RDJ Logistics

## Gevonden bugs (kritiek)

| # | Probleem | Locatie | Impact |
|---|----------|---------|--------|
| 1 | `send-transactional-email` insert `tenant_id` en `sent_by` in `email_send_log` — kolommen bestaan NIET | `send-transactional-email/index.ts` L170-177, L223-230 | Alle email-logging faalt stil — geen audit trail |
| 2 | `proactive-alerts` queried `profiles.company_id` en `profiles.role` — bestaan NIET | `proactive-alerts/index.ts` L114-119 | Driver document alerts crashen, hele proactive-alerts sectie 3 broken |
| 3 | `email_send_log` mist `tenant_id` kolom | Database schema | Geen tenant-filtering mogelijk op email logs |

## Gevonden bugs (medium)

| # | Probleem | Locatie | Impact |
|---|----------|---------|--------|
| 4 | `send-transactional-email` email-log per recipient niet gekoppeld aan juiste `message_id` | L222-230: `messageIds` wordt als bulk array gebouwd maar log-insert per recipient pakt niet de juiste ID | Deduplicatie in email dashboard incorrect |
| 5 | BatchStatusWidget referencet 3 cron jobs maar `diesel-price-update` en `check-overdue-invoices` gebruiken service-role auth — frontend invoke met user JWT zal 401 geven | `BatchStatusWidget.tsx` | "Dagelijkse Batches" knoppen falen voor 2/3 jobs |
| 6 | Email Inbox AI Intake tab: `useEmailOrderIntake` cast via `(supabase as any)` — TypeScript types niet gesynchroniseerd | `useEmailOrderIntake.ts` L46 | Werkt runtime maar geen type safety |

## Stappen

### Stap 1: Database migratie — `email_send_log` uitbreiden
Voeg `tenant_id` (uuid, nullable) en `sent_by` (uuid, nullable) kolommen toe. Dit fixeert bug #1 en #3.

### Stap 2: Fix `send-transactional-email` email logging
Corrigeer de insert zodat elke recipient zijn eigen `message_id` krijgt (nu wordt per-email Resend response ID correct gekoppeld). Verplaats `tenant_id`/`sent_by` naar `metadata` als fallback zolang migratie nog niet live is.

### Stap 3: Fix `proactive-alerts` driver documents query
Vervang `profiles.company_id`/`role` query door `drivers` tabel met `tenant_id` filter. Drivers tabel heeft `tenant_id` en `user_id` — gebruik die voor `driver_documents` lookup.

### Stap 4: Fix BatchStatusWidget auth
De 3 batch jobs (`process-email-queue`, `check-overdue-invoices`, `diesel-price-update`) moeten vanuit de frontend met user JWT werken. `check-overdue-invoices` en `diesel-price-update` gebruiken direct service-role — voeg user JWT validatie toe als alternatief pad, of laat de widget via de service key communiceren via een proxy-pattern.

### Stap 5: Redeploy alle gefixte functies
- `send-transactional-email`
- `proactive-alerts`
- `check-overdue-invoices` (indien aangepast)

### Stap 6: Update memory file
Werk `.lovable/memory/edge-function-bugfix-audit-2026-04.md` bij met de nieuwe bevindingen.

### Stap 7: End-to-end verificatie
- Invoke `send-transactional-email` en controleer `email_send_log` insert
- Invoke `proactive-alerts` en controleer dat driver docs sectie geen crash geeft
- Test BatchStatusWidget knoppen

## Niet aangepast (geen dubbel werk)
- `dispatch-notify`, `send-push-notification`, `intelligent-dispatch`: reeds gefixd in vorige ronde
- `execute-workflow`, `send-invoice-email`, `process-email-queue`: gebruiken correcte kolommen
- Alle 67 edge functions: reeds gedeployed met correcte CORS headers

## Technische details

### email_send_log schema update
```sql
ALTER TABLE email_send_log ADD COLUMN tenant_id uuid REFERENCES companies(id);
ALTER TABLE email_send_log ADD COLUMN sent_by uuid;
```

### proactive-alerts fix
```typescript
// VOOR (broken):
const { data: tenantDrivers } = await supabase
  .from("profiles").select("id").eq("company_id", tenantId).eq("role", "driver");

// NA (correct):
const { data: tenantDrivers } = await supabase
  .from("drivers").select("id, user_id").eq("tenant_id", tenantId).is("deleted_at", null);
// Dan user_id's gebruiken voor driver_documents lookup
```

### send-transactional-email fix
```typescript
// Fix per-recipient message_id tracking
for (let i = 0; i < validRecipients.length; i++) {
  const email = validRecipients[i];
  // ... send via Resend ...
  await supabaseAdmin.from("email_send_log").insert({
    template_name: tplName,
    recipient_email: email,
    status: resp.ok ? "sent" : "failed",
    message_id: resp.ok ? result.id : null,
    metadata: { tenant_id: tenantId, sent_by: userId, subject },
  });
}
```


# Edge Function Bugfix Audit — April 2026

## Gevonden & Gefixte Bugs

### 1. Kolom-mismatches `notifications` tabel
**Probleem**: Meerdere functies gebruikten `is_read: false`, `body`, en `data` kolommen die niet bestaan.
**Juiste kolommen**: `message` (niet `body`), `status: "pending"` (niet `is_read`), `channel: "in_app"`, `metadata` (niet `data`).
**Gefixte functies**: `dispatch-notify`, `send-push-notification`, `notify-new-submission`, `process-inbound-order`

### 2. Kolom-mismatches `email_send_log` tabel
**Probleem**: Functies gebruikten `to_email`, `to_address`, `subject`, `company_id`, `provider`, `provider_message_id` — die bestaan niet.
**Juiste kolommen**: `recipient_email`, `template_name`, `status`, `message_id`, `metadata`, `error_message`, `created_at`, `tenant_id`, `sent_by`
**Gefixte functies**: `send-invoice-email`, `execute-workflow`, `process-email-queue`, `send-transactional-email`

### 3. `dispatch-notify` sub-functie aanroep
**Probleem**: Riep `supabase.functions.invoke("send-push-notification")` aan via anonClient zonder correcte auth-propagatie.
**Fix**: Directe insert in `notifications` tabel via admin client, geen sub-functie meer nodig.

### 4. `intelligent-dispatch` verkeerde tabel
**Probleem**: Gebruikte `profiles` tabel (user_id, full_name) in plaats van `drivers` tabel (id, name).
**Fix**: Query gewijzigd naar `drivers` tabel met correcte kolommen.

### 5. `send-push-notification-to-planners` verkeerde tenant-check
**Probleem**: Filterde planners via `profiles.company_id` die niet bestaat.
**Fix**: Gebruikt nu `user_companies` tabel voor tenant filtering.

### 6. `generate-invoice-pdf` retourneert HTML
**Probleem**: Retourneert HTML als base64 met `{ pdf: base64, html: true }`, frontend behandelde dit als binaire PDF.
**Fix**: Frontend opent nu HTML in nieuw venster met print-dialog wanneer `html: true`.

### 7. `proactive-alerts` verkeerde tabel voor driver documents
**Probleem**: Queried `profiles.company_id` en `profiles.role` — kolommen bestaan NIET.
**Fix**: Vervangen door `drivers` tabel met `tenant_id` filter en `user_id` voor document lookup.

### 8. `send-transactional-email` email logging per recipient
**Probleem**: `message_id` werd als bulk array opgebouwd, log-insert per recipient had verkeerde ID koppeling.
**Fix**: Per-recipient send loop met individuele `message_id` tracking en correcte error handling.

### 9. `email_send_log` ontbrekende kolommen
**Probleem**: `tenant_id` en `sent_by` kolommen bestonden niet in de tabel.
**Fix**: Database migratie uitgevoerd om beide kolommen toe te voegen.

### 10. `check-overdue-invoices` en `diesel-price-update` auth
**Probleem**: Functies accepteerden alleen service-role auth, dashboard widget stuurt user JWT → 401.
**Fix**: Dual-auth pattern: accepteert zowel service-role (cron) als user JWT (dashboard widget).

## Structurele Patronen (ter preventie)

### Notifications tabel schema
```
id, tenant_id, user_id, type, title, message, priority, channel, status, 
entity_type, entity_id, action_url, metadata, sent_at, read_at, failed_reason, created_at
```

### email_send_log tabel schema
```
id, message_id, template_name, recipient_email, status, error_message, metadata, created_at, tenant_id, sent_by
```

### Tenant resolutie standaard
Altijd via `user_companies` tabel, NOOIT via `profiles.company_id`:
```typescript
const { data: uc } = await supabaseAdmin
  .from("user_companies")
  .select("company_id")
  .eq("user_id", userId)
  .eq("is_primary", true)
  .limit(1)
  .maybeSingle();
```

### Driver lookup standaard
Altijd via `drivers` tabel, NOOIT via `profiles.role`:
```typescript
const { data: tenantDrivers } = await supabase
  .from("drivers")
  .select("id, user_id")
  .eq("tenant_id", tenantId)
  .is("deleted_at", null);
```

### Edge Function auth standaard (dual-auth)
Functies die zowel via cron als dashboard worden aangeroepen:
```typescript
const token = authHeader.replace("Bearer ", "");
if (token !== serviceKey) {
  const { data: { user }, error } = await createClient(url, anonKey).auth.getUser(token);
  if (error || !user) return unauthorized();
}
// Gebruik altijd service-role client voor database operaties
const supabaseAdmin = createClient(url, serviceKey);
```

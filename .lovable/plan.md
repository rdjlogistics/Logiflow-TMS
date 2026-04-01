

# Audit: Workflow & Batch Systemen — Bevindingen & Verbeteringen

## Methode

Alle edge functions, database triggers, frontend integraties en e-mail pipelines zijn regel-voor-regel doorgelopen. Hieronder alle gevonden issues, gerangschikt op ernst.

---

## Kritieke Bugs

### Bug 1: Invoice trigger verwijst naar niet-bestaand kolom `total_incl_btw`

**Bestand**: `supabase/migrations/...1e9753a0...sql` regel 121
**Probleem**: De trigger `trigger_workflow_on_invoice_event()` verwijst naar `NEW.total_incl_btw`, maar de `invoices` tabel heeft alleen `total_amount`. Dit zorgt ervoor dat de trigger faalt bij elke factuur-insert, waardoor `invoice_created` workflows **nooit** worden getriggerd.
**Fix**: SQL migratie: `ALTER` de trigger function, vervang `NEW.total_incl_btw` door `NEW.total_amount`.

### Bug 2: execute-workflow `send_email` action roept verkeerde RPC aan

**Bestand**: `supabase/functions/execute-workflow/index.ts` regels 206-211
**Probleem**: De `send_email` action roept `supabase.rpc("send_email_batch")` aan — maar dit is de **read** functie van pgmq (leest berichten), niet de **write** functie (plaatst berichten). De e-mail wordt dus nooit in de queue geplaatst. De fallback `email_send_log` insert maakt wel een log-entry aan met status "pending", maar die wordt door `process-email-queue` nooit opgepakt (die leest uit pgmq, niet uit `email_send_log`).
**Fix**: Vervang de RPC-call door een directe pgmq `send` call, of stuur de e-mail direct via Resend (zoals `send-invoice-reminder` doet).

### Bug 3: execute-workflow delay_minutes blokkeert de hele function

**Bestand**: `supabase/functions/execute-workflow/index.ts` regel 122-124
**Probleem**: `await new Promise((r) => setTimeout(r, action.delay_minutes * 60 * 1000))` — bij een delay van bijv. 5 minuten blokkeert de edge function 5 minuten lang. Edge functions hebben een timeout van 60 seconden standaard. Delays > 1 minuut zorgen voor een timeout crash.
**Fix**: Verwijder de in-process delay. Implementeer delays via een scheduled re-invocation of markeer de actie als "scheduled" en laat een cron job vertraagde acties oppakken.

---

## Middelmatige Issues

### Issue 4: check-overdue-invoices deduplicatie is kapot

**Bestand**: `supabase/functions/check-overdue-invoices/index.ts` regels 70-74
**Probleem**: De `alreadyTriggered` variabele heeft een callback die altijd `true` retourneert (`return true;`), maar wordt daarna nooit gebruikt — de code checkt alleen `existingRuns.length > 0`. Dit betekent dat de threshold-specifieke deduplicatie niet werkt: als een factuur al eens getriggered is (op dag 7), wordt deze nooit meer getriggered (op dag 14 of 30), omdat het de vorige run vindt en skipt.
**Fix**: Filter `existingRuns` op het specifieke `threshold` veld in `trigger_event`, niet alleen op `invoice_id`.

### Issue 5: execute-workflow `log_event` action ontbreekt

**Bestand**: `supabase/functions/execute-workflow/index.ts`
**Probleem**: De `log_event` action type (die we als actie 2 aan de test-workflow hebben toegevoegd) valt in de `default` case en logt alleen een warning. Er wordt niets daadwerkelijk gelogd in een tabel.
**Fix**: Voeg een `log_event` case toe die een record insert in een audit/events tabel of in `workflow_runs.actions_executed`.

### Issue 6: create-batch-invoices mist `company_id` filter op auth

**Bestand**: `supabase/functions/create-batch-invoices/index.ts`
**Probleem**: De functie haalt `company_id` op via `user_companies`, maar valideert niet of de meegegeven `selected_customer_ids` ook bij dat bedrijf horen. Een kwaadwillende gebruiker zou customer IDs van een ander bedrijf kunnen meesturen. De trips-query filtert wel op `company_id`, dus de impact is beperkt (geen ritten van andere bedrijven), maar het is een defense-in-depth gap.
**Fix**: Voeg een expliciete check toe: `customers.company_id = companyId`.

---

## Kleine Verbeteringen

### Verbetering 7: purchase-invoices BTW is hardcoded op 21%
De `create-batch-purchase-invoices` gebruikt altijd 21% BTW (regel 97-98), terwijl `create-batch-invoices` de slimme `berekenBTW()` functie heeft die rekening houdt met EU/niet-EU en BTW-verlegd. Kopieer dezelfde BTW-logica naar de purchase invoice function.

### Verbetering 8: Workflow trigger mist customer-data
De trip trigger (`trigger_workflow_on_trip_event`) stuurt alleen `customer_id` mee, niet de klantgegevens (naam, e-mail). De `resolveTemplate("{{customer.email}}")` in execute-workflow kan daardoor nooit een e-mailadres resolven — `trigger_data.customer` bestaat niet als object, alleen als `customer_id` string.
**Fix**: In execute-workflow, wanneer `trigger_data.customer_id` bestaat maar `trigger_data.customer` niet, fetch de klantgegevens uit de database.

---

## Plan van Aanpak

| # | Fix | Bestand |
|---|-----|---------|
| 1 | SQL migratie: fix `total_incl_btw` → `total_amount` in invoice trigger | DB migratie |
| 2 | Fix `send_email` action: direct via Resend i.p.v. verkeerde RPC | `execute-workflow/index.ts` |
| 3 | Verwijder `delay_minutes` sleep, log als "delay not supported" | `execute-workflow/index.ts` |
| 4 | Fix threshold-deduplicatie in overdue check | `check-overdue-invoices/index.ts` |
| 5 | Voeg `log_event` case toe | `execute-workflow/index.ts` |
| 6 | Enrichment: fetch customer data als die ontbreekt in trigger_data | `execute-workflow/index.ts` |
| 7 | Purchase invoices: BTW-logica toevoegen | `create-batch-purchase-invoices/index.ts` |


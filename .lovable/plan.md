

# Workflow Engine Afmaken — Execution Backend

## Overzicht

De workflow UI en database zijn klaar, maar er ontbreekt een execution engine. We bouwen een edge function die:
1. Luistert naar database events via een trigger
2. Matching workflows vindt en runs aanmaakt
3. De acties sequentieel uitvoert (email, webhook, status update, etc.)

## Architectuur

```text
[Event trigger op trips tabel]
       │
       ▼
[execute-workflow edge function]
       │
       ├── Match actieve workflows op trigger_type + config
       ├── Maak workflow_run record aan
       ├── Voer acties uit in sequence_order:
       │     ├── send_email → email queue (bestaand)
       │     ├── send_webhook → fetch() naar URL
       │     ├── update_status → trips.status update
       │     ├── send_sms → placeholder/log
       │     ├── notify_slack → Slack webhook POST
       │     └── create_task → insert in tasks tabel
       └── Update run status → completed/failed
```

## Stappen

### Stap 1: Edge Function `execute-workflow`

Nieuwe edge function `supabase/functions/execute-workflow/index.ts`:
- Accepteert JSON payload: `{ trigger_type, trigger_data, tenant_id }`
- Query `workflow_automations` voor matching actieve workflows
- Voor elke match: maak `workflow_run`, voer `workflow_actions` uit in volgorde
- Acties:
  - **send_email**: Stuur via bestaande email queue (pgmq)
  - **send_webhook**: HTTP POST naar geconfigureerde URL
  - **update_status**: Update trips.status via service role
  - **notify_slack**: POST naar Slack webhook URL
  - **create_task/send_sms/send_whatsapp**: Log als placeholder, markeer als completed
- Update `workflow_runs.status` en `workflow_automations.run_count`

### Stap 2: Database trigger op trips tabel

Migratie met een database function + trigger die bij INSERT of UPDATE op `trips`:
- Bij INSERT → roept edge function aan met `trigger_type: 'order_created'`
- Bij status UPDATE → roept edge function aan met `trigger_type: 'order_status_changed'` + old/new status
- Bij driver_id UPDATE → `trigger_type: 'driver_assigned'`
- Gebruikt `pg_net.http_post()` om de edge function async aan te roepen

### Stap 3: Invoice trigger

Migratie met trigger op `invoices` tabel:
- Bij INSERT → `trigger_type: 'invoice_created'`

### Stap 4: Code cleanup

In `useWorkflowAutomation.ts`:
- Verwijder `as any` casts — de types zijn nu beschikbaar in het gegenereerde schema
- Gebruik directe tabel-referenties

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Nieuw** | `supabase/functions/execute-workflow/index.ts` |
| **Migratie** | Trigger function + triggers op trips en invoices |
| **Edit** | `src/hooks/useWorkflowAutomation.ts` — verwijder `as any` casts |

## Resultaat

- Workflows worden automatisch getriggerd bij echte events (order aanmaken, status wijziging, chauffeur toewijzing, factuur aanmaken)
- Acties worden daadwerkelijk uitgevoerd (emails, webhooks, status updates)
- Run history is zichtbaar op de workflow pagina met status en foutmeldingen


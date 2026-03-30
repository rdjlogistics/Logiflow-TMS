

# Test Workflow Automation Aanmaken

## Wat we doen

Een test workflow "Statuswijziging Notificatie" aanmaken via een database insert voor het bedrijf "Bedrijf van Rayan test" (tenant `78bccc6c-...`). De workflow triggert bij elke statuswijziging naar "onderweg" en voert twee acties uit:
1. **E-mail notificatie** naar de klant
2. **Log event** voor audit trail

## Stappen

### Stap 1: Insert workflow + acties via SQL

Eén migratie met:

```sql
-- Workflow: notificatie bij status → onderweg
INSERT INTO workflow_automations (tenant_id, name, description, trigger_type, trigger_config, is_active)
VALUES (
  '78bccc6c-eecd-4a4a-9b71-23e79b754ef6',
  'Statuswijziging → Onderweg Notificatie',
  'Stuurt automatisch een e-mail wanneer een order op onderweg wordt gezet',
  'order_status_changed',
  '{"to_status": "onderweg"}'::jsonb,
  true
);

-- Actie 1: E-mail versturen
INSERT INTO workflow_actions (workflow_id, action_type, action_config, sequence_order, delay_minutes, is_active)
VALUES (
  (SELECT id FROM workflow_automations WHERE name = 'Statuswijziging → Onderweg Notificatie' LIMIT 1),
  'send_email',
  '{"to": "{{customer.email}}", "subject": "Uw zending is onderweg", "body": "Beste klant, uw zending is zojuist opgehaald en is nu onderweg naar het afleveradres."}'::jsonb,
  0, 0, true
);

-- Actie 2: Log event
INSERT INTO workflow_actions (workflow_id, action_type, action_config, sequence_order, delay_minutes, is_active)
VALUES (
  (SELECT id FROM workflow_automations WHERE name = 'Statuswijziging → Onderweg Notificatie' LIMIT 1),
  'log_event',
  '{"message": "Klant genotificeerd over status onderweg"}'::jsonb,
  1, 0, true
);
```

### Geen code-wijzigingen nodig

De workflow UI en execute-workflow edge function bestaan al. De workflow wordt direct zichtbaar op de Workflow Automatie pagina en wordt automatisch getriggerd wanneer een rit-status naar "onderweg" wijzigt.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Migratie** | INSERT workflow + 2 acties |

## Resultaat

- Eerste actieve workflow zichtbaar in het systeem
- Automatische e-mail bij statuswijziging naar "onderweg"
- Testbaar door een rit-status te wijzigen via de trips pagina




# Fix: Workflow Tabellen Aanmaken (Poging 3)

## Probleem

De eerdere migratie `20260330181213` is aangemaakt als bestand maar **niet succesvol toegepast** op de database. De tabellen `workflow_automations`, `workflow_actions` en `workflow_runs` bestaan nog steeds niet.

## Openstaande batches

De openstaande ritten zonder factuur zijn **geen fout** — ze wachten op handmatige facturatie via de wizard. Statussen als "gepland" en "offerte" komen niet in aanmerking voor facturatie. De 7 `afgerond` ritten zonder factuur kunnen handmatig worden gefactureerd wanneer gewenst.

## Plan

### Stap 1: Nieuwe database migratie uitvoeren

Exact dezelfde SQL als eerder, maar nu als nieuwe migratie zodat deze daadwerkelijk wordt toegepast:

- `CREATE TABLE workflow_automations` (tenant_id, name, trigger_type, trigger_config, is_active, etc.)
- `CREATE TABLE workflow_actions` (workflow_id FK, action_type, action_config, sequence_order, etc.)
- `CREATE TABLE workflow_runs` (workflow_id FK, trigger_event, status, error_message, etc.)
- RLS inschakelen op alle 3 tabellen
- Policies op basis van `tenant_id` via `user_companies`

### Stap 2: Verificatie

Query uitvoeren om te bevestigen dat de tabellen bestaan na de migratie.

### Geen code-wijzigingen nodig

De hooks en UI-componenten zijn al correct geschreven voor deze tabelstructuur.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Migratie** | Workflow tabellen + RLS aanmaken |

## Resultaat

- Workflow automatie-pagina functioneert — admins kunnen workflows aanmaken en monitoren
- Email queue: schoon, geen actie nodig
- Batch facturatie: openstaande ritten wachten op handmatige facturatie (correct gedrag)


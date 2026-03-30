

# Fix: Workflow Tabellen Opnieuw Aanmaken

## Probleem

De workflow tabellen (`workflow_automations`, `workflow_actions`, `workflow_runs`) bestaan niet in de database. De eerdere migratie is niet succesvol toegepast. De hele workflow-engine functioneert niet.

## Openstaande batches

De 7 verkoopfactuur- en 5 inkoopfactuur-openstaande ritten zijn **geen fout** — deze wachten op handmatige facturatie via de wizard. Het systeem filtert correct op `sales_total > 0` / `purchase_total > 0`. Geen automatische actie nodig.

## Plan

### Stap 1: Database migratie — Workflow tabellen aanmaken

Nieuwe migratie met:

```sql
CREATE TABLE public.workflow_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  run_count integer DEFAULT 0,
  last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.workflow_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflow_automations(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_config jsonb DEFAULT '{}'::jsonb,
  sequence_order integer DEFAULT 0,
  delay_minutes integer DEFAULT 0,
  condition_expression text,
  is_active boolean DEFAULT true
);

CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES workflow_automations(id) ON DELETE CASCADE,
  trigger_event jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  actions_executed jsonb DEFAULT '[]'::jsonb
);

-- RLS + policies op basis van tenant_id via user_companies
```

### Stap 2: Geen code-wijzigingen nodig

De hooks en UI-componenten zijn al correct geschreven voor deze tabelstructuur.

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Migratie** | Workflow tabellen + RLS aanmaken |

## Resultaat

- Workflow automatie-pagina werkt — queries slagen, admins kunnen workflows aanmaken
- Batch facturatie: openstaande ritten wachten op handmatige facturatie (correct gedrag)
- Email queue: schoon, geen actie nodig


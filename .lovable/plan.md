

# Status Check & Fixes — Batches, Workflows en Email Queue

## Bevindingen

### 1. Workflow Automations — Tabellen bestaan NIET
De tabellen `workflow_automations`, `workflow_actions`, `workflow_runs` zijn nooit aangemaakt in de database. De hele workflow-engine werkt niet — alle queries falen stil door `as any` casts.

**Fix**: Database migratie om de 3 tabellen aan te maken met RLS.

### 2. Batch Facturatie — Geen openstaande batches nodig
- 15 ritten zonder verkoopfactuur, 2 zonder inkoopfactuur
- Allemaal `sales_total = 0` / `purchase_total = 0` → kunnen niet gefactureerd worden (wizard filtert al op `> 0`)
- Geen actie nodig, dit is correct gedrag

### 3. Email Queue — 21 vastgelopen emails opruimen
- 15 `failed` + 3 `dlq` + 3 `pending` emails in `email_send_log` van 19 maart
- Fouten: `missing_parameter: run_id` en `Run not found or expired`
- Dit waren emails van een oudere versie van de queue-functie die nu gefixed is
- De `process-email-queue` functie draait correct via cron maar leest uit pgmq, niet uit `email_send_log`

**Fix**: De vastgelopen emails markeren als `cancelled` zodat ze geen verwarring geven in monitoring.

## Plan

### Stap 1: Workflow tabellen aanmaken (migratie)

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

-- RLS
ALTER TABLE workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

-- Policies voor authenticated users op basis van tenant_id
CREATE POLICY "Users can manage own workflows" ON workflow_automations
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage workflow actions" ON workflow_actions
  FOR ALL TO authenticated
  USING (workflow_id IN (
    SELECT id FROM workflow_automations 
    WHERE tenant_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can view workflow runs" ON workflow_runs
  FOR ALL TO authenticated
  USING (workflow_id IN (
    SELECT id FROM workflow_automations 
    WHERE tenant_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  ));
```

### Stap 2: Vastgelopen emails opruimen (migratie)

```sql
UPDATE email_send_log 
SET status = 'cancelled' 
WHERE status IN ('failed', 'pending', 'dlq') 
  AND created_at < '2026-03-20';
```

### Stap 3: Geen code-wijzigingen nodig
- `useWorkflowAutomation.ts` hook is al correct geschreven voor deze tabelstructuur
- `WorkflowAutomation.tsx` pagina is al gebouwd
- Batch facturatie werkt correct (filtert op `> 0` bedragen)

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Migratie** | Workflow tabellen + RLS aanmaken |
| **Migratie** | Vastgelopen emails opschonen |

## Resultaat
- Workflow automatie-pagina werkt — admins kunnen workflows aanmaken, activeren en monitoren
- Email monitoring toont geen oude gefaalde items meer
- Batch facturatie: geen actie nodig, werkt al correct


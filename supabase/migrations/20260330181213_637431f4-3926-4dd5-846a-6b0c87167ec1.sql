
-- Workflow Automations tables
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

-- Policies
CREATE POLICY "Users can manage own workflows" ON workflow_automations
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage workflow actions" ON workflow_actions
  FOR ALL TO authenticated
  USING (workflow_id IN (
    SELECT id FROM workflow_automations 
    WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can view workflow runs" ON workflow_runs
  FOR ALL TO authenticated
  USING (workflow_id IN (
    SELECT id FROM workflow_automations 
    WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())
  ));

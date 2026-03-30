
-- workflow_automations: DROP + CREATE met WITH CHECK
DROP POLICY IF EXISTS "Users can manage own workflows" ON workflow_automations;
CREATE POLICY "Users can manage own workflows" ON workflow_automations
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- workflow_actions: DROP + CREATE met WITH CHECK
DROP POLICY IF EXISTS "Users can manage workflow actions" ON workflow_actions;
CREATE POLICY "Users can manage workflow actions" ON workflow_actions
  FOR ALL TO authenticated
  USING (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())))
  WITH CHECK (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

-- workflow_runs: DROP + CREATE met WITH CHECK
DROP POLICY IF EXISTS "Users can view workflow runs" ON workflow_runs;
CREATE POLICY "Users can manage workflow runs" ON workflow_runs
  FOR ALL TO authenticated
  USING (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())))
  WITH CHECK (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

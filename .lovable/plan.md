

# Fix RLS Policies — WITH CHECK op Workflow Tabellen

## Probleem

Alle drie workflow tabellen hebben `FOR ALL` policies met alleen een `USING` clausule maar **geen `WITH CHECK`** clausule. Dit betekent dat `SELECT` en `DELETE` werken, maar `INSERT` en `UPDATE` falen met "new row violates row-level security policy".

## Huidige staat

| Tabel | Policy | USING | WITH CHECK |
|-------|--------|-------|------------|
| `workflow_automations` | Users can manage own workflows | ✅ tenant_id check | ❌ NULL |
| `workflow_actions` | Users can manage workflow actions | ✅ workflow_id subquery | ❌ NULL |
| `workflow_runs` | Users can view workflow runs | ✅ workflow_id subquery | ❌ NULL |

## Fix

Eén database migratie die de 3 bestaande policies dropt en opnieuw aanmaakt met identieke `WITH CHECK` clausules:

```sql
-- workflow_automations: DROP + CREATE met WITH CHECK
DROP POLICY "Users can manage own workflows" ON workflow_automations;
CREATE POLICY "Users can manage own workflows" ON workflow_automations
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

-- workflow_actions: DROP + CREATE met WITH CHECK
DROP POLICY "Users can manage workflow actions" ON workflow_actions;
CREATE POLICY "Users can manage workflow actions" ON workflow_actions
  FOR ALL TO authenticated
  USING (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())))
  WITH CHECK (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));

-- workflow_runs: DROP + CREATE met WITH CHECK
DROP POLICY "Users can view workflow runs" ON workflow_runs;
CREATE POLICY "Users can manage workflow runs" ON workflow_runs
  FOR ALL TO authenticated
  USING (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())))
  WITH CHECK (workflow_id IN (SELECT id FROM workflow_automations WHERE tenant_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())));
```

## Bestanden

| Actie | Bestand |
|-------|---------|
| **Migratie** | DROP + CREATE policies met WITH CHECK |

## Resultaat

- INSERT en UPDATE op alle 3 workflow tabellen werken correct
- Geen code-wijzigingen nodig — alleen database policies


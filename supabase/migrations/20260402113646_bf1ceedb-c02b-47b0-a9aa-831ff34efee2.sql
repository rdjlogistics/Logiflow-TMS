
-- Fix 1: damage_reports - broken driver_id = auth.uid() policy
DROP POLICY IF EXISTS "damage_reports_driver" ON public.damage_reports;
CREATE POLICY "damage_reports_driver" ON public.damage_reports
  FOR ALL TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Fix 2: driver_breaks - broken driver_id = auth.uid() policy
DROP POLICY IF EXISTS "driver_breaks_own" ON public.driver_breaks;
CREATE POLICY "driver_breaks_own" ON public.driver_breaks
  FOR ALL TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Fix 3: ai_actions audit - replace ALL with INSERT+SELECT only (no DELETE)
DROP POLICY IF EXISTS "auth_user_copilot_audit" ON public.ai_actions;
CREATE POLICY "ai_actions_user_insert" ON public.ai_actions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_actions_user_select" ON public.ai_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Fix 4: email_domains policy - change from public to authenticated
DROP POLICY IF EXISTS "email_domains_policy" ON public.email_domains;
CREATE POLICY "email_domains_policy" ON public.email_domains
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_company_cached(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_company_cached(auth.uid()));

-- Fix 5: rfq-documents storage UPDATE policy
CREATE POLICY "Staff can update rfq-documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rfq-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.companies
      WHERE id = public.get_user_company_cached(auth.uid())
    )
  );

-- Fix 6: Create RPC for invoice stats (server-side aggregation)
CREATE OR REPLACE FUNCTION public.get_invoice_stats(p_company_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'total_paid', COALESCE(SUM(CASE WHEN status = 'betaald' THEN total_amount ELSE 0 END), 0),
    'total_outstanding', COALESCE(SUM(CASE WHEN status != 'betaald' THEN GREATEST(0, total_amount - COALESCE(amount_paid, 0)) ELSE 0 END), 0),
    'total_overdue', COALESCE(SUM(CASE WHEN status != 'betaald' AND due_date < CURRENT_DATE THEN GREATEST(0, total_amount - COALESCE(amount_paid, 0)) ELSE 0 END), 0),
    'count_overdue', COUNT(*) FILTER (WHERE status != 'betaald' AND due_date < CURRENT_DATE),
    'total', COUNT(*),
    'open_invoices', COUNT(*) FILTER (WHERE status IN ('verzonden', 'vervallen')),
    'pending_payments', COALESCE(SUM(CASE WHEN status != 'betaald' THEN total_amount - COALESCE(amount_paid, 0) ELSE 0 END), 0)
  )
  FROM invoices
  WHERE company_id = p_company_id
$$;

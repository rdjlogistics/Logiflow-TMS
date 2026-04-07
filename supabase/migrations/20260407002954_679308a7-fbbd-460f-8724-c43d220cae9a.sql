
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.client_error_logs;
CREATE POLICY "Authenticated users can insert own error logs" ON public.client_error_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

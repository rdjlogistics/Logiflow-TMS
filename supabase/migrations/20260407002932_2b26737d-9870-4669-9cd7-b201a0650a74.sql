
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.client_error_logs;
CREATE POLICY "Authenticated users can insert error logs" ON public.client_error_logs
FOR INSERT TO authenticated
WITH CHECK (true);

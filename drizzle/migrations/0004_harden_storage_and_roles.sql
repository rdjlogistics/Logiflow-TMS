DROP POLICY IF EXISTS "user_roles_read" ON public.user_roles;

DROP POLICY IF EXISTS "Authenticated users can delete dossier documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read dossier documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dossier documents" ON storage.objects;
CREATE POLICY "Company can read dossier documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dossier-documents' AND (storage.foldername(name))[1] = public.get_user_company_cached(auth.uid())::text);
CREATE POLICY "Company can upload dossier documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dossier-documents' AND (storage.foldername(name))[1] = public.get_user_company_cached(auth.uid())::text);
CREATE POLICY "Company can delete dossier documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dossier-documents' AND (storage.foldername(name))[1] = public.get_user_company_cached(auth.uid())::text);

CREATE OR REPLACE FUNCTION public.can_access_chat_channel(p_channel text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channels c JOIN public.trips t ON t.id = c.trip_id
    WHERE c.id::text = p_channel
      AND (t.company_id = public.get_user_company_cached(auth.uid())
           OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = t.driver_id AND d.user_id = auth.uid()))
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_chat_channel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_chat_channel(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
CREATE POLICY "Channel members can upload chat attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments' AND public.can_access_chat_channel((storage.foldername(name))[1]));
CREATE POLICY "Channel members can view chat attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments' AND public.can_access_chat_channel((storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Authenticated users can upload ai images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.client_error_logs;
CREATE POLICY "Anyone can insert bounded error logs" ON public.client_error_logs FOR INSERT TO anon, authenticated
  WITH CHECK (length(coalesce(error_message,'')) <= 5000 AND length(coalesce(error_stack,'')) <= 20000
              AND (user_id IS NULL OR user_id = auth.uid()));
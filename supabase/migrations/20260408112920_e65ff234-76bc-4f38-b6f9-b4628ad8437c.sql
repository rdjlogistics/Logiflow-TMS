-- Create helper function to check if user has access to a chat channel
CREATE OR REPLACE FUNCTION public.user_has_chat_channel_access(p_channel_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_channels cc
    JOIN public.trips t ON cc.trip_id = t.id
    JOIN public.user_companies uc ON uc.company_id = t.company_id
    WHERE cc.id::text = p_channel_id
    AND uc.user_id = auth.uid()
  );
$$;

-- Drop old permissive chat-attachments policies
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;

-- Create tenant-scoped chat-attachments policies using channel_id as first folder segment
CREATE POLICY "Tenant users can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments' 
  AND public.user_has_chat_channel_access((storage.foldername(name))[1])
);

CREATE POLICY "Tenant users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND public.user_has_chat_channel_access((storage.foldername(name))[1])
);

CREATE POLICY "Tenant users can delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND public.user_has_chat_channel_access((storage.foldername(name))[1])
);

-- Fix saved_reports cross-tenant read: remove is_public cross-tenant sharing
DROP POLICY IF EXISTS "Users can view company reports" ON public.saved_reports;
CREATE POLICY "Users can view company reports" ON public.saved_reports
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT get_user_company_ids(auth.uid()))
);
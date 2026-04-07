
-- Drop the insecure policies
DROP POLICY IF EXISTS "Authenticated users can read dossier documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload dossier documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete dossier documents" ON storage.objects;

-- Tenant-scoped SELECT: user can only read files belonging to their company
CREATE POLICY "Tenant users can read own dossier documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dossier-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.user_companies WHERE user_id = auth.uid()
  )
);

-- Tenant-scoped INSERT: user can only upload to their company's folder
CREATE POLICY "Tenant users can upload own dossier documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dossier-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.user_companies WHERE user_id = auth.uid()
  )
);

-- Tenant-scoped DELETE: user can only delete files in their company's folder
CREATE POLICY "Tenant users can delete own dossier documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'dossier-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.user_companies WHERE user_id = auth.uid()
  )
);

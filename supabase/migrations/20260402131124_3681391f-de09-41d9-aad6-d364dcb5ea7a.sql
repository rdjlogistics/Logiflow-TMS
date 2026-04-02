
-- Create dossier-documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossier-documents', 'dossier-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for dossier-documents bucket
CREATE POLICY "Authenticated users can upload dossier documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dossier-documents');

CREATE POLICY "Authenticated users can read dossier documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dossier-documents');

CREATE POLICY "Authenticated users can delete dossier documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dossier-documents');

-- Create telematics_connections table
CREATE TABLE IF NOT EXISTS public.telematics_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  api_key_encrypted TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_activation',
  sync_interval_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMPTZ,
  vehicles_linked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telematics_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for telematics_connections"
ON public.telematics_connections FOR ALL TO authenticated
USING (tenant_id = public.get_user_company_cached(auth.uid()))
WITH CHECK (tenant_id = public.get_user_company_cached(auth.uid()));

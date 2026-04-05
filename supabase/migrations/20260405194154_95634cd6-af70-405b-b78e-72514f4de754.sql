CREATE TABLE IF NOT EXISTS public.company_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'NL',
  contact_name TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage locations"
ON public.company_locations
FOR ALL
TO authenticated
USING (tenant_id = get_user_company_cached((SELECT auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.company_locations;
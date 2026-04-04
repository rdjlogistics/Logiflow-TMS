
-- Company branches table for multi-location management
CREATE TABLE public.company_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  branch_code TEXT,
  address TEXT,
  house_number TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'NL',
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  is_headquarters BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company branches"
  ON public.company_branches FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_company_cached(auth.uid()));

CREATE POLICY "Admins can insert branches"
  ON public.company_branches FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_company_cached(auth.uid()) AND public.has_role_cached(auth.uid(), 'admin'));

CREATE POLICY "Admins can update branches"
  ON public.company_branches FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_company_cached(auth.uid()) AND public.has_role_cached(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete branches"
  ON public.company_branches FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_company_cached(auth.uid()) AND public.has_role_cached(auth.uid(), 'admin'));


-- 1. user_companies (must be first — referenced by all other RLS policies)
CREATE TABLE IF NOT EXISTS public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  role text DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_companies_own" ON public.user_companies FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- 2. user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read" ON public.user_roles FOR SELECT TO authenticated USING (true);

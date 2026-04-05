
-- Diesel Staffels tabel
CREATE TABLE public.diesel_staffels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Standaard Staffel',
  reference_price NUMERIC(6,4) NOT NULL DEFAULT 1.5000,
  current_market_price NUMERIC(6,4),
  step_size NUMERIC(6,4) NOT NULL DEFAULT 0.0500,
  step_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.50,
  max_surcharge_pct NUMERIC(5,2) DEFAULT 25.00,
  min_surcharge_pct NUMERIC(5,2) DEFAULT 0.00,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  price_history JSONB DEFAULT '[]'::jsonb,
  last_updated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diesel_staffels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant diesel staffels"
ON public.diesel_staffels FOR SELECT TO authenticated
USING (tenant_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own tenant diesel staffels"
ON public.diesel_staffels FOR ALL TO authenticated
USING (tenant_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

-- Quotes / Offertes tabel
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  quote_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept','verzonden','akkoord','verlopen','afgewezen','order')),
  title TEXT,
  description TEXT,
  pickup_address TEXT,
  pickup_city TEXT,
  delivery_address TEXT,
  delivery_city TEXT,
  distance_km NUMERIC(10,1),
  weight_kg NUMERIC(10,2),
  vehicle_type TEXT,
  price_excl_btw NUMERIC(10,2),
  btw_percentage NUMERIC(5,2) DEFAULT 21.00,
  total_incl_btw NUMERIC(10,2),
  valid_until DATE,
  accepted_at TIMESTAMPTZ,
  converted_trip_id UUID REFERENCES public.trips(id),
  converted_invoice_id UUID REFERENCES public.invoices(id),
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant quotes"
ON public.quotes FOR SELECT TO authenticated
USING (tenant_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own tenant quotes"
ON public.quotes FOR ALL TO authenticated
USING (tenant_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

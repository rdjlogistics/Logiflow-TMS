ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.companies(id);
ALTER TABLE public.email_send_log ADD COLUMN IF NOT EXISTS sent_by uuid;
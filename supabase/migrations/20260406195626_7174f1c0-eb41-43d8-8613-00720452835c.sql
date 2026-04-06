
-- 1. Add processing_status column to inbound_emails for idempotency
ALTER TABLE public.inbound_emails 
ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'unprocessed';

-- 2. Create email_order_intake table
CREATE TABLE public.email_order_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_email_id uuid REFERENCES public.inbound_emails(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'received',
  ai_confidence float,
  ai_extracted_data jsonb DEFAULT '{}'::jsonb,
  created_trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  assigned_driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  error_message text,
  auto_reply_sent boolean NOT NULL DEFAULT false,
  confirmed_by uuid,
  confirmed_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_email_order_intake_company ON public.email_order_intake(company_id);
CREATE INDEX idx_email_order_intake_status ON public.email_order_intake(status);
CREATE INDEX idx_email_order_intake_email ON public.email_order_intake(inbound_email_id);

-- 3. RLS
ALTER TABLE public.email_order_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant intake"
  ON public.email_order_intake FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update own tenant intake"
  ON public.email_order_intake FOR UPDATE TO authenticated
  USING (company_id IN (SELECT public.get_user_company_ids(auth.uid())))
  WITH CHECK (company_id IN (SELECT public.get_user_company_ids(auth.uid())));

-- 4. Trigger function to auto-process new inbound emails
CREATE OR REPLACE FUNCTION public.trigger_process_inbound_order()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Only process unprocessed emails
  IF NEW.processing_status = 'unprocessed' THEN
    -- Mark as processing to prevent duplicates
    NEW.processing_status := 'processing';
    
    PERFORM net.http_post(
      url := 'https://spycblsfcktsnepsdssv.supabase.co/functions/v1/process-inbound-order',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'inbound_email_id', NEW.id,
        'company_id', NEW.company_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_inbound_order
  BEFORE INSERT ON public.inbound_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_inbound_order();

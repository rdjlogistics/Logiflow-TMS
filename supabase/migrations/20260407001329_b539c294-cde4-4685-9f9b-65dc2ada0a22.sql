
CREATE OR REPLACE FUNCTION public.trigger_auto_dispatch_on_new_trip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.driver_id IS NULL AND NEW.company_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://spycblsfcktsnepsdssv.supabase.co/functions/v1/ai-dispatch-engine',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'action', 'auto_assign',
        'tripId', NEW.id,
        'tenantId', NEW.company_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_dispatch_new_trip
AFTER INSERT ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_dispatch_on_new_trip();
